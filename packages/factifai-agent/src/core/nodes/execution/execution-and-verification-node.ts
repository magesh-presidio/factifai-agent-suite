import { BrowserService, getCurrentUrl } from "@factifai/playwright-core";
import {
  HumanMessage,
  MessageContentComplex,
  SystemMessage,
} from "@langchain/core/messages";
import chalk from "chalk";
import { GraphStateType } from "../../graph/graph";
import { logger } from "../../../common/utils/logger";
import { BedrockModel } from "../../models/models";
import { ALL_TOOLS } from "../../../tools";
import { removeImageUrlsFromMessage } from "../../../common/utils/llm-utils";

// Helper function to capture current browser state
const captureCurrentState = async (sessionId: string) => {
  const browserService = BrowserService.getInstance();
  try {
    const screenshot = await browserService.takeScreenshot(sessionId);
    logger.info(chalk.cyan("📷 Screenshot captured successfully"));

    const currentUrl = (await getCurrentUrl(sessionId)).url ?? null;
    console.log(`Current URL: ${currentUrl}`);

    return { screenshot, url: currentUrl, error: null };
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    return { screenshot: null, url: null, error };
  }
};

// Helper function to build the system prompt
const buildSystemPrompt = (
  sessionId: string,
  lastAction: string | null,
  expectedOutcome: string | null,
  lastScreenshot: string | null,
  currentUrl: string | null,
  retryCount: number,
  retryAction: string | null,
  maxRetries: number
) => {
  let systemPromptContent = `You are a browser automation QA assistant that helps execute test instructions on web pages.
  You have access to tools for navigation, clicking elements, typing text and multiple scrolling tools for dealing with long pages.
  Use the screenshot to identify elements on the page and determine their coordinates.
  
  CURRENT PAGE URL: ${
    currentUrl || "Unknown"
  }
  
  IMPORTANT GUIDELINES:
  1. ALWAYS use screenshots to identify where to click
  2. ALWAYS use clickByCoordinates instead of clickBySelector
  3. For typing and clearing on inputs, first click on the input field, then use the type tool
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

  return new SystemMessage(systemPromptContent);
};

// Helper function to create a human message with screenshots
const createHumanMessage = (
  instruction: string,
  lastAction: string | null,
  expectedOutcome: string | null,
  lastScreenshot: string | null,
  currentScreenshot: string,
  currentUrl: string | null,
  retryCount: number,
  maxRetries: number
) => {
  const humanMessageContent: any = [
    {
      type: "text",
      text: `Execute this test case: "${instruction}"
             Current URL: ${
               currentUrl || "Unknown"
             }
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

  return new HumanMessage({ content: humanMessageContent });
};

// Helper function to extract verification result
const parseVerificationResult = (responseText: string) => {
  const verificationMatch = responseText.match(
    /VERIFICATION:\s*(SUCCESS|FAILURE)\s*-\s*([\s\S]*?)(?=ACTION INFO:|$)/i
  );

  if (!verificationMatch) return null;

  return {
    result: verificationMatch[1].trim().toUpperCase(),
    explanation: verificationMatch[2].trim(),
  };
};

// Helper function to extract action info
const extractActionInfo = (responseContent: any) => {
  let nextAction = "Browser action";
  let nextExpectedOutcome = "Page should update appropriately";

  try {
    // If response.content is an array and has text items
    if (Array.isArray(responseContent)) {
      // Look through each text item for our marker
      for (const item of responseContent) {
        if (item && item.type === "text" && typeof item.text === "string") {
          // Try to find the ACTION INFO section
          const match = item.text.match(/ACTION INFO:?\s*(\{[\s\S]*?\})/i);
          if (match && match[1]) {
            // Parse the JSON object
            const actionInfo = JSON.parse(match[1]);
            nextAction = actionInfo.action || nextAction;
            nextExpectedOutcome =
              actionInfo.expectedOutcome || nextExpectedOutcome;
            break;
          }
        }
      }
    } else if (typeof responseContent === "string") {
      // Plain string response - look for our marker
      const match = responseContent.match(/ACTION INFO:?\s*(\{[\s\S]*?\})/i);
      if (match && match[1]) {
        const actionInfo = JSON.parse(match[1]);
        nextAction = actionInfo.action || nextAction;
        nextExpectedOutcome = actionInfo.expectedOutcome || nextExpectedOutcome;
      }
    }
  } catch (error) {
    logger.warn("Error extracting action info:", error);
  }

  return { nextAction, nextExpectedOutcome };
};

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
  // Capture current browser state
  const {
    screenshot: currentScreenshot,
    error: captureError,
    url: currentUrl,
  } = await captureCurrentState(sessionId);

  if (captureError || !currentScreenshot) {
    return {
      lastError: `Failed to capture screenshot: ${captureError}`,
    };
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(
    sessionId,
    lastAction,
    expectedOutcome,
    lastScreenshot,
    currentUrl,
    retryCount,
    retryAction,
    maxRetries
  );

  // Create human message with screenshots
  const humanMessage = createHumanMessage(
    instruction,
    lastAction,
    expectedOutcome,
    lastScreenshot,
    currentScreenshot,
    currentUrl,
    retryCount,
    maxRetries
  );

  // Log retry attempts
  if (retryCount > 0) {
    logger.info(
      chalk.yellow(
        `Retry attempt ${retryCount}/${maxRetries} for action: "${lastAction}"`
      )
    );
  }

  try {
    // Get model with tools
    const model = BedrockModel().bindTools(ALL_TOOLS);

    // Execute with model - single invocation for both verification and action
    const response = await model.invoke([
      systemPrompt,
      ...messages,
      humanMessage,
    ]);

    // Filter out duplicate tool_use elements
    if (typeof response.content !== "string") {
      response.content = response.content.filter(
        (c: MessageContentComplex) => c.type !== "tool_use"
      );
    }

    // Convert response content to string for processing
    const responseText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    // Process verification if there was a previous action
    if (lastAction && expectedOutcome) {
      const verification = parseVerificationResult(responseText);

      if (verification) {
        logger.info(
          chalk.gray(
            `Verification result: ${verification.result} - ${verification.explanation}`
          )
        );

        // Handle verification failure
        if (verification.result === "FAILURE") {
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
              lastError: `Verification failed after ${retryCount} retries: ${verification.explanation}`,
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
          };
        } else if (retryCount > 0) {
          // Log success after retries
          logger.info(
            chalk.green(
              `Action "${lastAction}" succeeded after ${retryCount} retries!`
            )
          );
        }
      }
    }

    // Extract action info for next step
    const { nextAction, nextExpectedOutcome } = extractActionInfo(
      response.content
    );

    // Clean messages for storage
    const cleaned = [removeImageUrlsFromMessage(humanMessage), response];

    // Check if the last message contains tool calls
    const lastMessage: MessageContentComplex = cleaned[cleaned.length - 1];
    let shouldComplete = false;

    if (
      lastMessage &&
      "tool_calls" in lastMessage &&
      lastMessage.tool_calls?.length > 0
    ) {
      shouldComplete = false;
    } else {
      shouldComplete = true;
    }

    return {
      //   messages: [...messages, ...cleaned],
      // TODO: IMPLEMENT SUMMARISATION
      messages: cleaned,
      isComplete: shouldComplete,
      lastAction: nextAction,
      expectedOutcome: nextExpectedOutcome,
      lastScreenshot: currentScreenshot,
      retryCount: 0, // Reset retry count for new action
      retryAction: "", // Clear retry action
    };
  } catch (error) {
    console.error("Error executing instruction:", error);
    return {
      lastError: `Error executing instruction: ${error}`,
    };
  }
};
