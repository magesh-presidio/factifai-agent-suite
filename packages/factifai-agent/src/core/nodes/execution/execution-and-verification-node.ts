import { BrowserService, getCurrentUrl } from "@presidio-dev/playwright-core";
import {
  HumanMessage,
  MessageContentComplex,
  SystemMessage,
} from "@langchain/core/messages";
import chalk from "chalk";
import { GraphStateType } from "../../graph/graph";
import { logger } from "../../../common/utils/logger";
import { getModel } from "../../models/models";
import { ALL_TOOLS } from "../../../tools";
import { removeImageUrlsFromMessage } from "../../../common/utils/llm-utils";
import { convertElementsToXml } from "../../../common/utils/xml-formatter";

// Helper function to capture current browser state
const captureCurrentState = async (sessionId: string) => {
  const browserService = BrowserService.getInstance();
  try {
    const markedScreenshotResponse = await browserService.takeMarkedScreenshot(
      sessionId,
      {
        randomColors: false,
        maxElements: 100,
        removeAfter: true, // Clean up markers after taking the screenshot
      }
    );
    const screenshot = markedScreenshotResponse.image;

    // Save screenshot to session/screenshots directory with timestamp
    if (screenshot) {
      const fs = require("fs");
      const path = require("path");

      // Create directory path with sessionId/screenshots structure
      const sessionDir = path.join(process.cwd(), sessionId);
      const screenshotsDir = path.join(sessionDir, "screenshots");

      // Ensure screenshots directory exists
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      // Generate a timestamp for the filename
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\./g, "-");

      // Create filename with timestamp
      const filename = `screenshot-${timestamp}.jpeg`;

      // Write the screenshot to the screenshots directory
      const imagePath = path.join(screenshotsDir, filename);
      fs.writeFileSync(imagePath, Buffer.from(screenshot, "base64"));
      logger.appendToFile(
        chalk.cyan(`📷 Screenshot saved to ${imagePath} for debugging`)
      );
    }

    logger.info(chalk.cyan("📷 Screenshot captured"));

    const currentUrl = (await getCurrentUrl(sessionId)).url ?? null;

    // Marked elements on the page
    const markedElementsResult = markedScreenshotResponse?.elements;
    const visibleElements =
      markedElementsResult?.length > 0 ? markedElementsResult : null;

    logger.info(
      chalk.cyan(
        `🔍 Found ${
          visibleElements?.length || 0
        } visible marked elements on the page`
      )
    );
    logger.appendToFile(chalk.cyan(`🔍 Found ${JSON.stringify(visibleElements)}`));

    return { screenshot, url: currentUrl, visibleElements, error: null };
  } catch (error) {
    logger.error("Failed to capture browser state:", error);
    return { screenshot: null, url: null, visibleElements: null, error };
  }
};

// Helper function to build the system prompt
const buildSystemPrompt = (
  sessionId: string,
  lastAction: string | null,
  expectedOutcome: string | null,
  currentUrl: string | null,
  retryCount: number,
  retryAction: string | null,
  maxRetries: number,
  visibleElements: any[] | null
) => {
  let systemPromptContent = `You are a browser automation QA assistant that helps execute test instructions on web pages SEQUENTIALLY.
  You have access to tools for navigation, clicking elements, typing text and multiple scrolling tools for dealing with long pages.
  Use the marked screenshot and visible elements' coordinate data with label numbers to identify location of elements on the page and determine their coordinates. The screenshot shows interactive elements with colored bounding boxes and numbered labels that correspond directly to the "labelNumber" in the elements data.
  
  CURRENT PAGE URL: ${currentUrl || "Unknown"}

  CURRENT BROWSER RESOLUTION: 1280x720

  MUST FOLLOW THESE RULES:
  1. ALWAYS use only one tool at a time, never call simultaneous tools.
  2. AFTER using a tool like click you must wait for the tool response before doing another tool call.
  
  IMPORTANT GUIDELINES:
  1. ALWAYS use screenshots to identify where to click and be aware that whenever you do a click action a red rounded cursor will appear in the last clicked location/element.
  2. ALWAYS use clickByCoordinates instead of clickBySelector
  3. For typing and clearing on inputs, first click on the input field, then use the type tool.
  4. For chunk-based scrolling use scrollToNextChunk and scrollToPrevChunk
  5. Work step by step to complete the task
  6. ALWAYS include the sessionId parameter in EVERY tool call: "${sessionId}"
  
  MARKED VISIBLE ELEMENTS:
  The screenshot shows interactive elements with colored bounding boxes and numbered labels.
  Each element has a colored box around it with a corresponding numbered label (1, 2, 3, etc.).
  
  When deciding where to click:
  - First identify the element you need by its numbered label in the screenshot
  - Then use the exact coordinates from the matching label in the XML data provided with the screenshot
  - For example, if you want to click on element with label="5" in the screenshot, use the coordinates from the element with label="5"`;

  // Add retry information if we're currently retrying an action
  if (retryCount > 0 && retryAction === lastAction) {
    systemPromptContent += `
    
    RETRY INFORMATION:
    You are currently retrying the same action for the ${retryCount} time (maximum ${maxRetries} attempts).
    Previous action: "${lastAction}"
    This action has failed verification. Please try a slightly different approach.`;
  }

  // Add verification instructions if there was a previous action
  if (lastAction && expectedOutcome) {
    systemPromptContent += `
    
    ${retryCount > 0 ? "FIRST - " : ""}VERIFICATION STEP:
    Before planning your next action, you must verify if the previous action succeeded:
    
    Previous action: "${lastAction}"
    Expected outcome: "${expectedOutcome}"
    ${retryCount > 0 ? `Retry attempt: ${retryCount} of ${maxRetries}` : ""}
    
    1. First, examine the current state and determine if the expected outcome was achieved.
    2. Start your response with "VERIFICATION:" followed by either "SUCCESS" or "FAILURE" and a brief explanation.
    3. If you respond with "FAILURE", DO NOT USE ANY TOOLS and explain why the action failed.
    4. If you respond with "SUCCESS", continue with planning the next action as described below.
    5. ALWAYS check if any other verification has to be done as per test case before proceeding.
    6. Include intricate and visual details in your verification explanation.
    
    Example of verification failure:
    VERIFICATION: FAILURE - The login form was not submitted as expected after clicking the login button. The page still shows the login form and there's an error message titled "Invalid password" visible on the page indicating incorrect credentials.
    
    Example of verification success:
    VERIFICATION: SUCCESS - The login was successful. The page has redirected to the dashboard as expected after clicking on the green login button. I also verified that the header contains the expected logo.
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
  processedInstruction: string,
  lastAction: string | null,
  expectedOutcome: string | null,
  currentScreenshot: string,
  currentUrl: string | null,
  retryCount: number,
  maxRetries: number,
  visibleElements: any[] | null
) => {
  const humanMessageContent: any = [
    {
      type: "text",
      text: `Execute this test case: "${processedInstruction}"
             Current URL: ${currentUrl || "Unknown"}
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

  // Add the current screenshot with element coordinates
  humanMessageContent.push(
    {
      type: "text",
      text: "Screenshot of the current page:",
    },
    {
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${currentScreenshot}` },
    }
  );

  // Add the element coordinates after the screenshot
  if (visibleElements && visibleElements.length > 0) {
    humanMessageContent.push({
      type: "text",
      text: `Interactive elements in this screenshot (${
        visibleElements.length
      } elements found):
${convertElementsToXml(visibleElements)}`,
    });
  }

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

// Flag to check if shutting down to prevent operations during cleanup
let isShuttingDown = false;

// Register for shutdown events
process.on("SIGINT", () => {
  isShuttingDown = true;
});
process.on("SIGTERM", () => {
  isShuttingDown = true;
});

export const executeAndVerifyNode = async ({
  processedInstruction,
  sessionId,
  messages,
  lastAction,
  expectedOutcome,
  retryCount = 0,
  retryAction = "",
  maxRetries = 3,
  testStartTime,
}: GraphStateType) => {
  // Check if we're in the process of shutting down
  if (isShuttingDown) {
    console.log("Execution aborted due to shutdown in progress");
    return {
      isComplete: true,
      lastError: "Operation was canceled due to application shutdown",
    };
  }

  // Record the test start time on first execution (when not retrying and no previous action)
  if (!testStartTime && retryCount === 0 && !lastAction) {
    testStartTime = Date.now();
    const startTimeFormatted = new Date(testStartTime).toISOString();
    logger.info(
      chalk.cyan(`🕒 Test execution started at ${startTimeFormatted}`)
    );
    logger.appendToFile(`TEST_EXECUTION_START: ${testStartTime} (${startTimeFormatted}), sessionId=${sessionId}, instruction=${processedInstruction.substring(0, 100)}...`);
  }
  // Capture current browser state
  const captureResult = await captureCurrentState(sessionId);
  const currentScreenshot = captureResult.screenshot;
  const captureError = captureResult.error;
  const currentUrl = captureResult.url;
  const visibleElements = captureResult.visibleElements || null;

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
    currentUrl,
    retryCount,
    retryAction,
    maxRetries,
    visibleElements
  );

  // Create human message with screenshots
  const humanMessage = createHumanMessage(
    processedInstruction,
    lastAction,
    expectedOutcome,
    currentScreenshot,
    currentUrl,
    retryCount,
    maxRetries,
    visibleElements
  );

  // Log retry attempts
  if (retryCount > 0) {
    logger.appendToFile(
      chalk.yellow(
        `Retry attempt ${retryCount}/${maxRetries} for action: "${lastAction}"`
      )
    );
  }

  try {
    // Get model with tools
    const model = getModel(false);
    if (!model) {
      throw new Error("Failed to initialize model");
    }

    // Cast the model to any to bypass TypeScript errors
    const modelWithTools = (model as any).bindTools(ALL_TOOLS);

    // Execute with model - single invocation for both verification and action
    const response = await modelWithTools.invoke([
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
        logger.appendToFile(
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
              isComplete: true,
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

    // Record the test end time and calculate duration when execution is complete
    let testEndTime = null;
    let testDuration = null;

    if (shouldComplete && testStartTime) {
      testEndTime = Date.now();
      testDuration = testEndTime - testStartTime;
      const endTimeFormatted = new Date(testEndTime).toISOString();
      logger.appendToFile(`TEST_EXECUTION_COMPLETE: ${testEndTime} (${endTimeFormatted}), duration=${testDuration}ms, sessionId=${sessionId}`);
      logger.appendToFile(`TEST_EXECUTION_SUMMARY: lastAction="${lastAction}", nextAction="${nextAction}", isComplete=${shouldComplete}`);
    }

    return {
      // messages: [...messages, ...cleaned],
      // TODO: IMPLEMENT SUMMARISATION?
      messages: cleaned,
      isComplete: shouldComplete,
      lastAction: nextAction,
      expectedOutcome: nextExpectedOutcome,
      retryCount: 0, // Reset retry count for new action
      retryAction: "", // Clear retry action
      testStartTime,
      testEndTime,
      testDuration,
    };
  } catch (error) {
    console.error("Error executing instruction:", error);
    logger.appendToFile(`TEST_EXECUTION_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    logger.appendToFile(`TEST_EXECUTION_ERROR_STACK: ${error instanceof Error && error.stack ? error.stack : 'No stack trace'}`);
    logger.appendToFile(`TEST_EXECUTION_ERROR_CONTEXT: sessionId=${sessionId}, lastAction="${lastAction}", retryCount=${retryCount}`);
    return {
      lastError: `Error executing instruction: ${error}`,
    };
  }
};
