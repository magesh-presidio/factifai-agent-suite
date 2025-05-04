import boxen from "boxen";
import chalk from "chalk";
import figures from "figures";
import { TEST_STATUS } from "./schemas";
import { table } from "table";

/**
 * Display components for report visualization
 */
export const displayComponents = {
  /**
   * Display header for the report
   */
  displayReportHeader(): void {
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
  },

  /**
   * Display the summary report box
   */
  displaySummaryReport(report: any, updatedTestSteps: any[]): void {
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
            TEST_STATUS.PASSED
          )} tests passed\n` +
          `${chalk.red(figures.cross)} ${getStepCount(
            updatedTestSteps,
            TEST_STATUS.FAILED
          )} tests failed\n` +
          `${chalk.gray(figures.circle)} ${getStepCount(
            updatedTestSteps,
            TEST_STATUS.NOT_STARTED
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
  },

  /**
   * Display test results in a beautiful table
   */
  displayTestResultsTable(testSteps: any[]): void {
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
        case TEST_STATUS.PASSED:
          statusText = `${figures.tick} PASSED`;
          statusColor = chalk.green;
          break;
        case TEST_STATUS.FAILED:
          statusText = `${figures.cross} FAILED`;
          statusColor = chalk.red;
          break;
        case TEST_STATUS.IN_PROGRESS:
          statusText = `${figures.play} ACTIVE`;
          statusColor = chalk.blue;
          break;
        case TEST_STATUS.NOT_STARTED:
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
  },

  /**
   * Display an error box
   */
  displayErrorBox(
    lastError: string,
    errorAnalysis: string | null = null
  ): void {
    console.log(
      boxen(
        chalk.bold.red("Last Error:") +
          "\n\n" +
          chalk.red(lastError) +
          "\n\n" +
          (errorAnalysis
            ? chalk.bold.yellow("Error Analysis:") +
              "\n" +
              chalk.italic(errorAnalysis)
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
  },

  /**
   * Display recommendations box
   */
  displayRecommendations(recommendations: string[]): void {
    console.log(
      boxen(
        chalk.bold.blue("Recommendations:") +
          "\n\n" +
          recommendations
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
  },

  /**
   * Display critical issues box
   */
  displayCriticalIssues(criticalIssues: string[]): void {
    console.log(
      boxen(
        chalk.bold.red("Critical Issues:") +
          "\n\n" +
          criticalIssues
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
  },

  /**
   * Display report generation error box
   */
  displayReportGenerationError(error: any): void {
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
  },
};

/**
 * Calculate the pass rate from test steps
 */
function calculatePassRate(testSteps: any[]): number {
  if (!testSteps || testSteps.length === 0) return 0;

  const passedCount = testSteps.filter(
    (step) => step.status === TEST_STATUS.PASSED
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
