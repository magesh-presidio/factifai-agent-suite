import dotenv from "dotenv";
import { browserAutomationGraph } from "./main";

dotenv.config();

export const executeBrowserTask = async (
  instruction: string,
  sessionId: string
) => {
  console.log(`Starting execution of: "${instruction}"`);
  sessionId = sessionId || `browser-session-${Date.now()}`;
  console.log(`Session ID: ${sessionId}`);

  const runConfig = {
    recursionLimit: 100,
    configurable: { thread_id: sessionId },
  };

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
      },
      runConfig
    );

    console.log("== TEST EXECUTION COMPLETED ==");
    if (result.testSummary) {
      console.log("Test Summary:", result.testSummary);
    }

    if (result.testSteps?.length > 0) {
      console.log("Test Step Results:");
      result.testSteps.forEach((step) => {
        console.log(
          `  ${step.id}. ${step.instruction} - ${step.status}${
            step.notes ? ` (${step.notes})` : ""
          }`
        );
      });
    }

    if (result.lastError) {
      console.error("Execution failed:", result.lastError);
      return {
        success: false,
        error: result.lastError,
        testSteps: result.testSteps,
        testSummary: result.testSummary,
      };
    }

    console.log("Execution completed successfully!");
    return {
      success: true,
      testSteps: result.testSteps,
      testSummary: result.testSummary,
    };
  } catch (error) {
    console.error("Execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      testSteps: [],
      testSummary: null,
    };
  }
};

executeBrowserTask(
  "go to saucedemo.com and login using standard_user and secret_sauce and add two items to cart and proceed with dummy data to checkout overview screen and finally, complete the checkout.",
  `browser-session-${Date.now()}`
);

export * from "./main";
