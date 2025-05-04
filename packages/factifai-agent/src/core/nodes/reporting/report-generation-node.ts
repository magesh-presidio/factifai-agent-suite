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
 * Calculate pass rate from test steps
 */
function calculatePassRate(testSteps: any[]) {
  if (!testSteps || testSteps.length === 0) return 0;
  
  const passedSteps = testSteps.filter(step => step.status === TEST_STATUS.PASSED);
  return Math.round((passedSteps.length / testSteps.length) * 100);
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
      `You are a test results analyzer. Review the test execution data and generate insights.
      Focus on providing a meaningful summary, useful recommendations, and analysis of any issues.
      DO NOT reassess the status of test steps - the provided step statuses are final and accurate.`
    );

    // Create a summary of the test actions for the LLM
    const actionsSummary = createActionsSummary(toolCalls, toolResponses);

    // Create the test steps list
    const stepsDesc = createStepsDescription(testSteps);

    const userMessage = new HumanMessage(
      `Analyze this browser automation test session and provide insights.
         
         TEST STEPS WITH FINAL STATUS:
         ${stepsDesc}
         
         TEST ACTIONS PERFORMED:
         ${actionsSummary}
         
         ${lastError ? `TEST ERROR: ${lastError}` : ""}
         
         Generate a comprehensive summary of the test execution, recommendations for improvement, 
         and analysis of any issues encountered. The step statuses are already final and accurate - 
         focus on providing valuable insights rather than reassessing step statuses.`
    );

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating detailed test report...`
    );

    // Generate the report using the LLM
    const report = await generateTestReport(systemPrompt, userMessage);

    // Calculate pass rate if not provided by the LLM
    const passRate = report.passRate || calculatePassRate(testSteps);

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Report generation completed successfully`
    );

    // Display the summary report
    displayComponents.displaySummaryReport(report, testSteps);

    // Display test steps in a nice table
    displayComponents.displayTestResultsTable(testSteps);

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
      // Keep the original test steps - don't modify them
      testSummary: report.summary,
      passRate: passRate,
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
