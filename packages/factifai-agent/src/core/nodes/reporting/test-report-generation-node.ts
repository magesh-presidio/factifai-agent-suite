import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import chalk from "chalk";
import boxen from "boxen";
import figures from "figures";
import { table } from "table";
import { enhancedLogger } from "../../../common/services/console-display-service";
import { GraphStateType } from "../../graph/graph";
import { BedrockModel } from "../../models/models";

// Report generator node - runs at the end to update test step statuses
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

  // Display a beautiful report header
  console.log("\n");
  console.log(
    boxen(
      chalk.bold.blue("TEST EXECUTION REPORT") +
        "\n\n" +
        chalk.dim("Analyzing test execution and generating detailed report"),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "blue",
        float: "left",
      }
    )
  );

  try {
    // Show a spinning loader while generating the report
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Analyzing test execution...`
    );

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

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating detailed test report...`
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
      passRate: z
        .number()
        .describe("Percentage of test steps that passed (0-100)"),
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

    // Get the model with structured output
    const model = BedrockModel().withStructuredOutput(outputSchema);

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

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Report generation completed successfully`
    );

    // Display the summary report in a beautiful box
    const passRate = report.passRate || calculatePassRate(updatedTestSteps);
    const passRateColor = getPassRateColor(passRate);

    console.log(
      boxen(
        chalk.bold(passRateColor(`Test Pass Rate: ${passRate}%`)) +
          "\n\n" +
          chalk.bold("Summary:") +
          "\n" +
          chalk.italic(report.summary) +
          "\n\n" +
          (report.executionTime
            ? chalk.bold.blue(`Execution Time: ${report.executionTime}`) +
              "\n\n"
            : "") +
          chalk.bold("Test Status:") +
          "\n" +
          `${chalk.green(figures.tick)} ${getStepCount(
            updatedTestSteps,
            "passed"
          )} tests passed\n` +
          `${chalk.red(figures.cross)} ${getStepCount(
            updatedTestSteps,
            "failed"
          )} tests failed\n` +
          `${chalk.gray(figures.circle)} ${getStepCount(
            updatedTestSteps,
            "not_started"
          )} tests not started`,
        {
          title: chalk.bold.blue("Test Results"),
          padding: 1,
          margin: { top: 1, bottom: 1 },
          borderStyle: "round",
          borderColor:
            passRateColor === chalk.green
              ? "green"
              : passRateColor === chalk.yellow
              ? "yellow"
              : "red",
          float: "left",
        }
      )
    );

    // Display test steps in a nice table
    displayTestResultsTable(updatedTestSteps);

    // Display last error if present
    if (lastError) {
      console.log(
        boxen(
          chalk.bold.red("Last Error:") +
            "\n\n" +
            chalk.red(lastError) +
            "\n\n" +
            (report.errorAnalysis
              ? chalk.bold.yellow("Error Analysis:") +
                "\n" +
                chalk.italic(report.errorAnalysis)
              : ""),
          {
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: "round",
            borderColor: "red",
            title: chalk.bold.red("Test Execution Error"),
          }
        )
      );
    }

    // Display recommendations if any
    if (report.recommendations && report.recommendations.length > 0) {
      console.log(
        boxen(
          chalk.bold.blue("Recommendations:") +
            "\n\n" +
            report.recommendations
              .map((rec) => `${chalk.cyan(figures.pointer)} ${rec}`)
              .join("\n"),
          {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: "round",
            borderColor: "blue",
          }
        )
      );
    }

    // Display critical issues if any
    if (report.criticalIssues && report.criticalIssues.length > 0) {
      console.log(
        boxen(
          chalk.bold.red("Critical Issues:") +
            "\n\n" +
            report.criticalIssues
              .map((issue) => `${chalk.red(figures.warning)} ${issue}`)
              .join("\n"),
          {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: "round",
            borderColor: "red",
          }
        )
      );
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
    console.log(
      boxen(
        chalk.bold.red("TEST REPORT GENERATION ERROR") +
          "\n\n" +
          chalk.red(error instanceof Error ? error.message : "Unknown error"),
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "red",
        }
      )
    );

    // If there was a lastError, display it separately
    if (lastError) {
      console.log(
        boxen(
          chalk.bold.red("Last Test Execution Error:") +
            "\n\n" +
            chalk.red(lastError),
          {
            padding: 1,
            margin: { top: 0, bottom: 1 },
            borderStyle: "round",
            borderColor: "red",
          }
        )
      );
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
 * Calculate the pass rate from test steps
 */
function calculatePassRate(testSteps: any[]): number {
  if (!testSteps || testSteps.length === 0) return 0;

  const passedCount = testSteps.filter(
    (step) => step.status === "passed"
  ).length;
  return Math.round((passedCount / testSteps.length) * 100);
}

/**
 * Get color function based on pass rate
 */
function getPassRateColor(passRate: number): any {
  if (passRate >= 90) return chalk.green;
  if (passRate >= 70) return chalk.yellow;
  return chalk.red;
}

/**
 * Get count of steps with specified status
 */
function getStepCount(testSteps: any[], status: string): number {
  return testSteps.filter((step) => step.status === status).length;
}

/**
 * Display test results in a beautiful table
 */
function displayTestResultsTable(testSteps: any[]): void {
  // Create a table configuration with custom borders
  const tableConfig = {
    border: {
      topBody: chalk.dim("─"),
      topJoin: chalk.dim("┬"),
      topLeft: chalk.dim("┌"),
      topRight: chalk.dim("┐"),
      bottomBody: chalk.dim("─"),
      bottomJoin: chalk.dim("┴"),
      bottomLeft: chalk.dim("└"),
      bottomRight: chalk.dim("┘"),
      bodyLeft: chalk.dim("│"),
      bodyRight: chalk.dim("│"),
      bodyJoin: chalk.dim("│"),
      joinBody: chalk.dim("─"),
      joinLeft: chalk.dim("├"),
      joinRight: chalk.dim("┤"),
      joinJoin: chalk.dim("┼"),
    },
    columns: {
      0: { width: 5, alignment: "center" },
      1: { width: 45 },
      2: { width: 10, alignment: "center" },
      3: { width: 25 },
    },
  };

  // Create table data
  const tableData = [
    [
      chalk.bold("#"),
      chalk.bold("Test Step"),
      chalk.bold("Status"),
      chalk.bold("Notes"),
    ],
  ];

  // Add steps to the table
  testSteps.forEach((step) => {
    let statusText;
    let statusColor;

    switch (step.status) {
      case "passed":
        statusText = `${figures.tick} PASSED`;
        statusColor = chalk.green;
        break;
      case "failed":
        statusText = `${figures.cross} FAILED`;
        statusColor = chalk.red;
        break;
      case "in_progress":
        statusText = `${figures.play} ACTIVE`;
        statusColor = chalk.blue;
        break;
      case "not_started":
      default:
        statusText = `${figures.circle} SKIPPED`;
        statusColor = chalk.gray;
        break;
    }

    tableData.push([
      step.id,
      step.instruction,
      statusColor(statusText),
      step.notes || chalk.dim("N/A"),
    ]);
  });

  // Print the table
  // @ts-ignore
  console.log(table(tableData, tableConfig));
}
