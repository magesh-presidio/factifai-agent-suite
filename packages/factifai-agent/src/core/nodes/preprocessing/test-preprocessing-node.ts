
import chalk from "chalk";
import boxen from "boxen";
import figures from "figures";
import { GraphStateType } from "../../graph/graph";
import { logger } from "../../../common/utils/logger";

export const preprocessTestInputNode = async ({
  instruction,
}: GraphStateType) => {
  if (!instruction) {
    logger.warn(
      `${chalk.yellow(
        figures.warning
      )} No instruction provided for preprocessing`
    );
    return {
      processedInstruction: "",
    };
  }

  try {
    // Start preprocessing with a spinner
    const preprocessingId = "preprocessing";
    logger.spinner("Preprocessing test input...", preprocessingId);

    // 1. Normalize line breaks (handle different OS formats)
    let processedText = instruction.replace(/\r\n/g, "\n");

    // Update spinner to show progress
    logger.updateSpinner(preprocessingId, "Cleaning formatting...");

    // 2. Handle formatted lists with asterisks, removing excess formatting
    processedText = processedText.replace(/\*\*\*Action:\*\*/gi, "Action:");
    processedText = processedText.replace(
      /\*\*\*Expected Result:\*\*/gi,
      "Expected Result:"
    );

    // 3. Clean up step numbering for consistency
    processedText = processedText.replace(
      /\*\*Step\s+(\d+):\*\*/gi,
      "Step $1:"
    );

    // Update spinner to show progress
    logger.updateSpinner(preprocessingId, "Normalizing text...");

    // 4. Remove other markdown formatting while preserving content
    processedText = processedText.replace(/\*\*/g, "");

    // 5. Normalize indentation
    const lines = processedText.split("\n");
    processedText = lines.map((line) => line.trim()).join("\n");

    // Update spinner for final step
    logger.updateSpinner(preprocessingId, "Structuring test steps...");

    // 6. Add clear step demarcation if needed
    // If steps aren't clearly separated, add separation
    if (!processedText.includes("Step 1:")) {
      // Try to detect and format steps that might not be properly labeled
      processedText = processedText.replace(/(\d+)\.\s+/g, "Step $1: ");
    }

    // Complete the spinner with success
    logger.spinnerSuccess(
      preprocessingId,
      "Preprocessing completed successfully"
    );

    return {
      processedInstruction: processedText,
    };
  } catch (error) {
    // If we have an active spinner, fail it
    if (logger.spinners["preprocessing"]) {
      logger.spinnerError("preprocessing", "Preprocessing failed");
    }

    // Show error in a red box
    console.log(
      boxen(
        chalk.bold.red("PREPROCESSING ERROR") +
          "\n\n" +
          chalk.red(error instanceof Error ? error.message : "Unknown error"),
        {
          padding: 1,
          borderStyle: "round",
          borderColor: "red",
        }
      )
    );

    logger.error(
      `${chalk.red(figures.cross)} Error preprocessing test input:`,
      error
    );

    return {
      processedInstruction: instruction, // Fall back to original
      preprocessingError:
        error instanceof Error ? error.message : "Unknown preprocessing error",
    };
  }
};
