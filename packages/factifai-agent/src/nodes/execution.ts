import { BrowserService } from "@factifai/playwright-core";
import { GraphStateType } from "../main";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { bedrockModel } from "../models/models";
import { ALL_TOOLS } from "../tools";
import { logger } from "../utils/logger";
import { removeImageUrlsFromMessage } from "../utils/llmUtils";
import chalk from "chalk";

export const executeInstructionNode = async ({
  instruction,
  sessionId,
  messages,
  validationStatus,
  validationFeedback,
}: GraphStateType) => {
  // Take a screenshot to see the current state
  const browserService = BrowserService.getInstance();
  let screenshot;

  try {
    screenshot = await browserService.takeScreenshot(sessionId);
    console.log("Screenshot captured successfully");
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    return {
      isComplete: true,
      lastError: `Failed to capture screenshot: ${error}`,
    };
  }

  // Create a system prompt that instructs the model to provide action info
  // in a specific format before using tools
  const systemPrompt = new SystemMessage(
    `You are a browser automation assistant that helps execute web tasks.
     You have access to tools for navigation, clicking elements, typing text and multiple scrolling tools for dealing with long pages.
     Use the screenshot to identify elements on the page and determine their coordinates.
     
     IMPORTANT GUIDELINES:
     1. ALWAYS use screenshots to identify where to click
     2. ALWAYS use clickByCoordinates instead of clickBySelector
     3. For typing, first click on the input field, then use the type tool
     4. For chunk-based scrolling use scrollToNextChunk and scrollToPrevChunk
     5. Work step by step to complete the task
     6. ALWAYS include the sessionId parameter in EVERY tool call: "${sessionId}"
     
     BEFORE USING ANY TOOL, YOU MUST FIRST:
     1. Start your response with "ACTION INFO:" followed by a JSON object containing:
        {
          "action": "Brief description of what you are about to do",
          "expectedOutcome": "What should happen if this action succeeds"
        }
     2. Only after providing the action info should you use any tools
     
     Example:
     ACTION INFO: {"action":"Clicking the login button at coordinates (320, 450)","expectedOutcome":"Should submit the form and redirect to dashboard"}
     
     I'll use the clickByCoordinates tool to click the login button...
     [tool use follows]`
  );

  let contextualPrompt = `Execute this task: "${instruction}"
  First, look at the screenshot to understand the current page state.
  Then use the available tools to complete the task step by step.`;

  // Add validation feedback to help with next steps
  if (
    validationStatus === "FAILED" ||
    validationStatus === "PARTIALLY_SUCCESSFUL"
  ) {
    contextualPrompt += `\nYour previous action had issues: ${validationFeedback}`;
    contextualPrompt += "\nPlease adjust your approach based on this feedback.";
  }

  const humanMessage = new HumanMessage({
    content: [
      {
        type: "text",
        text: contextualPrompt,
      },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${screenshot}` },
      },
    ],
  });

  // Get model with tools
  const model = bedrockModel().bindTools(ALL_TOOLS);

  try {
    logger.info("Executing action with messages count:", messages.length);

    // Execute with model - single invocation
    const response = await model.invoke([
      systemPrompt,
      ...messages,
      humanMessage,
    ]);

    if (typeof response.content !== "string") {
      response.content = response.content.filter((c) => c.type !== "tool_use");
    }

    // Extract action info from formatted response
    let lastAction = "Browser action";
    let expectedOutcome = "Page should update appropriately";

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
              lastAction = actionInfo.action || lastAction;
              expectedOutcome = actionInfo.expectedOutcome || expectedOutcome;
              logger.info(
                chalk.gray(`Found action info: ${JSON.stringify(actionInfo)}`)
              );
              break;
            }
          }
        }
      } else if (typeof response.content === "string") {
        // Plain string response - look for our marker
        const match = response.content.match(/ACTION INFO:?\s*(\{[\s\S]*?\})/i);
        if (match && match[1]) {
          const actionInfo = JSON.parse(match[1]);
          lastAction = actionInfo.action || lastAction;
          expectedOutcome = actionInfo.expectedOutcome || expectedOutcome;
        }
      }
    } catch (error) {
      logger.warn("Error extracting action info:", error);
    }

    // Clean messages for storage
    const cleaned = [removeImageUrlsFromMessage(humanMessage), response];

    return {
      messages: cleaned,
      lastAction,
      expectedOutcome,
      lastScreenshot: screenshot,
      isComplete: false,
    };
  } catch (error) {
    console.error("Error executing instruction:", error);
    return {
      isComplete: true,
      lastError: `Error executing instruction: ${error}`,
    };
  }
};
