import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getModel } from "../../../models/models";

export const reportOutputSchema = z.object({
  summary: z.string().describe("Overall test execution summary"),
  passRate: z.number().describe("Percentage of test steps that passed (0-100)"),
  executionTime: z
    .string()
    .nullable()
    .describe("Estimated test execution time; null if unavailable"),
  recommendations: z
    .array(z.string())
    .nullable()
    .describe("Recommendations for improving the test; null if unavailable"),
  criticalIssues: z
    .array(z.string())
    .nullable()
    .describe("Critical issues found during testing; null if none"),
  errorAnalysis: z
    .string()
    .nullable()
    .describe("Analysis of the last error, or null"),
});

export type ReportOutput = z.infer<typeof reportOutputSchema>;

/**
 * Generate a test report using an LLM model
 */
export async function generateTestReport(
  systemPrompt: SystemMessage,
  userMessage: HumanMessage
): Promise<ReportOutput> {
  // Get the model with structured output
  const model = getModel(false, 16000).withStructuredOutput(reportOutputSchema);

  // Generate the report
  return await model.invoke([systemPrompt, userMessage]);
}

/**
 * Create system and user messages for LLM analysis
 */
export function createAnalysisMessages(
  testSteps: any[],
  actionsSummary: string,
  lastError: string | null
): { systemPrompt: SystemMessage; userMessage: HumanMessage } {
  // Define system prompt for report generation
  const systemPrompt = new SystemMessage(
    `You are a test results analyzer. Review the test execution data and generate insights.
    Focus on providing a meaningful summary, useful recommendations, and analysis of any issues.
    DO NOT reassess the status of test steps - the provided step statuses are final and accurate.`
  );

  // Create the test steps list
  const stepsDesc = testSteps
    .map(
      (step) =>
        `Step ${step.id}: "${step.instruction}" (Currently: ${step.status})`
    )
    .join("\n");

  const userMessage = new HumanMessage(
    `Analyze this browser automation test session and provide insights.
       
       TEST STEPS WITH FINAL STATUS:
       ${stepsDesc}
       
       TEST ACTIONS PERFORMED:
       ${actionsSummary}
       
       ${lastError ? `TEST ERROR: ${lastError}` : ""}
       
       Generate a comprehensive summary of the test execution, recommendations for improvement, 
       and analysis of any issues encountered. The step statuses are already final and accurate - 
       focus on providing valuable insights rather than reassessing step statuses.`
  );

  return { systemPrompt, userMessage };
}
