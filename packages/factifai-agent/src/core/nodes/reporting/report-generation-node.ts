import chalk from "chalk";
import figures from "figures";
import boxen from "boxen";
import { enhancedLogger } from "../../../common/services/console-display-service";
import { GraphStateType } from "../../graph/graph";
import { displayComponents } from "./display-components";
import { logger } from "../../../common/utils/logger";
import { formatDuration } from "../../../common/utils/time-utils";
import {
  generateTestReport,
  createAnalysisMessages,
  type ReportOutput,
} from "./report-generators/llm-report-analyzer";
import {
  generateJUnitXmlReport,
  writeJUnitXmlReport,
} from "./report-generators/xml-report-generator";
import {
  generateHtmlReport,
  writeHtmlReport,
} from "./report-generators/html-report-generator";
import {
  extractTestExecutionHistory,
  createActionsSummary,
  calculatePassRate,
} from "./report-utils/data-extractors";

// Main node function
export const generateReportNode = async ({
  testSteps,
  messages,
  lastError,
  sessionId,
  testStartTime,
  testEndTime,
  testDuration,
  reportFormat,
}: GraphStateType) => {
  // Log test timing information if available
  if (testStartTime && testEndTime && testDuration) {
    logger.info(
      chalk.cyan(
        `🕒 Total test execution time: ${formatDuration(testDuration)}`
      )
    );
  } else {
    logger.warn("Complete test timing information not available");
  }

  // Generate a sessionId if not provided
  const testSessionId = sessionId || `session-${new Date().getTime()}`;
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

    // Create a summary of the test actions for the LLM
    const actionsSummary = createActionsSummary(toolCalls, toolResponses);

    // Create system and user messages for LLM analysis
    const { systemPrompt, userMessage } = createAnalysisMessages(
      testSteps,
      actionsSummary,
      lastError
    );

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating detailed test report...`
    );

    // Generate the report using the LLM
    const report: ReportOutput = await generateTestReport(
      systemPrompt,
      userMessage
    );

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

    // Generate reports based on format setting
    await generateReportFiles(
      reportFormat,
      testSteps,
      report,
      lastError,
      testSessionId,
      passRate,
      testDuration
    );

    return {
      // Keep the original test steps - don't modify them
      testSummary: report.summary,
      passRate: passRate,
      recommendations: report.recommendations,
      criticalIssues: report.criticalIssues,
      errorAnalysis: report.errorAnalysis,
      // Add execution time tracking
      testEndTime,
      testDuration,
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

/**
 * Generate report files based on the specified format
 */
async function generateReportFiles(
  reportFormat: string | undefined,
  testSteps: any[],
  report: ReportOutput,
  lastError: string | null,
  testSessionId: string,
  passRate: number,
  testDuration: number | null
): Promise<void> {
  try {
    // Generate JUnit XML report if format is "xml" or "both"
    if (reportFormat === "xml" || reportFormat === "both") {
      await generateXmlReport(testSteps, report, lastError, testSessionId);
    }

    // Generate HTML report if format is "html" or "both"
    if (reportFormat === "html" || reportFormat === "both") {
      await generateHtmlReportFile(
        testSteps,
        report,
        lastError,
        testSessionId,
        passRate,
        testDuration
      );
    }
  } catch (reportError) {
    enhancedLogger.error(
      `${chalk.red(figures.cross)} Failed to generate reports: ${
        reportError instanceof Error ? reportError.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate XML report file
 */
async function generateXmlReport(
  testSteps: any[],
  report: ReportOutput,
  lastError: string | null,
  testSessionId: string
): Promise<void> {
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

  const xmlFilePath = writeJUnitXmlReport(junitXml, testSessionId);

  enhancedLogger.success(
    `${chalk.green(figures.tick)} XML report saved to: ${xmlFilePath}`
  );

  // Display the XML report path in a box
  console.log(
    boxen(
      chalk.bold.green("XML Report Generated") +
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
}

/**
 * Generate HTML report file
 */
async function generateHtmlReportFile(
  testSteps: any[],
  report: ReportOutput,
  lastError: string | null,
  testSessionId: string,
  passRate: number,
  testDuration: number | null
): Promise<void> {
  enhancedLogger.info(
    `${chalk.blue(figures.pointer)} Generating HTML report...`
  );

  const htmlReport = generateHtmlReport(
    testSteps,
    report.summary,
    passRate,
    report.executionTime,
    lastError,
    report.recommendations,
    report.criticalIssues,
    testDuration
  );

  const htmlFilePath = writeHtmlReport(htmlReport, testSessionId);

  enhancedLogger.success(
    `${chalk.green(figures.tick)} HTML report saved to: ${htmlFilePath}`
  );

  // Display the HTML report path in a box
  console.log(
    boxen(
      chalk.bold.green("HTML Report Generated") +
        "\n\n" +
        chalk.white(`File: ${htmlFilePath}`),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "green",
      }
    )
  );
}
