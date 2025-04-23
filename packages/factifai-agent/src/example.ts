import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NavigationTools } from "../src/tools/NavigationTools";
import { InteractionTools } from "../src/tools/InteractionTools";
import { BrowserService } from "@factifai/playwright-core";
import { bedrockModel } from "./llm/models";
import { z } from "zod"; // Add this import
import dotenv from "dotenv";
import { logger } from "./utils/logger";
dotenv.config();

// Configure logger for test automation context
logger.configure({
  logLevel: "debug",
  logPrefix: "TestAutomation",
  timestampFormat: "locale",
});

// Log application startup
logger.box("Browser Automation Agent Started", {
  borderColor: "green",
  padding: 1,
});

// Get all tools
const TOOLS = [...NavigationTools.getTools(), ...InteractionTools.getTools()];
logger.debug(`Loaded ${TOOLS.length} tools`, { toolNames: TOOLS.map(t => t.name) });

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
  const parseSpinner = logger.spinner("Parsing test steps from instruction", "parse-steps");

  if (!instruction) {
    logger.warn("No instruction provided for parsing");
    logger.spinnerError("parse-steps", "No instruction provided");
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

    logger.debug("Generating test steps from instruction", {
      instructionLength: instruction.length
    });

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
    logger.updateSpinner("parse-steps", "Awaiting LLM response for step parsing");
    const result = await model.invoke([systemPrompt, userMessage]);

    // Set the first step to in_progress if there are any steps
    const testSteps = result.steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "in_progress" };
      }
      return step;
    });

    logger.spinnerSuccess("parse-steps", `Parsed ${testSteps.length} test steps successfully`);

    // // Log the parsed steps in a table
    // const stepTable = [
    //   ["ID", "Instruction", "Status"]
    // ];
    // testSteps.forEach(step => {
    //   stepTable.push([step.id.toString(), step.instruction, step.status]);
    // });
    // logger.table(stepTable);

    return {
      testSteps,
      currentStepIndex: testSteps.length > 0 ? 0 : -1,
    };
  } catch (error) {
    logger.spinnerError("parse-steps", "Failed to parse test steps");
    logger.error("Error parsing test steps:", error);
    return {
      testSteps: [],
      currentStepIndex: -1,
      lastError: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Core execution node (kept intact with added logging)
const executeInstructionNode = async ({
  instruction,
  sessionId,
  messages,
  testSteps,
  currentStepIndex,
}: StateType) => {
  // Create step-specific information for logging
  const currentStep = currentStepIndex >= 0 && testSteps && testSteps[currentStepIndex] 
    ? testSteps[currentStepIndex] 
    : null;
  
  const stepInfo = currentStep 
    ? `Step ${currentStep.id}: ${currentStep.instruction}` 
    : instruction;
  
  const executionSpinner = logger.spinner(
    `Executing: ${stepInfo}`, 
    `execute-${currentStepIndex}`
  );

  // Take a screenshot to see the current state
  const browserService = BrowserService.getInstance();
  let screenshot;

  try {
    logger.updateSpinner(`execute-${currentStepIndex}`, "Capturing page screenshot");
    screenshot = await browserService.takeScreenshot(sessionId);
    logger.debug("Screenshot captured successfully");
  } catch (error) {
    logger.spinnerError(`execute-${currentStepIndex}`, "Failed to capture screenshot");
    logger.error("Failed to capture screenshot:", error);
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
    logger.updateSpinner(`execute-${currentStepIndex}`, "Requesting LLM action plan");
    //logger.debug("Sending messages to LLM", { messagesCount: messages.length });

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

    // Clean up the messages
    const cleaned = [humanMessage, response].map((m) => sanitize(m, /*N=*/ 1));

    // Check for tool calls in the response for better logging
    // const hasToolCalls = response.tool_calls && response.tool_calls.length > 0;
    // if (hasToolCalls) {
    //   const toolCount = response.tool_calls.length;
    //   const toolNames = response.tool_calls.map((tc: any) => tc.name).join(", ");
    //   logger.spinnerSuccess(
    //     `execute-${currentStepIndex}`, 
    //     `LLM requested ${toolCount} tool actions: ${toolNames}`
    //   );
    // } else {
    //   logger.spinnerSuccess(`execute-${currentStepIndex}`, "Execution planned successfully");
    // }

    return {
      messages: cleaned,
      isComplete: true,
    };
  } catch (error) {
    logger.spinnerError(`execute-${currentStepIndex}`, "Error executing instruction");
    logger.error("Error executing instruction:", error);
    return {
      isComplete: true,
      lastError: `Error executing instruction: ${error}`,
    };
  }
};

// Route decision (kept intact with logging)
const shouldContinueEdge = (state: StateType) => {
  // Check if we have a message with tool calls
  const lastMessage = state.messages[state.messages.length - 1];

  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    lastMessage.tool_calls?.length > 0
  ) {
    logger.debug("Detected tool calls in last message, routing to tools node");
    return "tools";
  }

  if (state.isComplete || state.lastError) {
    if (state.lastError) {
      logger.warn("Execution completed with error, routing to end", { error: state.lastError });
    } else {
      logger.debug("Execution completed successfully, routing to end");
    }
    return "end";
  }

  logger.debug("Continuing execution loop");
  return "continue";
};

// Modified usage function to return test steps
export const executeBrowserTask = async (
  instruction: string,
  sessionId: string
) => {
  logger.box(`Starting Execution`, {
    title: "Browser Automation Task",
    borderColor: "blue"
  });
  
  logger.info(`Task: "${instruction}"`);
  sessionId = sessionId || `browser-session-${Date.now()}`;
  logger.info(`Session ID: ${sessionId}`);

  // Create task timer
  const endTask = logger.task(`Execute browser automation task`);

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
      },
      { recursionLimit: 100 }
    );

    logger.success("== TEST EXECUTION COMPLETED ==");
    
    if (result.testSummary) {
      logger.box(result.testSummary, { 
        title: "Test Summary", 
        borderColor: "green",
        padding: 1
      });
    }

    if (result.testSteps?.length > 0) {
      // Create a formatted table of results
      const resultTable = [
        ["Step", "Instruction", "Status", "Notes"]
      ];
      
      result.testSteps.forEach((step) => {
        // Format the status with appropriate colors and symbols
        let statusDisplay = step.status;
        if (step.status === "passed") {
          //@ts-ignore
          statusDisplay = chalk.green(`${figures.tick} Passed`);
        } else if (step.status === "failed") {
           //@ts-ignore
          statusDisplay = chalk.red(`${figures.cross} Failed`);
        } else if (step.status === "in_progress") {
           //@ts-ignore
          statusDisplay = chalk.yellow(`${figures.warning} In Progress`);
        } else {
           //@ts-ignore
          statusDisplay = chalk.gray("Not Started");
        }
        
        resultTable.push([
          step.id.toString(), 
          step.instruction, 
          statusDisplay,
          step.notes || ""
        ]);
      });
      
      logger.table(resultTable);
    }

    if (result.lastError) {
      logger.error("Execution failed:", result.lastError);
      endTask(); // End the task timer
      return {
        success: false,
        error: result.lastError,
        testSteps: result.testSteps,
        testSummary: result.testSummary,
      };
    }

    logger.success("Execution completed successfully!");
    endTask(); // End the task timer
    return {
      success: true,
      testSteps: result.testSteps,
      testSummary: result.testSummary,
    };
  } catch (error) {
    logger.error("Execution error:", error);
    endTask(); // End the task timer even when there's an error
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      testSteps: [],
      testSummary: null,
    };
  }
};

// Report generator node with added logging
const generateReportNode = async ({
  testSteps,
  messages,
  lastError,
}: StateType) => {
  const reportSpinner = logger.spinner("Generating test execution report", "generate-report");

  if (!testSteps || testSteps.length === 0) {
    logger.spinnerError("generate-report", "No test steps to analyze for report");
    return {};
  }

  try {
    // Extract conversation context for analysis
    // We'll focus on tool usage and responses to determine what was completed
    const toolCalls = messages
      .filter((msg: any) => msg.tool_calls?.length > 0)
      .flatMap((msg: any) => msg.tool_calls || []);

    logger.debug(`Analyzing ${toolCalls.length} tool calls for report generation`);

    const toolResponses = messages
      .filter(
        (msg: any) =>
          msg.name &&
          (msg.name.includes("navigate") ||
            msg.name.includes("click") ||
            msg.name.includes("type"))
      )
      .map((msg: any) => ({ tool: msg.name, content: msg.content }));

    logger.debug(`Found ${toolResponses.length} tool responses to analyze`);

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
    logger.updateSpinner("generate-report", "Analyzing test results with LLM");
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

    // Count statuses for logging
    const statusCounts = updatedTestSteps.reduce((acc: Record<string, number>, step) => {
      acc[step.status] = (acc[step.status] || 0) + 1;
      return acc;
    }, {});
    
    logger.spinnerSuccess(
      "generate-report", 
      `Report generated: ${statusCounts.passed || 0} passed, ${statusCounts.failed || 0} failed`
    );

    return {
      testSteps: updatedTestSteps,
      testSummary: report.summary,
    };
  } catch (error) {
    logger.spinnerError("generate-report", "Error generating test report");
    logger.error("Error generating test report:", error);
    return {
      // Don't modify test steps if report generation fails
      testSummary: `Failed to generate test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};

// Make sure chalk and figures are imported at the top
import chalk from "chalk";
import figures from "figures";

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

// Only run this when executed directly (not when imported)
if (require.main === module) {
  executeBrowserTask(
    "go to saucedemo.com and login using standard_user and secret_sauce",
    `browser-session-${Date.now()}`
  );
}