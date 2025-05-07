import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import chalk from "chalk";
import figures from "figures";
import boxen from "boxen";
import * as fs from "fs";
import * as path from "path";
import { enhancedLogger } from "../../../common/services/console-display-service";
import { GraphStateType } from "../../graph/graph";
import { getModel } from "../../models/models";
import { TEST_STATUS } from "./schemas";
import { displayComponents } from "./display-components";
import { logger } from "../../../common/utils/logger";

export const reportOutputSchema = z.object({
  summary: z.string().describe("Overall test execution summary"),
  passRate: z.number().describe("Percentage of test steps that passed (0-100)"),
  executionTime: z
    .string()
    .nullable()
    .describe("Estimated test execution time; null if unavailable"),
  recommendations: z
    .array(z.string())
    .nullable()
    .describe("Recommendations for improving the test; null if unavailable"),
  criticalIssues: z
    .array(z.string())
    .nullable()
    .describe("Critical issues found during testing; null if none"),
  errorAnalysis: z
    .string()
    .nullable()
    .describe("Analysis of the last error, or null"),
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

  const passedSteps = testSteps.filter(
    (step) => step.status === TEST_STATUS.PASSED
  );
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
  const model = getModel(false, 32000).withStructuredOutput(reportOutputSchema);

  // Generate the report
  return await model.invoke([systemPrompt, userMessage]);
}

/**
 * Generate JUnit XML report from test steps
 */
function generateJUnitXmlReport(
  testSteps: any[],
  testSummary: string,
  executionTime: string | null,
  lastError: string | null,
  recommendations: string[] | null = null,
  criticalIssues: string[] | null = null
): string {
  // Count test statistics
  const totalTests = testSteps.length;
  const failures = testSteps.filter(
    (step) => step.status === TEST_STATUS.FAILED
  ).length;
  const skipped = testSteps.filter(
    (step) =>
      step.status === TEST_STATUS.NOT_STARTED ||
      step.status === TEST_STATUS.IN_PROGRESS
  ).length;

  // Parse execution time if available, default to 0
  let timeValue = "0";
  if (executionTime) {
    // Try to extract numeric value from time string (e.g. "5.2 seconds" -> "5.2")
    const timeMatch = executionTime.match(/(\d+(\.\d+)?)/);
    if (timeMatch && timeMatch[1]) {
      timeValue = timeMatch[1];
    }
  }

  // Start building XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += "<testsuites>\n";
  xml += `  <testsuite name="FactifAI Test Suite" tests="${totalTests}" failures="${failures}" errors="0" skipped="${skipped}" time="${timeValue}">\n`;

  // Calculate pass rate percentage
  const passRate =
    totalTests > 0
      ? Math.round(((totalTests - failures - skipped) / totalTests) * 100)
      : 0;

  // Add test summary and recommendations as properties
  xml += "    <properties>\n";
  xml += `      <property name="summary" value="${escapeXml(testSummary)}"/>\n`;
  xml += `      <property name="passRate" value="${passRate}%"/>\n`;

  // Add recommendations as properties
  if (recommendations && recommendations.length > 0) {
    recommendations.forEach((recommendation, index) => {
      xml += `      <property name="recommendation.${
        index + 1
      }" value="${escapeXml(recommendation)}"/>\n`;
    });
  }

  // Add critical issues as properties
  if (criticalIssues && criticalIssues.length > 0) {
    criticalIssues.forEach((issue, index) => {
      xml += `      <property name="criticalIssue.${
        index + 1
      }" value="${escapeXml(issue)}"/>\n`;
    });
  }

  xml += "    </properties>\n";

  // Add each test step as a test case
  testSteps.forEach((step) => {
    const testName = `Step ${step.id}: ${step.instruction}`;

    xml += `    <testcase classname="factifai.tests" name="${escapeXml(
      testName
    )}" time="0">\n`;

    // Add failure information if the test failed
    if (step.status === TEST_STATUS.FAILED) {
      const message = step.notes || "Test step failed";
      xml += `      <failure message="${escapeXml(
        message
      )}" type="AssertionError">${escapeXml(message)}</failure>\n`;
    }

    // Add skipped tag if the test was not started or is in progress
    if (
      step.status === TEST_STATUS.NOT_STARTED ||
      step.status === TEST_STATUS.IN_PROGRESS
    ) {
      xml += "      <skipped/>\n";
    }

    // Add notes for all test steps that have them (regardless of status)
    if (step.notes) {
      xml += "      <system-out>\n";
      xml += `        ${escapeXml(step.notes)}\n`;
      xml += "      </system-out>\n";
    }

    xml += "    </testcase>\n";
  });

  // Add system-out with any error information
  if (lastError) {
    xml += "    <system-out>\n";
    xml += `      ${escapeXml(lastError)}\n`;
    xml += "    </system-out>\n";
  }

  // Close the testsuite and testsuites tags
  xml += "  </testsuite>\n";
  xml += "</testsuites>";

  return xml;
}

/**
 * Escape special characters for XML
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Write JUnit XML report to file
 */
function writeJUnitXmlReport(xml: string): string {
  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "");
    const filename = `test-report-${timestamp}.xml`;
    const filePath = path.join(logsDir, filename);

    // Write the XML to file
    fs.writeFileSync(filePath, xml);

    return filePath;
  } catch (error) {
    logger.error(
      `Failed to write JUnit XML report: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
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

    // Generate JUnit XML report
    try {
      enhancedLogger.info(
        `${chalk.blue(figures.pointer)} Generating JUnit XML report...`
      );

      const junitXml = generateJUnitXmlReport(
        testSteps,
        report.summary,
        report.executionTime,
        lastError,
        report.recommendations,
        report.criticalIssues
      );

      const xmlFilePath = writeJUnitXmlReport(junitXml);

      enhancedLogger.success(
        `${chalk.green(figures.tick)} JUnit XML report saved to: ${xmlFilePath}`
      );

      // Display the XML report path in a box
      console.log(
        boxen(
          chalk.bold.green("JUnit XML Report Generated") +
            "\n\n" +
            chalk.white(`File: ${xmlFilePath}`),
          {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "green",
          }
        )
      );
    } catch (xmlError) {
      enhancedLogger.error(
        `${chalk.red(figures.cross)} Failed to generate JUnit XML report: ${
          xmlError instanceof Error ? xmlError.message : "Unknown error"
        }`
      );
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
