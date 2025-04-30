import { GraphStateType } from "../main";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { bedrockModel } from "../models/models";
import { logger } from "../utils/logger";

export const parseTestNode = async ({ instruction }: GraphStateType) => {
  try {
    logger.info("Parsing test instructions...");

    // Create the prompt for test step extraction
    const systemPrompt = new SystemMessage(
      "You are a test parsing assistant. Extract clear, atomic test steps from the provided test case."
    );

    const userMessage = new HumanMessage(
      `Parse the following test case into discrete steps:
      
      TEST CASE:
      ${instruction}
      
      Extract each step as a separate, actionable item.`
    );

    // Define the schema for test steps
    const outputSchema = z.object({
      steps: z.array(
        z.object({
          id: z.number().describe("Sequential step number"),
          instruction: z.string().describe("Clear instruction for this step"),
          status: z
            .literal("not_started")
            .describe("Initial status is always not_started"),
          notes: z
            .string()
            .optional()
            .describe("Optional notes about this step"),
        })
      ),
    });

    // Get the model with structured output
    const model = bedrockModel().withStructuredOutput(outputSchema);

    // Generate the test steps
    const response = await model.invoke([systemPrompt, userMessage]);

    // Add defensive check for undefined response or steps
    if (!response) {
      throw new Error("LLM returned undefined response");
    }

    if (!response.steps) {
      throw new Error("LLM response missing steps array");
    }

    // Now safely map the steps - with a fallback for empty arrays
    const testSteps = (response.steps || []).map((step) => ({
      id: step.id,
      instruction: step.instruction,
      status: step.id === 1 ? "in_progress" : "not_started", // Mark first step as in_progress
      notes: step.notes || "",
    }));

    if (testSteps.length === 0) {
      logger.warn("No test steps were extracted from the instruction");
      // Create a fallback step if none were generated
      testSteps.push({
        id: 1,
        instruction: instruction,
        status: "in_progress",
        notes: "Automatically created as a single step",
      });
    }

    logger.info(`Parsed ${testSteps.length} test steps`);

    return {
      testSteps,
      currentStep: 1,
    };
  } catch (error) {
    logger.error("Error parsing test steps:", error);

    // Create a fallback single test step in case of error
    const fallbackStep = {
      id: 1,
      instruction: instruction,
      status: "in_progress" as const,
      notes: "Created as fallback due to parsing error",
    };

    return {
      testSteps: [fallbackStep],
      currentStep: 1,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
};
