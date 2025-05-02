import { BrowserService, getCurrentUrl } from "@factifai/playwright-core";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import chalk from "chalk";
import { GraphStateType } from "../../graph/graph";
import { logger } from "../../../common/utils/logger";
import { BedrockModel } from "../../models/models";
import { ALL_TOOLS } from "../../../tools";
import { removeImageUrlsFromMessage } from "../../../common/utils/llm-utils";

export const executeAndVerifyNode = async ({
  instruction,
  sessionId,
  messages,
  lastAction,
  expectedOutcome,
  lastScreenshot,
  retryCount = 0,
  retryAction = "",
  maxRetries = 3,
}: GraphStateType) => {
  // Take a new screenshot of current state
  const browserService = BrowserService.getInstance();
  let currentScreenshot;

  try {
    currentScreenshot = await browserService.takeScreenshot(sessionId);
    logger.info(chalk.cyan("📷 Screenshot captured successfully"));

    // Get current URL for additional context
    const currentUrl = (await getCurrentUrl(sessionId)).url;
    console.log(`Current URL: ${currentUrl}`);
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    return {
      isComplete: true,
      lastError: `Failed to capture screenshot: ${error}`,
    };
  }

  let systemPromptContent = `You are a browser automation QA assistant that helps execute test instrcutions on web pages.
  You have access to tools for navigation, clicking elements, typing text and multiple scrolling tools for dealing with long pages.
  Use the screenshot to identify elements on the page and determine their coordinates.
  
  IMPORTANT GUIDELINES:
  1. ALWAYS use screenshots to identify where to click
  2. ALWAYS use clickByCoordinates instead of clickBySelector
  3. For typing, first click on the input field, then use the type tool
  4. For chunk-based scrolling use scrollToNextChunk and scrollToPrevChunk
  5. For verification and observation step use waitBySecondsTool to wait and observe.
  6. Work step by step to complete the task
  7. ALWAYS include the sessionId parameter in EVERY tool call: "${sessionId}"`;

  // Add retry information if we're currently retrying an action
  if (retryCount > 0 && retryAction === lastAction) {
    systemPromptContent += `
    
    RETRY INFORMATION:
    You are currently retrying the same action for the ${retryCount} time (maximum ${maxRetries} attempts).
    Previous action: "${lastAction}"
    This action has failed verification. Please try a slightly different approach.`;
  }

  // Add verification instructions if there was a previous action
  if (lastAction && expectedOutcome && lastScreenshot) {
    systemPromptContent += `
    
    ${retryCount > 0 ? "FIRST - " : ""}VERIFICATION STEP:
    Before planning your next action, you must verify if the previous action succeeded:
    
    Previous action: "${lastAction}"
    Expected outcome: "${expectedOutcome}"
    ${retryCount > 0 ? `Retry attempt: ${retryCount} of ${maxRetries}` : ""}
    
    1. First, examine both screenshots and determine if the expected outcome was achieved.
    2. Start your response with "VERIFICATION:" followed by either "SUCCESS" or "FAILURE" and a brief explanation.
    3. If you respond with "FAILURE", DO NOT USE ANY TOOLS and explain why the action failed.
    4. If you respond with "SUCCESS", continue with planning the next action as described below.
    
    Example of verification failure:
    VERIFICATION: FAILURE - The login form was not submitted as expected. The page still shows the login form and there's an error message visible.
    
    Example of verification success:
    VERIFICATION: SUCCESS - The login was successful. The page has redirected to the dashboard as expected.
    `;
  }

  // Add action planning instructions
  systemPromptContent += `
  
  ${lastAction && expectedOutcome ? "SECOND - " : ""}ACTION PLANNING STEP:
  When planning your next action:
  
  1. Start with "ACTION INFO:" followed by a JSON object containing:
     {
       "action": "Brief description of what you are about to do",
       "expectedOutcome": "What should happen if this action succeeds"
     }
  2. Only after providing the action info should you use any tools
  
  Example:
  ACTION INFO: {"action":"Clicking the login button at coordinates (320, 450)","expectedOutcome":"Should submit the form and redirect to dashboard"}
  
  I'll use the clickByCoordinates tool to click the login button...
  [tool use follows]`;

  const systemPrompt = new SystemMessage(systemPromptContent);

  // Create human message content array
  const humanMessageContent: any = [
    {
      type: "text",
      text: `Execute this test case: "${instruction}"
             ${
               lastAction && expectedOutcome
                 ? "First verify if the previous action succeeded, then "
                 : ""
             }
             ${
               retryCount > 0
                 ? `This is retry attempt ${retryCount}/${maxRetries} for the action "${lastAction}". `
                 : ""
             }use the available tools to complete the task step by step.`,
    },
  ];

  // Add the previous screenshot for comparison if it exists
  if (lastScreenshot) {
    humanMessageContent.push(
      { type: "text", text: "Previous screenshot:" },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${lastScreenshot}` },
      }
    );
  }

  // Add the current screenshot
  humanMessageContent.push(
    {
      type: "text",
      text: `${
        lastScreenshot
          ? "Current screenshot:"
          : "Screenshot of the current page:"
      }`,
    },
    {
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${currentScreenshot}` },
    }
  );

  const humanMessage = new HumanMessage({ content: humanMessageContent });

  // Get model with tools
  const model = BedrockModel().bindTools(ALL_TOOLS);

  try {
    if (retryCount > 0) {
      logger.info(
        chalk.yellow(
          `Retry attempt ${retryCount}/${maxRetries} for action: "${lastAction}"`
        )
      );
    }

    // Execute with model - single invocation for both verification and action
    const response = await model.invoke([
      systemPrompt,
      ...messages,
      humanMessage,
    ]);

    if (typeof response.content !== "string") {
      response.content = response.content.filter((c) => c.type !== "tool_use");
    }

    const responseText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Check for verification failure first if there was a previous action
    if (lastAction && expectedOutcome) {
      // Extract verification result with a more compatible regex
      const verificationMatch = responseText.match(
        /VERIFICATION:\s*(SUCCESS|FAILURE)\s*-\s*([\s\S]*?)(?=ACTION INFO:|$)/i
      );

      if (verificationMatch) {
        const verificationResult = verificationMatch[1].trim().toUpperCase();
        const verificationExplanation = verificationMatch[2].trim();

        logger.info(
          chalk.gray(
            `Verification result: ${verificationResult} - ${verificationExplanation}`
          )
        );

        // If verification failed, check if we should retry or end execution
        if (verificationResult === "FAILURE") {
          // Check if we've reached the maximum retries
          if (retryCount >= maxRetries) {
            logger.error(
              chalk.red(
                `Maximum retries (${maxRetries}) reached for action: "${lastAction}"`
              )
            );
            return {
              messages: [
                ...messages,
                removeImageUrlsFromMessage(humanMessage),
                response,
              ],
              isComplete: true,
              lastError: `Verification failed after ${retryCount} retries: ${verificationExplanation}`,
              retryCount: 0, // Reset retry count
              retryAction: "",
            };
          }

          // If we haven't reached max retries, increment and try again
          logger.warn(
            chalk.yellow(
              `Verification failed. Retrying action: "${lastAction}" (${
                retryCount + 1
              }/${maxRetries})`
            )
          );
          return {
            messages: [
              ...messages,
              removeImageUrlsFromMessage(humanMessage),
              response,
            ],
            lastScreenshot: currentScreenshot,
            retryCount: retryCount + 1,
            retryAction: lastAction,
            isComplete: false,
          };
        } else {
          // If verification succeeded, reset retry counters
          if (retryCount > 0) {
            logger.info(
              chalk.green(
                `Action "${lastAction}" succeeded after ${retryCount} retries!`
              )
            );
          }
        }
      }
    }

    // Extract action info for next step using the previous working implementation
    let nextAction = "Browser action";
    let nextExpectedOutcome = "Page should update appropriately";

    try {
      // If response.content is an array and has text items
      if (Array.isArray(response.content)) {
        // Look through each text item for our marker
        for (const item of response.content) {
          if (item && item.type === "text" && typeof item.text === "string") {
            // Try to find the ACTION INFO section
            const match = item.text.match(/ACTION INFO:?\s*(\{[\s\S]*?\})/i);
            if (match && match[1]) {
              // Parse the JSON object
              const actionInfo = JSON.parse(match[1]);
              nextAction = actionInfo.action || nextAction;
              nextExpectedOutcome =
                actionInfo.expectedOutcome || nextExpectedOutcome;
              // logger.info(
              //   chalk.gray(`Found action info: ${JSON.stringify(actionInfo)}`)
              // );
              break;
            }
          }
        }
      } else if (typeof response.content === "string") {
        // Plain string response - look for our marker
        const match = response.content.match(/ACTION INFO:?\s*(\{[\s\S]*?\})/i);
        if (match && match[1]) {
          const actionInfo = JSON.parse(match[1]);
          nextAction = actionInfo.action || nextAction;
          nextExpectedOutcome =
            actionInfo.expectedOutcome || nextExpectedOutcome;
        }
      }
    } catch (error) {
      logger.warn("Error extracting action info:", error);
    }

    // Clean messages for storage
    const cleaned = [removeImageUrlsFromMessage(humanMessage), response];

    return {
      //   messages: [...messages, ...cleaned],
      // TODO: IMPLEMENT SUMMARISATION
      messages: cleaned,
      lastAction: nextAction,
      expectedOutcome: nextExpectedOutcome,
      lastScreenshot: currentScreenshot,
      isComplete: true, // TODO HANDLE
      retryCount: 0, // Reset retry count for new action
      retryAction: "", // Clear retry action
    };
  } catch (error) {
    console.error("Error executing instruction:", error);
    return {
      isComplete: true,
      lastError: `Error executing instruction: ${error}`,
    };
  }
};
