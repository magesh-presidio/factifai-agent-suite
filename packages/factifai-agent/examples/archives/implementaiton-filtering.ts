import {
  Annotation,
  StateGraph,
  START,
  END,
  messagesStateReducer,
} from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { ScreenshotTools } from "../../src/tools/ScreenshotTools";
import { NavigationTools } from "../../src/tools/NavigationTools";
import { InteractionTools } from "../../src/tools/InteractionTools";
import { openAiModel } from "../../src/llm/models";

// Get all tools from different tool classes
const TOOLS = [
  ...NavigationTools.getTools(),
  ...InteractionTools.getTools(),
  ...ScreenshotTools.getTools(),
];

// Configuration constants
const SUMMARIZE_EVERY = 5;
const KEEP_LAST_N = 3;
const MAX_RETRY_ATTEMPTS = 3;

type Message = any;

// State definition
const State = Annotation.Root({
  messages: Annotation<Message[]>({
    default: () => [],
    reducer: messagesStateReducer,
  }),
  sessionId: Annotation<string>({ reducer: (_, v) => v }),
  currentStep: Annotation<number>({ default: () => 0, reducer: (_, v) => v }),
  totalSteps: Annotation<number>({ default: () => 0, reducer: (_, v) => v }),
  completed: Annotation<boolean>({
    default: () => false,
    reducer: (_, v) => v,
  }),
  summary: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  retryCount: Annotation<number>({
    default: () => 0,
    reducer: (prev, curr) => (curr !== undefined ? curr : prev),
  }),
  lastError: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  lastScreenshot: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  actionHistory: Annotation<string[]>({
    default: () => [],
    reducer: (prev, curr) =>
      curr ? [...prev, ...(Array.isArray(curr) ? curr : [curr])] : prev,
  }),
  count: Annotation<number>({ default: () => 0, reducer: (prev) => prev + 1 }),
});

type S = (typeof State)["State"];

// Utility: simplify messages for summarization
const simplifyMessage = (msg: Message) => {
  const toolNames = TOOLS.map((t) => t.name);
  if (msg.tool_call_id || toolNames.includes(msg.name)) {
    return new HumanMessage(`Action performed: ${msg.name || "tool call"}`);
  }
  if (msg.tool_calls?.length) {
    return new HumanMessage("The assistant requested an action.");
  }
  if (typeof msg.content === "string") {
    return new HumanMessage(msg.content);
  }
  if (Array.isArray(msg.content)) {
    const text = msg.content
      .filter((i: any) => i.type === "text")
      .map((i: any) => i.text)
      .join("\n");
    return new HumanMessage(text || "Complex message without text");
  }
  return new HumanMessage("Message with unknown format");
};

// Node: Initialize workflow with task instructions
async function initNode({ messages, sessionId }: S) {
  if (!sessionId) {
    throw new Error("Browser session ID is required");
  }

  // Parse the task instructions to determine total steps
  // This is a placeholder - in a real implementation you would parse the task
  const instructions = (messages[0]?.content as string) || "";
  const steps = instructions.split("*").filter((step) => step.trim());

  console.log(`[BrowserAgent] Initialized with ${steps.length} steps`);

  return {
    totalSteps: steps.length - 1, // Subtract 1 for the heading line
    currentStep: 0,
  };
}

// Remove createScreenshotCleaner as it's no longer needed

// Node: summarization logic
async function summaryNode({ messages, summary, count, actionHistory }: S) {
  if (
    count % SUMMARIZE_EVERY === 0 &&
    count > 0 &&
    messages.length > KEEP_LAST_N
  ) {
    // First simplify messages for the LLM
    const sanitized = messages.map(simplifyMessage);

    try {
      const resp = await openAiModel().invoke([
        new SystemMessage(
          "Summarize the browser automation steps completed so far in 2-3 concise sentences."
        ),
        ...sanitized,
      ]);

      const summaryText = typeof resp.content === "string" ? resp.content : "";
      console.log(`[BrowserAgent] Summary generated: ${summaryText}`);

      // Keep only the most recent messages (KEEP_LAST_N)
      const pruned = messages.slice(-KEEP_LAST_N);
      console.log(
        `[BrowserAgent] 🔪 Pruned messages: before=${messages.length}, after=${pruned.length}`
      );

      return {
        summary: summaryText,
        messages: pruned,
        count: 0,
      };
    } catch (err) {
      console.error("[BrowserAgent] Error generating summary", err);
      return { count };
    }
  }

  return { count };
}

// Node: main LLM interaction
async function llmNode({
  messages,
  summary,
  sessionId,
  currentStep,
  totalSteps,
  lastError,
  actionHistory,
  lastScreenshot,
}: S) {
  const progress = totalSteps > 0 ? `${currentStep}/${totalSteps}` : "unknown";

  const sysParts = [
    "You are a browser automation assistant that helps users interact with web applications.",
    "You have access to tools for navigation, clicking elements, typing text, and taking screenshots.",
    "Your goal is to complete the requested actions step by step, handling any errors that occur.",
    `Current progress: ${progress} steps completed.`,

    // Strict coordination-based guidance
    "IMPORTANT: You must use ONLY clickByCoordinates for clicking elements, never clickBySelector.",
    "For the Sauce Demo website login:",
    "- Username field is located at coordinates approximately (640, 175)",
    "- Password field is located at coordinates approximately (640, 225)",
    "- Login button is located at coordinates approximately (640, 325)",

    "For optimal browser automation:",
    "1. FIRST navigate to the website",
    "2. Then proceed with clicking and typing actions using the coordinates provided",
    "3. Every tool action (navigate, click, type) automatically takes a screenshot, so explicit screenshot calls are usually not needed",
    "4. If clicking at a coordinate fails, try adjusting by ±5-10 pixels and try again",
    "5. Always use a single browser session - do not create new browser instances",
  ];

  if (summary) {
    sysParts.push(`Previous actions: ${summary}`);
  }

  if (lastError) {
    sysParts.push(
      `Last error: ${lastError}. Please try adjusting coordinates by ±5-10 pixels and try again.`
    );
  }

  if (lastScreenshot) {
    sysParts.push(
      `A screenshot is available. Use it to determine accurate click coordinates.`
    );
  }

  if (actionHistory.length > 0) {
    sysParts.push(`Recent actions: ${actionHistory.slice(-3).join("; ")}`);
  }

  const ctx = [new SystemMessage(sysParts.join("\n\n")), ...messages];

  // Add session ID to ensure tools have access to it
  const model = openAiModel().bindTools(TOOLS);
  const reply = await model.invoke(ctx);

  // Process the reply content for tool calls
  if (Array.isArray(reply.content)) {
    const validSet = new Set(TOOLS.map((t) => t.name));
    reply.content = reply.content.filter(
      (c: any) => c.type !== "tool_use" || validSet.has(c.tool_name)
    );
  }

  return { messages: [reply] };
}

// Track completed actions and update state
async function actionTrackingNode({
  messages,
  actionHistory,
  currentStep,
  lastError,
  retryCount,
}: S) {
  const lastMessage = messages[messages.length - 1];

  // Check if the message contains tool calls
  if (lastMessage?.tool_calls?.length) {
    // Extract details about the tool call for better tracking
    const toolCalls = lastMessage.tool_calls.map((tc: any) => {
      let details = "";
      try {
        const args = JSON.parse(tc.args);

        // Format based on tool type
        if (
          tc.name === "clickByCoordinates" &&
          args.x !== undefined &&
          args.y !== undefined
        ) {
          details = `coords: (${args.x}, ${args.y})`;
        } else if (tc.name === "type" && args.text) {
          details = `text: "${args.text.substring(0, 15)}${
            args.text.length > 15 ? "..." : ""
          }"`;
        } else if (tc.name === "navigate" && args.url) {
          details = `url: ${args.url}`;
        } else if (tc.name === "screenshot") {
          details = "taking screenshot";
        } else if (tc.name === "clickBySelector" && args.selector) {
          details = `selector: ${args.selector} (NOT RECOMMENDED)`;
        }

        return `${tc.name}(${details})`;
      } catch (e) {
        return tc.name;
      }
    });

    return {
      actionHistory: [...actionHistory, `Attempted: ${toolCalls.join(", ")}`],
    };
  }

  // Find the latest tool result message
  const lastToolMessage = [...messages].reverse().find((m) => m.tool_call_id);

  if (!lastToolMessage) {
    return {};
  }

  let toolResult;
  let lastScreenshot = null;

  try {
    // Parse the result but handle screenshot specially
    const originalContent = lastToolMessage.content;
    toolResult = JSON.parse(originalContent);

    // Extract screenshot if present
    if (toolResult.screenshot) {
      lastScreenshot = toolResult.screenshot;

      // Modify the message content in place to remove the screenshot data
      // This prevents the large screenshot data from being included in future context
      lastToolMessage.content = JSON.stringify({
        ...toolResult,
        screenshot: "[SCREENSHOT_DATA_REMOVED]",
      });
    }
  } catch (e) {
    console.error("[BrowserAgent] Error parsing tool result:", e);
    return { lastError: "Failed to parse tool result" };
  }

  if (toolResult?.success === false) {
    // Action failed
    const errorMessage = toolResult.error || "Unknown error occurred";
    console.log(`[BrowserAgent] ❌ Action failed: ${errorMessage}`);

    return {
      lastError: errorMessage,
      retryCount: retryCount + 1,
      actionHistory: [...actionHistory, `Failed: ${errorMessage}`],
    };
  } else if (toolResult?.success === true) {
    // Action succeeded
    console.log(
      `[BrowserAgent] ✅ Step ${currentStep + 1} completed successfully`
    );

    const updates: any = {
      currentStep: currentStep + 1,
      lastError: null,
      retryCount: 0,
      actionHistory: [
        ...actionHistory,
        `Success: Step ${currentStep + 1} completed${
          lastScreenshot ? " (screenshot captured)" : ""
        }`,
      ],
    };

    // Only update lastScreenshot if we have a new one
    if (lastScreenshot) {
      updates.lastScreenshot = lastScreenshot;
    }

    return updates;
  }

  return {};
}

// Node: handle screenshots and verification
async function screenshotNode({ sessionId, messages, lastScreenshot }: S) {
  // Since screenshots are automatically returned by all action tools,
  // we only need to handle explicit screenshot requests here

  // Check if the last message includes a screenshot request
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.tool_calls?.some((tc: any) => tc.name === "screenshot")) {
    // An explicit screenshot was requested, but we need to wait for the result
    // The result will be handled by actionTrackingNode
    return {};
  }

  return {};
}

// Check if the workflow is completed or should be terminated
function completionCheckNode({
  currentStep,
  totalSteps,
  retryCount,
  messages,
}: S) {
  if (currentStep >= totalSteps) {
    console.log(
      `[BrowserAgent] ✅ All steps completed (${currentStep}/${totalSteps})`
    );
    return { completed: true };
  }

  if (retryCount >= MAX_RETRY_ATTEMPTS) {
    console.log(
      `[BrowserAgent] ❌ Max retry attempts (${MAX_RETRY_ATTEMPTS}) reached for step ${
        currentStep + 1
      }`
    );
    return {
      completed: true,
      lastError: `Failed to complete step ${
        currentStep + 1
      } after ${MAX_RETRY_ATTEMPTS} attempts`,
    };
  }

  return { completed: false };
}

// Should continue or end the graph
function shouldContinueEdge(state: S) {
  // Check if we have a message with tool calls
  const lastMessage = state.messages[state.messages.length - 1];

  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    lastMessage.tool_calls?.length > 0
  ) {
    return "tools";
  }

  if (state.completed) {
    return "end";
  }

  return "continue";
}

// Build and export the graph
export const browserAutomationAgent = new StateGraph(State)
  .addNode("init", initNode)
  .addNode("summarize", summaryNode)
  .addNode("llm", llmNode)
  .addNode("tools", new ToolNode(TOOLS))
  .addNode("track_actions", actionTrackingNode)
  .addNode("handle_screenshots", screenshotNode)
  .addNode("check_completion", completionCheckNode)
  .addEdge(START, "init")
  .addEdge("init", "summarize")
  .addEdge("summarize", "llm")
  .addConditionalEdges("llm", shouldContinueEdge, {
    tools: "tools",
    continue: "summarize",
    end: END,
  })
  .addEdge("tools", "track_actions")
  .addEdge("track_actions", "handle_screenshots")
  .addEdge("handle_screenshots", "check_completion")
  .addEdge("check_completion", "summarize")
  .compile({ checkpointer: new MemorySaver() });

// Convenience function to create a new session
export const createBrowserSession = (sessionId: string) => {
  const execute = async (instructions: string) => {
    console.log(`[BrowserAgent] Starting new session with ID: ${sessionId}`);

    // Ensure we're using the same session throughout the workflow
    const state = await browserAutomationAgent.invoke(
      {
        messages: [new HumanMessage(instructions)],
        sessionId,
      },
      {
        configurable: { thread_id: sessionId },
        recursionLimit: 50, // Increased limit for longer automation sequences
      }
    );

    console.log(
      `[BrowserAgent] Session completed with status:`,
      state.completed ? "Completed" : "Incomplete",
      `(${state.currentStep}/${state.totalSteps} steps)`
    );

    if (state.lastError) {
      console.log(`[BrowserAgent] Last error: ${state.lastError}`);
    }

    return state;
  };

  // Return a single object with the execute method
  return { execute };
};

// Example usage
(async () => {
  // Use a consistent session ID to ensure a single browser instance
  const sessionId = "sauce-demo-session";
  const browserSession = createBrowserSession(sessionId);

  const instructions = `
    * Navigate to the Sauce Demo website at https://www.saucedemo.com
    * Click on the username input field
    * Type "standard_user" into the username field
    * Click on the password input field
    * Type "secret_sauce" into the password field
    * Click on the green "Login" button at the bottom of the form
    * Wait for the page to transition after successful login
    * Verify successful login by confirming redirection to the inventory page
    `;

  try {
    await browserSession.execute(instructions);
    console.log("[BrowserAgent] Automation sequence completed");
  } catch (error) {
    console.error("[BrowserAgent] Error during automation:", error);
  }
})();
