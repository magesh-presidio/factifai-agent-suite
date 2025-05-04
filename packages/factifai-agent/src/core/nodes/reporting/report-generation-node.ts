import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import chalk from "chalk";
import figures from "figures";
import { enhancedLogger } from "../../../common/services/console-display-service";
import { GraphStateType } from "../../graph/graph";
import { BedrockModel } from "../../models/models";
import { TEST_STATUS } from "./schemas";
import { displayComponents } from "./display-components";

const reportOutputSchema = z.object({
  updatedSteps: z.array(
    z.object({
      id: z.number().describe("Step number"),
      status: z
        .enum([
          TEST_STATUS.NOT_STARTED,
          TEST_STATUS.IN_PROGRESS,
          TEST_STATUS.PASSED,
          TEST_STATUS.FAILED,
        ])
        .describe("Final status of this step"),
      notes: z
        .string()
        .optional()
        .describe("Optional notes explaining status determination"),
    })
  ),
  summary: z.string().describe("Overall test execution summary"),
  passRate: z.number().describe("Percentage of test steps that passed (0-100)"),
  executionTime: z
    .string()
    .optional()
    .describe("Estimated test execution time"),
  recommendations: z
    .array(z.string())
    .describe("Recommendations for improving the test"),
  criticalIssues: z
    .array(z.string())
    .optional()
    .describe("Critical issues found during testing"),
  errorAnalysis: z
    .string()
    .optional()
    .describe("Analysis of the last error if present"),
});

// Helper functions
/**
 * Extract test execution history from messages
 */
function extractTestExecutionHistory(messages: any[]) {
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

  return {
    toolCalls,
    toolResponses,
  };
}

/**
 * Create a summary of test actions for the LLM
 */
function createActionsSummary(toolCalls: any[], toolResponses: any[]) {
  return [
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
}

/**
 * Create a description of test steps
 */
function createStepsDescription(testSteps: any[]) {
  return testSteps
    .map(
      (step) =>
        `Step ${step.id}: "${step.instruction}" (Currently: ${step.status})`
    )
    .join("\n");
}

/**
 * Update test steps with the report results
 */
function updateTestStepsWithResults(originalSteps: any[], updatedInfo: any[]) {
  return originalSteps.map((originalStep) => {
    const updatedStep = updatedInfo.find(
      (updated) => updated.id === originalStep.id
    );

    if (updatedStep) {
      return {
        id: originalStep.id,
        instruction: originalStep.instruction,
        status: updatedStep.status,
        notes: updatedStep.notes,
      };
    }
    return originalStep;
  });
}

/**
 * Generate a test report using an LLM model
 */
async function generateTestReport(
  systemPrompt: SystemMessage,
  userMessage: HumanMessage
) {
  // Get the model with structured output
  const model = BedrockModel().withStructuredOutput(reportOutputSchema);

  // Generate the report
  return await model.invoke([systemPrompt, userMessage]);
}

// Main node function
export const generateReportNode = async ({
  testSteps,
  messages,
  lastError,
}: GraphStateType) => {
  const displayService = enhancedLogger.service;
  displayService.cleanup();

  if (!testSteps || testSteps.length === 0) {
    enhancedLogger.warn("No test steps to analyze for report");
    return {};
  }

  // Display the report header
  displayComponents.displayReportHeader();

  try {
    // Show a spinning loader while generating the report
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Analyzing test execution...`
    );

    // Extract conversation context for analysis
    const { toolCalls, toolResponses } = extractTestExecutionHistory(messages);

    // Show progress
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Processing ${
        toolCalls.length
      } tool calls and ${toolResponses.length} tool responses...`
    );

    // Define system prompt for report generation
    const systemPrompt = new SystemMessage(
      "You are a test results analyzer. Review the conversation history and update the status of each test step."
    );

    // Create a summary of the test actions for the LLM
    const actionsSummary = createActionsSummary(toolCalls, toolResponses);

    // Create the test steps list
    const stepsDesc = createStepsDescription(testSteps);

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

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating detailed test report...`
    );

    // Generate the report using the LLM
    const report = await generateTestReport(systemPrompt, userMessage);

    // Update test steps with the results
    const updatedTestSteps = updateTestStepsWithResults(
      testSteps,
      report.updatedSteps
    );

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Report generation completed successfully`
    );

    // Display the summary report
    displayComponents.displaySummaryReport(report, updatedTestSteps);

    // Display test steps in a nice table
    displayComponents.displayTestResultsTable(updatedTestSteps);

    // Display last error if present
    if (lastError) {
      displayComponents.displayErrorBox(lastError, report.errorAnalysis);
    }

    // Display recommendations if any
    if (report.recommendations && report.recommendations.length > 0) {
      displayComponents.displayRecommendations(report.recommendations);
    }

    // Display critical issues if any
    if (report.criticalIssues && report.criticalIssues.length > 0) {
      displayComponents.displayCriticalIssues(report.criticalIssues);
    }

    return {
      testSteps: updatedTestSteps,
      testSummary: report.summary,
      passRate: report.passRate,
      recommendations: report.recommendations,
      criticalIssues: report.criticalIssues,
      errorAnalysis: report.errorAnalysis,
    };
  } catch (error) {
    enhancedLogger.error(
      `Error generating test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    // Display error in a red box
    displayComponents.displayReportGenerationError(error);

    // If there was a lastError, display it separately
    if (lastError) {
      displayComponents.displayErrorBox(lastError);
    }

    return {
      // Don't modify test steps if report generation fails
      testSummary: `Failed to generate test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      lastError,
    };
  }
};
