import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { GraphStateType } from "../main";
import { z } from "zod";
import { bedrockModel } from "../models/models";
import { logger } from "../utils/logger";
import chalk from "chalk";
import boxen from "boxen";
import figures from "figures";
import { table } from "table";

export const parseTestStepsNode = async ({ instruction }: GraphStateType) => {
  if (!instruction) {
    logger.warn(
      chalk.yellow(`${figures.warning} No test instruction provided`)
    );
    return {
      testSteps: [],
      currentStepIndex: -1,
    };
  }

  try {
    // Start a spinner for quality analysis
    const qualitySpinnerId = "quality-analysis";
    logger.spinner("Analyzing test case quality...", qualitySpinnerId);

    // First, rate the test case quality
    const testCaseRating = await rateTestCase(instruction);

    // Display rating with appropriate color
    const ratingColor =
      testCaseRating.rating >= 8
        ? chalk.green
        : testCaseRating.rating >= 5
        ? chalk.blue
        : chalk.yellow;

    // Complete the spinner with success - keep it simple
    logger.spinnerSuccess(
      qualitySpinnerId,
      `Test case quality rating: ${ratingColor(`${testCaseRating.rating}/10`)}`
    );

    // Only show warning and suggestions if quality is low
    if (testCaseRating.rating < 5) {
      const warningMessage = `WARNING: Low quality test case detected. Consider improving before execution.`;

      // Format the box content with both warning and suggestions
      const boxContent = `${chalk.yellow.bold(
        warningMessage
      )}\n\n${chalk.italic(testCaseRating.improvementSuggestions)}`;

      // Use the logger's box method to display everything in one container
      logger.box(boxContent, {
        title: chalk.yellow("Test Case Quality Warning"),
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "yellow",
        dimBorder: true,
      });
    }

    // Start a spinner for parsing test steps
    const parsingSpinnerId = "parsing-steps";
    logger.spinner("Parsing test steps...", parsingSpinnerId);

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
          // Add expected_result to each step
          expected_result: z
            .string()
            .optional()
            .describe("Expected outcome after completing this step"),
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

    // Complete the spinner with success - keep it simple
    logger.spinnerSuccess(
      parsingSpinnerId,
      `Successfully parsed ${chalk.bold(testSteps.length)} test steps`
    );

    // Display completion box - clean and minimal
    console.log(
      boxen(
        chalk.bold.green("PARSING COMPLETED") +
          "\n\n" +
          `${chalk.blue("Test Steps:")} ${chalk.bold(testSteps.length)}\n` +
          `${chalk.blue("Test Cases Quality:")} ${ratingColor(
            `${testCaseRating.rating}/10`
          )}`,
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "green",
          margin: { top: 1, bottom: 1 },
        }
      )
    );

    // Display steps in a neat table
    displayFormattedSteps(
      testSteps as Array<{
        id: number;
        instruction: string;
        status: "not_started" | "in_progress" | "passed" | "failed";
        expected_result?: string;
        notes?: string;
      }>
    );

    return {
      testSteps,
      currentStepIndex: testSteps.length > 0 ? 0 : -1,
      testCaseQuality: testCaseRating, // Add the test case quality rating to the state
    };
  } catch (error) {
    // If we have active spinners, fail them
    if (logger.spinners["quality-analysis"]) {
      logger.spinnerError("quality-analysis", "Quality analysis failed");
    }

    if (logger.spinners["parsing-steps"]) {
      logger.spinnerError("parsing-steps", "Parsing steps failed");
    }

    // Show error in a red box - clean and to the point
    console.log(
      boxen(
        chalk.bold.red("PARSING ERROR") +
          "\n\n" +
          chalk.red(error instanceof Error ? error.message : "Unknown error"),
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "red",
        }
      )
    );

    logger.error(`Error parsing test steps:`, error);

    return {
      testSteps: [],
      currentStepIndex: -1,
      lastError: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Display test steps in a nicely formatted table
 */
function displayFormattedSteps(
  testSteps: Array<{
    id: number;
    instruction: string;
    status: "not_started" | "in_progress" | "passed" | "failed";
    expected_result?: string;
    notes?: string;
  }>
) {
  if (!testSteps || testSteps.length === 0) {
    logger.warn("No test steps to display");
    return;
  }

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
      0: { width: 5, alignment: "center" as const },
      1: { width: 45 },
      2: { width: 25 },
      3: { width: 12, alignment: "center" as const },
    },
  };

  // Create table data
  const tableData = [
    [chalk.bold("#"), chalk.bold("Action"), chalk.bold("Expected Result")],
  ];

  // Add steps to the table
  testSteps.forEach((step, index) => {
    const status = getStatusDisplay(step.status);
    tableData.push([
      String(step.id),
      step.instruction,
      step.expected_result || chalk.dim("Not specified"),
    ]);
  });

  // Print the table
  console.log(table(tableData, tableConfig));
}

/**
 * Get a formatted status display
 */
function getStatusDisplay(
  status: "not_started" | "in_progress" | "passed" | "failed"
): string {
  switch (status) {
    case "passed":
      return chalk.green(`${figures.tick} PASSED`);
    case "failed":
      return chalk.red(`${figures.cross} FAILED`);
    case "in_progress":
      return chalk.blue(`${figures.play} ACTIVE`);
    case "not_started":
    default:
      return chalk.gray(`${figures.circle} PENDING`);
  }
}

/**
 * Rate the quality of a test case and provide improvement suggestions
 */
async function rateTestCase(testCase: string) {
  try {
    const systemPrompt = new SystemMessage(
      `You are a test quality analyst specialized in evaluating browser automation test cases. 
      Rate test cases based on these criteria:
      1. Clarity: Are the steps clear and unambiguous?
      2. Atomicity: Is each step focused on a single action?
      3. Verifiability: Are expected results clearly defined?
      4. Completeness: Does it cover the entire flow with proper validation?
      5. Error handling: Does it consider failure scenarios?
      6. Test data: Are specific inputs and test data clearly defined?
      7. Independence: Could the test run in isolation?`
    );

    const userMessage = new HumanMessage(
      `Evaluate the following test case and rate it on a scale of 1-10:
      
      "${testCase}"
      
      Provide a detailed analysis of strengths and weaknesses.`
    );

    // Define the rating schema
    const ratingSchema = z.object({
      rating: z
        .number()
        .min(1)
        .max(10)
        .describe("Overall quality rating from 1-10"),
      strengths: z.array(z.string()).describe("Key strengths of the test case"),
      weaknesses: z.array(z.string()).describe("Areas for improvement"),
      improvementSuggestions: z
        .string()
        .describe("Specific suggestions to improve the test case"),
      criteriaRatings: z.object({
        clarity: z.number().min(1).max(10).describe("Rating for clarity"),
        atomicity: z
          .number()
          .min(1)
          .max(10)
          .describe("Rating for step atomicity"),
        verifiability: z
          .number()
          .min(1)
          .max(10)
          .describe("Rating for clear expected results"),
        completeness: z
          .number()
          .min(1)
          .max(10)
          .describe("Rating for workflow coverage"),
        errorHandling: z
          .number()
          .min(1)
          .max(10)
          .describe("Rating for error scenario handling"),
        testData: z
          .number()
          .min(1)
          .max(10)
          .describe("Rating for specific test data definition"),
        independence: z
          .number()
          .min(1)
          .max(10)
          .describe("Rating for test independence"),
      }),
    });

    // Get the model with structured output
    const model = bedrockModel().withStructuredOutput(ratingSchema);

    // Execute the analysis
    const rating = await model.invoke([systemPrompt, userMessage]);

    return rating;
  } catch (error) {
    logger.error("Error rating test case:", error);
    return {
      rating: 5, // Default middle rating if analysis fails
      strengths: ["Unable to analyze strengths"],
      weaknesses: ["Unable to analyze weaknesses"],
      improvementSuggestions:
        "Error occurred during test case quality analysis",
      criteriaRatings: {
        clarity: 5,
        atomicity: 5,
        verifiability: 5,
        completeness: 5,
        errorHandling: 5,
        testData: 5,
        independence: 5,
      },
    };
  }
}
