import { BrowserService } from "@factifai/playwright-core";
import { GraphStateType } from "../main";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { bedrockModel } from "../models/models";
import { ALL_TOOLS } from "../tools";
import { logger } from "../utils/logger";
import {
  removeImageUrlsFromMessage,
} from "../utils/llmUtils";

export const executeInstructionNode = async ({
  instruction,
  sessionId,
  messages,
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

  const systemPrompt = new SystemMessage(
    `You are a browser automation assistant that helps execute web tasks.
       You have access to tools for navigation, clicking elements, typing text and multiple scrolling tools for dealing with long pages.
       Use the screenshot to identify elements on the page and determine their coordinates.
       
      IMPORTANT GUIDELINES:
      1. ALWAYS use screenshots to identify where to click
      2. ALWAYS use clickByCoordinates instead of clickBySelector
      3. For typing, first click on the input field, then use the type tool
      4. For chunk-based scrolling use scrollToNextChunk and scrollToPrevChunk. These functions provide a mechanism to scroll the page one chunk forward or backward, respectively.
      4. Work step by step to complete the task
      5. ALWAYS include the sessionId parameter in EVERY tool call: "${sessionId}"
      6. Provide clear reasoning for your actions`
  );

  const humanMessage = new HumanMessage({
    content: [
      {
        type: "text",
        text: `Execute this task: "${instruction}"
                 First, look at the screenshot to understand the current page state.
                 Then use the available tools to complete the task step by step.`,
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
    logger.info("messages ====>", messages.length);

    // Execute with model
    const response = await model.invoke([
      systemPrompt,
      ...messages,
      humanMessage,
    ]);

    if (typeof response.content !== "string") {
      response.content = response.content.filter((c) => c.type !== "tool_use");
    }

    // …then, after your LLM call:
    const cleaned = [removeImageUrlsFromMessage(humanMessage), response];

    logger.appendToFile(JSON.stringify(response));

    return {
      messages: cleaned,
      isComplete: true,
    };
  } catch (error) {
    console.error("Error executing instruction:", error);
    return {
      isComplete: true,
      lastError: `Error executing instruction: ${error}`,
    };
  }
};
