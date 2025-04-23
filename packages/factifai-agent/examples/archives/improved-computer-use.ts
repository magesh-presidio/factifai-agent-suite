import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NavigationTools } from "../../src/tools/NavigationTools";
import { InteractionTools } from "../../src/tools/InteractionTools";
import { BrowserService } from "@factifai/playwright-core";
import { z } from "zod"; // Add this import
import dotenv from "dotenv";
import { bedrockModel } from "../../src/llm/models";
import { logger } from "../../src/utils/logger";
dotenv.config();

// Get all tools
const TOOLS = [...NavigationTools.getTools(), ...InteractionTools.getTools()];

// Enhanced state definition with test steps
const State = Annotation.Root({
  instruction: Annotation<string>(),
  sessionId: Annotation<string>(),
  messages: Annotation<any[]>({
    default: () => [],
    reducer: (curr, a) => [...curr, ...a],
  }),
  // Add test step tracking fields
  testSteps: Annotation<
    Array<{
      id: number;
      instruction: string;
      status: "not_started" | "in_progress" | "passed" | "failed";
      notes?: string;
    }>
  >({
    default: () => [],
    reducer: (_, v) => v,
  }),
  currentStepIndex: Annotation<number>({
    default: () => -1,
    reducer: (_, v) => v,
  }),
  testSummary: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
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

// Test step parsing node
const parseTestStepsNode = async ({ instruction }: StateType) => {
  if (!instruction) {
    return {
      testSteps: [],
      currentStepIndex: -1,
    };
  }

  try {
    // Define system prompt to guide the parsing
    const systemPrompt = new SystemMessage(
      "You are a test automation specialist who converts natural language test descriptions " +
        "into clear, structured test steps."
    );

    const userMessage = new HumanMessage(
      `Parse the following test description into sequential, atomic test steps:\n\n${instruction}\n\n` +
        "Format each step as a clear instruction beginning with an action verb. Don't combine " +
        "multiple actions into a single step."
    );

    // Define the structured output schema
    const outputSchema = z.object({
      steps: z.array(
        z.object({
          id: z.number().describe("Step number starting from 1"),
          instruction: z
            .string()
            .describe("Clear instruction of what to do in this step"),
          status: z
            .enum(["not_started", "in_progress", "passed", "failed"])
            .default("not_started")
            .describe("Current status of this step"),
        })
      ),
    });

    // Get the model with structured output
    const model = bedrockModel().withStructuredOutput(outputSchema);

    // Execute the analysis
    const result = await model.invoke([systemPrompt, userMessage]);

    // Set the first step to in_progress if there are any steps
    const testSteps = result.steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "in_progress" };
      }
      return step;
    });

    console.log("Parsed test steps:", testSteps);

    return {
      testSteps,
      currentStepIndex: testSteps.length > 0 ? 0 : -1,
    };
  } catch (error) {
    console.error("Error parsing test steps:", error);
    return {
      testSteps: [],
      currentStepIndex: -1,
      lastError: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Core execution node (kept intact)
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

    const sanitize = (msg: any, N = 1) => {
      if (Array.isArray(msg.content)) {
        // separate text/other chunks…
        const textChunks = msg.content.filter(
          (c: any) => c.type !== "image_url"
        );
        // …and image_url chunks
        const imageChunks = msg.content
          .filter((c: any) => c.type === "image_url")
          .slice(-N); // ← only keep the last N
        msg.content = [...textChunks, ...imageChunks];
      }
      return msg;
    };

    // …then, after your LLM call:
    const cleaned = [humanMessage, response].map((m) => sanitize(m, /*N=*/ 1));

    return {
      messages: [humanMessage, response],
      isComplete: true,
    };

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

// Route decision (kept intact)
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

// Modified usage function to return test steps
export const executeBrowserTask = async (
  instruction: string,
  sessionId: string
) => {
  console.log(`Starting execution of: "${instruction}"`);
  sessionId = sessionId || `browser-session-${Date.now()}`;
  console.log(`Session ID: ${sessionId}`);

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
      },
      { recursionLimit: 100 }
    );

    console.log("== TEST EXECUTION COMPLETED ==");
    if (result.testSummary) {
      console.log("Test Summary:", result.testSummary);
    }

    if (result.testSteps?.length > 0) {
      console.log("Test Step Results:");
      result.testSteps.forEach((step) => {
        console.log(
          `  ${step.id}. ${step.instruction} - ${step.status}${
            step.notes ? ` (${step.notes})` : ""
          }`
        );
      });
    }

    if (result.lastError) {
      console.error("Execution failed:", result.lastError);
      return {
        success: false,
        error: result.lastError,
        testSteps: result.testSteps,
        testSummary: result.testSummary,
      };
    }

    console.log("Execution completed successfully!");
    return {
      success: true,
      testSteps: result.testSteps,
      testSummary: result.testSummary,
    };
  } catch (error) {
    console.error("Execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      testSteps: [],
      testSummary: null,
    };
  }
};

// Report generator node - runs at the end to update test step statuses
const generateReportNode = async ({
  testSteps,
  messages,
  lastError,
}: StateType) => {
  if (!testSteps || testSteps.length === 0) {
    console.log("No test steps to analyze for report");
    return {};
  }

  console.log("Generating test execution report...");

  try {
    // Extract conversation context for analysis
    // We'll focus on tool usage and responses to determine what was completed
    const toolCalls = messages
      .filter((msg: any) => msg.tool_calls?.length > 0)
      .flatMap((msg: any) => msg.tool_calls || []);

    const toolResponses = messages
      .filter(
        (msg: any) =>
          msg.name &&
          (msg.name.includes("navigate") ||
            msg.name.includes("click") ||
            msg.name.includes("type"))
      )
      .map((msg: any) => ({ tool: msg.name, content: msg.content }));

    // Define system prompt for report generation
    const systemPrompt = new SystemMessage(
      "You are a test results analyzer. Review the conversation history and update the status of each test step."
    );

    // Create a summary of the test actions for the LLM
    const actionsSummary = [
      ...toolCalls.map((tc: any) => {
        try {
          const args = JSON.parse(tc.args);
          return `Tool called: ${tc.name} with args: ${JSON.stringify(args)}`;
        } catch {
          return `Tool called: ${tc.name}`;
        }
      }),
      ...toolResponses.map(
        (tr: any) =>
          `Tool response: ${tr.tool} - ${tr.content.substring(0, 50)}...`
      ),
    ].join("\n");

    // Create the test steps list
    const stepsDesc = testSteps
      .map(
        (step) =>
          `Step ${step.id}: "${step.instruction}" (Currently: ${step.status})`
      )
      .join("\n");

    const userMessage = new HumanMessage(
      `Review the browser automation test session and determine which steps were completed successfully, 
       which failed, and which were never attempted.
       
       TEST STEPS:
       ${stepsDesc}
       
       TEST ACTIONS PERFORMED:
       ${actionsSummary}
       
       ${lastError ? `TEST ERROR: ${lastError}` : ""}
       
       Update the status of each test step based on the actions performed.`
    );

    // Define the output schema for test results
    const outputSchema = z.object({
      updatedSteps: z.array(
        z.object({
          id: z.number().describe("Step number"),
          status: z
            .enum(["not_started", "in_progress", "passed", "failed"])
            .describe("Final status of this step"),
          notes: z
            .string()
            .optional()
            .describe("Optional notes explaining status determination"),
        })
      ),
      summary: z.string().describe("Overall test execution summary"),
    });

    // Get the model with structured output
    const model = bedrockModel().withStructuredOutput(outputSchema);

    // Generate the report
    const report = await model.invoke([systemPrompt, userMessage]);

    // Update test steps with the results
    const updatedTestSteps = testSteps.map((originalStep) => {
      const updatedInfo = report.updatedSteps.find(
        (updated) => updated.id === originalStep.id
      );
      if (updatedInfo) {
        return {
          id: originalStep.id,
          instruction: originalStep.instruction,
          status: updatedInfo.status,
          notes: updatedInfo.notes, // Add notes if available
        };
      }
      return originalStep;
    });

    console.log("Test Execution Summary:", report.summary);
    console.log("Updated test steps:", updatedTestSteps);

    return {
      testSteps: updatedTestSteps,
      testSummary: report.summary,
    };
  } catch (error) {
    console.error("Error generating test report:", error);
    return {
      // Don't modify test steps if report generation fails
      testSummary: `Failed to generate test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

export const browserAutomationGraph = new StateGraph(State)
  .addNode("parse", parseTestStepsNode)
  .addNode("execute", executeInstructionNode)
  .addNode("tools", new ToolNode(TOOLS))
  .addNode("report", generateReportNode) // Add report generator node
  .addEdge(START, "parse")
  .addEdge("parse", "execute")
  .addConditionalEdges("execute", shouldContinueEdge, {
    tools: "tools",
    continue: "execute",
    end: "report", // Go to report instead of END
  })
  .addEdge("tools", "execute")
  .addEdge("report", END) // After report, end the graph
  .compile();

executeBrowserTask(
  "go to saucedemo.com and login using standard_user and secret_sauce",
  `browser-session-${Date.now()}`
);
