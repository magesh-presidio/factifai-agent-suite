import { GraphStateType } from "../../graph/graph";
import { logger } from "../../../common/utils/logger";

/**
 * Configuration for preprocessing limitations
 */
export const PREPROCESSING_CONFIG = {
  MAX_INPUT_LENGTH: 5000,
};

/**
 * Minimal preprocessing node that only handles serious formatting issues
 */
export const preprocessTestInputNode = async ({
  instruction,
}: GraphStateType) => {
  if (!instruction) {
    logger.warn("No instruction provided for preprocessing");
    return {
      processedInstruction: "",
    };
  }

  if (instruction.length > PREPROCESSING_CONFIG.MAX_INPUT_LENGTH) {
    logger.warn(
      `Input file test case is too long (exceeds ${PREPROCESSING_CONFIG.MAX_INPUT_LENGTH} characters)`
    );
    return {
      processedInstruction: "",
      preprocessingError: `Input file test case is too long (exceeds ${PREPROCESSING_CONFIG.MAX_INPUT_LENGTH} characters)`,
    };
  }

  try {
    // Only do the minimum necessary preprocessing
    let processedText = instruction;

    // Normalize line endings across platforms
    processedText = processedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Remove zero-width spaces and other invisible characters that might cause issues
    processedText = processedText.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // Handle character encoding issues (keep only ASCII and common Unicode)
    processedText = processedText.replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{S}]/gu, "");

    logger.info("Preprocessing completed");

    return {
      processedInstruction: processedText,
    };
  } catch (error) {
    logger.error("Error in minimal preprocessing:", error);
    return {
      processedInstruction: instruction, // Fall back to original
      preprocessingError:
        error instanceof Error ? error.message : "Unknown preprocessing error",
    };
  }
};
