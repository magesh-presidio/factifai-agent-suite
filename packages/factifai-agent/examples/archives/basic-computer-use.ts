import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NavigationTools } from "../../src/tools/NavigationTools";
import { InteractionTools } from "../../src/tools/InteractionTools";
import { BrowserService } from "@factifai/playwright-core";
import { navigate, getCurrentUrl } from "@factifai/playwright-core";

import dotenv from "dotenv";
import { bedrockModel } from "../../src/llm/models";
dotenv.config();

// Get all tools
const TOOLS = [...NavigationTools.getTools(), ...InteractionTools.getTools()];

// Define the state
const State = Annotation.Root({
  instruction: Annotation<string>(),
  sessionId: Annotation<string>(),
  messages: Annotation<any[]>({
    default: () => [],
    reducer: (curr, a) => [...curr, ...a],
  }),
  isComplete: Annotation<boolean>({
    default: () => false,
    reducer: (_, v) => v,
  }),
  lastError: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
});

type StateType = (typeof State)["State"];

// Core execution node
const executeInstructionNode = async ({
  instruction,
  sessionId,
  messages,
}: StateType) => {
  console.log(
    `Executing instruction: "${instruction}" with session: ${sessionId}`
  );

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

  // Create system prompt
  const systemPrompt = new SystemMessage(
    `You are a browser automation assistant that helps execute web tasks.
     You have access to tools for navigation, clicking elements, and typing text.
     Use the screenshot to identify elements on the page and determine their coordinates.
     
    IMPORTANT GUIDELINES:
    1. ALWAYS use screenshots to identify where to click
    2. ALWAYS use clickByCoordinates instead of clickBySelector
    3. For typing, first click on the input field, then use the type tool
    4. Work step by step to complete the task
    5. ALWAYS include the sessionId parameter in EVERY tool call: "${sessionId}"
    6. Provide clear reasoning for your actions`
  );

  // Create human message with screenshot
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
  const model = bedrockModel().bindTools(TOOLS);

  try {
    // Execute with model
    const response = await model.invoke([
      systemPrompt,
      ...messages,
      humanMessage,
    ]);

    if (typeof response.content !== "string") {
      response.content = response.content.filter((c) => c.type !== "tool_use");
    }

    // remove image_url chunks from the response to avoid storing them in the state
    const sanitize = (msg: any) => {
      // if it's structured content, filter out image_url chunks
      if (Array.isArray(msg.content)) {
        msg.content = msg.content.filter((c: any) => c.type !== "image_url");
      }
      return msg;
    };

    const toStore = [humanMessage, response].map(sanitize);

    return {
      messages: toStore,
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

// Route decision
const shouldContinueEdge = (state: StateType) => {
  // Check if we have a message with tool calls
  const lastMessage = state.messages[state.messages.length - 1];

  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    lastMessage.tool_calls?.length > 0
  ) {
    return "tools";
  }

  if (state.isComplete || state.lastError) {
    return "end";
  }

  return "continue";
};

// Build the graph
export const browserAutomationGraph = new StateGraph(State)
  .addNode("execute", executeInstructionNode)
  .addNode("tools", new ToolNode(TOOLS))
  .addEdge(START, "execute")
  .addConditionalEdges("execute", shouldContinueEdge, {
    tools: "tools",
    continue: "execute",
    end: END,
  })
  .addEdge("tools", "execute")
  .compile();

// Usage function
export const executeBrowserTask = async (
  instruction: string,
  sessionId: string
) => {
  console.log(`Starting execution of: "${instruction}"`);

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
      },
      { recursionLimit: 100 }
    );

    if (result.lastError) {
      console.error("Execution failed:", result.lastError);
      return { success: false, error: result.lastError };
    }

    console.log("Execution completed successfully!");
    return { success: true };
  } catch (error) {
    console.error("Execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

executeBrowserTask(
  "go to saucedemo.com and add two items to cart and proceed with dummy data to checkout overview screen and let me know",
  "browser-session-123"
);
