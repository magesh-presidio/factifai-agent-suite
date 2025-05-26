import { TEST_STATUS } from "../schemas";

/**
 * Extract test execution history from messages
 */
export function extractTestExecutionHistory(messages: any[]) {
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

  return {
    toolCalls,
    toolResponses,
  };
}

/**
 * Create a summary of test actions for the LLM
 */
export function createActionsSummary(toolCalls: any[], toolResponses: any[]): string {
  return [
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
}

/**
 * Create a description of test steps
 */
export function createStepsDescription(testSteps: any[]): string {
  return testSteps
    .map(
      (step) =>
        `Step ${step.id}: "${step.instruction}" (Currently: ${step.status})`
    )
    .join("\n");
}

/**
 * Calculate pass rate from test steps
 */
export function calculatePassRate(testSteps: any[]): number {
  if (!testSteps || testSteps.length === 0) return 0;

  const passedSteps = testSteps.filter(
    (step) => step.status === TEST_STATUS.PASSED
  );
  return Math.round((passedSteps.length / testSteps.length) * 100);
}
