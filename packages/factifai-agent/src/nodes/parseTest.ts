import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { GraphStateType } from "../main";
import { z } from "zod";
import { bedrockModel } from "../models/models";

export const parseTestStepsNode = async ({ instruction }: GraphStateType) => {
    if (!instruction) {
      return {
        testSteps: [],
        currentStepIndex: -1,
      };
    }
  
    try {
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
        lastError: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };