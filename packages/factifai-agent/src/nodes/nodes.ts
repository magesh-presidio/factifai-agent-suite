import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { bedrockModel } from "../llm/models";
import { GraphStateType } from "../state/state";
import { z } from "zod";
import { logger } from "../utils/logger";

const currentModel = bedrockModel();

export const parseTestStepsNode = async ({ testCase }: GraphStateType) => {
  if (!testCase) {
    return {
      testSteps: [],
      currentStepIndex: -1,
    };
  }

  try {
    // Define system prompt to guide the parsing
    const systemPrompt = new SystemMessage(
      "You are a test automation specialist who converts natural language test descriptions " +
        "into clear, structured test steps. Extract each distinct action or verification into " +
        "a separate step."
    );

    const userMessage = new HumanMessage(
      `Parse the following test description into sequential, atomic test steps:\n\n${testCase}\n\n` +
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
          type: z
            .enum([
              "navigation",
              "click",
              "type",
              "verification",
              "wait",
              "other",
            ])
            .describe("The type of action this step represents"),
        })
      ),
    });

    // Get the model with structured output
    const model = currentModel.withStructuredOutput(outputSchema);

    // Execute the analysis
    const result = await model.invoke([systemPrompt, userMessage]);

    // Set the first step to in_progress if there are any steps
    const testSteps = result.steps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "in_progress" };
      }
      return step;
    });

    console.log("Parsed test steps:", testSteps);

    return {
      testSteps,
      currentStepIndex: testSteps.length > 0 ? 0 : -1,
    };
  } catch (error) {
    console.error("Error parsing test steps:", error);
    return {
      testSteps: [],
      currentStepIndex: -1,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Update testOrchestratorNode in nodes.ts
export const testOrchestratorNode = async (
  state: GraphStateType,
  config?: { configurable?: { thread_id?: string } }
) => {
  const { testSteps, currentStepIndex, sessionId } = state;

  // If no steps or invalid index, return current state
  if (
    testSteps.length === 0 ||
    currentStepIndex < 0 ||
    currentStepIndex >= testSteps.length
  ) {
    console.log("No steps to process or invalid step index");
    return {};
  }

  // Get the current step
  const currentStep = testSteps[currentStepIndex];
  console.log(
    `Processing step ${currentStepIndex + 1}: ${currentStep.instruction}`
  );

  try {
    // Use LLM to rephrase the test step
    const model = bedrockModel();

    // Get or initialize conversation history
    const conversationHistory = state.conversationHistory || [
      new SystemMessage(
        "You are a test automation specialist who rephrases test steps to be clearer and more actionable. " +
          "When a website URL is mentioned, remember it and include it at the end of all future rephrased steps."
      ),
    ];

    // Add the current step to the conversation
    conversationHistory.push(
      new HumanMessage(
        `Please rephrase the following test step to be clearer and more actionable and include the website URL at the end:\n\n` +
          `"${currentStep.instruction}"\n\n` +
          `Step type: ${currentStep.type}`
      )
    );

    // Send the complete conversation history to maintain context
    const response = await model.invoke(conversationHistory);

    // Add the LLM's response to the history
    conversationHistory.push(response);

    logger.info("History:", conversationHistory);

    const rephrasedInstruction = response.content.toString().trim();

    console.log(`Original: "${currentStep.instruction}"`);
    console.log(`Rephrased: "${rephrasedInstruction}"`);
    console.log(`Step ${currentStepIndex + 1} completed`);

    // Create a new array with the updated step
    const updatedSteps = [...testSteps];
    updatedSteps[currentStepIndex] = {
      ...currentStep,
      instruction: rephrasedInstruction, // Update with rephrased instruction
      status: "passed", // Mark as passed
    };

    // Determine the next step index
    const nextStepIndex = currentStepIndex + 1;

    // If there's a next step, mark it as in_progress
    if (nextStepIndex < testSteps.length) {
      updatedSteps[nextStepIndex] = {
        ...updatedSteps[nextStepIndex],
        status: "in_progress",
      };
    }

    return {
      testSteps: updatedSteps,
      currentStepIndex: nextStepIndex,
      conversationHistory, // Save the conversation history in the state
    };
  } catch (error) {
    console.error(`Error processing step ${currentStepIndex + 1}:`, error);

    // Mark the current step as failed
    const updatedSteps = [...testSteps];
    updatedSteps[currentStepIndex] = {
      ...currentStep,
      status: "failed",
    };

    return {
      testSteps: updatedSteps,
      currentStepIndex: currentStepIndex + 1,
    };
  }
};
