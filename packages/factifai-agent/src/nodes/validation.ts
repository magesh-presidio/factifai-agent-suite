import { BrowserService } from "@factifai/playwright-core";
import { GraphStateType } from "../main";
import { logger } from "../utils/logger";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { bedrockModel } from "../models/models";
import { z } from "zod";
import { removeImageUrlsFromMessage } from "../utils/llmUtils";

// Enhanced validation result schema with FATAL_FAILURE status
const ValidationResultSchema = z.object({
  status: z
    .enum([
      "SUCCESSFUL",
      "PARTIALLY_SUCCESSFUL",
      "FAILED",
      "FATAL_FAILURE", // New status for unrecoverable failures
      "ERROR",
    ])
    .describe("The overall result of the validation check"),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Confidence score between 0 and 1 that your assessment is correct"
    ),

  observations: z
    .array(z.string())
    .describe(
      "List of specific elements or changes observed in the screenshot that support your assessment"
    ),

  reasoning: z
    .string()
    .describe(
      "Explanation of why you determined this status based on the screenshot"
    ),

  feedback: z
    .string()
    .describe(
      "Actionable feedback that could help correct issues if the action failed"
    ),

  canSkip: z
    .boolean()
    .describe(
      "Whether this step can be skipped (true) or is critical to the workflow (false)"
    ),

  suggestedFix: z
    .object({
      approach: z.string().describe("Approach to fix the issue"),
      coordinates: z
        .array(z.number())
        .optional()
        .describe("New coordinates to try"),
      inputText: z.string().optional().describe("Alternative text to input"),
    })
    .optional()
    .describe(
      "Specific suggestions for fixing the issue if failed but recoverable"
    ),

  suggestedNextAction: z
    .string()
    .optional()
    .describe(
      "Recommended action to take next based on this validation result"
    ),
});

// Type inferred from the schema
type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const validateActionNode = async ({
  sessionId,
  lastAction,
  expectedOutcome,
  messages,
  taskCriticality, // New input that could come from the initial task description
}: GraphStateType) => {
  // Capture screenshot after action
  const browserService = BrowserService.getInstance();
  let screenshot;

  try {
    screenshot = await browserService.takeScreenshot(sessionId);
    logger.info("Validation screenshot captured successfully");
  } catch (error) {
    logger.error("Failed to capture validation screenshot:", error);
    return {
      validationStatus: "ERROR",
      validationError: `Failed to capture validation screenshot: ${error}`,
      validationFeedback: null,
    };
  }

  // Create system message with enhanced instructions for failure assessment
  const validationPrompt = new SystemMessage(
    `You are validating if a browser action was successful.
     Previous action: "${lastAction}"
     Expected outcome: "${expectedOutcome}"
     
     Analyze the screenshot to check if the action had the intended effect.
     You must return a structured assessment of what you see in JSON format.
     
     Be objective in your assessment. Only report what you 
     can directly observe in the screenshot.
     
     FAILURE ASSESSMENT GUIDELINES:
     - Use "SUCCESSFUL" when the action clearly succeeded as expected
     - Use "PARTIALLY_SUCCESSFUL" when there's partial progress but not complete success
     - Use "FAILED" when the action didn't achieve the expected outcome but can be retried or fixed
     - Use "FATAL_FAILURE" when:
       1. The failure is unrecoverable (e.g., permanent error message, blocked access)
       2. The failure indicates a fundamental issue that prevents workflow continuation
       3. The webpage has changed state in a way that makes the original task impossible
     - Use "ERROR" only for internal validation issues
     
     For "FAILED" status, you MUST provide specific suggestions in the "suggestedFix" field.
     For any failure, evaluate if this step can be skipped while still allowing the overall task to continue.
     
     EXCLUSIONS:
     - Always consider clicking on input elements as successful or partially successful as cursor will not be visible.
     - If particular element is not visible in screenshot but if there is a chance that it can be found by scrolling the page then consider it partially successful.
     `
  );

  // Create human message with screenshot for validation
  const validationMessage = new HumanMessage({
    content: [
      {
        type: "text",
        text: `Validate if the action "${lastAction}" was successful. 
               Expected outcome: "${expectedOutcome}".
               Look at the screenshot and provide your structured assessment.
               If the action failed, carefully assess whether this is a recoverable failure (FAILED)
               or an unrecoverable situation that blocks further progress (FATAL_FAILURE).`,
      },
      {
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${screenshot}` },
      },
    ],
  });

  // Get model with structured output using the schema
  const model = bedrockModel().withStructuredOutput(ValidationResultSchema);

  try {
    // Execute validation with structured output
    const validationResult: ValidationResult = await model.invoke([
      validationPrompt,
      validationMessage,
    ]);

    logger.info(
      `Validation result: ${
        validationResult.status
      } (${validationResult.confidence.toFixed(2)} confidence)`
    );

    // Add detailed logging for failures
    if (
      validationResult.status === "FAILED" ||
      validationResult.status === "FATAL_FAILURE"
    ) {
      logger.warn(`Failure detected: ${validationResult.status}`);
      logger.warn(`Reasoning: ${validationResult.reasoning}`);
      logger.warn(`Can skip: ${validationResult.canSkip ? "Yes" : "No"}`);
      if (validationResult.suggestedFix) {
        logger.warn(
          `Suggested fix: ${JSON.stringify(validationResult.suggestedFix)}`
        );
      }
    }

    return {
      validationStatus: validationResult.status,
      validationConfidence: validationResult.confidence,
      validationObservations: validationResult.observations,
      validationReasoning: validationResult.reasoning,
      validationFeedback: validationResult.feedback,
      canSkipStep: validationResult.canSkip,
      suggestedFix: validationResult.suggestedFix,
      suggestedNextAction: validationResult.suggestedNextAction,
      validationError: null,
      lastScreenshot: screenshot,
    };
  } catch (error) {
    logger.error("Error during validation:", error);
    return {
      validationStatus: "ERROR",
      validationError: `Error during validation: ${error}`,
      validationFeedback: null,
    };
  }
};
