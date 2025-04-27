import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { GraphStateType } from "../main";
import { z } from "zod";
import { bedrockModel } from "../models/models";

// Report generator node - runs at the end to update test step statuses
export const generateReportNode = async ({
  testSteps,
  messages,
  lastError,
}: GraphStateType) => {
  if (!testSteps || testSteps.length === 0) {
    console.log("No test steps to analyze for report");
    return {};
  }

  console.log("Generating test execution report...");

  try {
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
    });

    // Get the model with structured output
    const model = bedrockModel().withStructuredOutput(outputSchema);

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

    console.log("Test Execution Summary:", report.summary);
    console.log("Updated test steps:", updatedTestSteps);

    return {
      testSteps: updatedTestSteps,
      testSummary: report.summary,
    };
  } catch (error) {
    console.error("Error generating test report:", error);
    return {
      // Don't modify test steps if report generation fails
      testSummary: `Failed to generate test report: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
};
