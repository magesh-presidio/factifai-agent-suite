import chalk from "chalk";
import { GraphStateType } from "../main";
import { logger } from "../utils/logger";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { bedrockModel } from "../models/models";

/**
 * This node uses LLM to analyze current execution state and update test steps status
 * It runs in parallel with the main execution flow
 */
export const trackAndUpdateStepsNode = async ({
  lastAction,
  expectedOutcome,
  currentStep,
  instruction,
  isComplete,
  lastError,
  retryCount = 0,
  retryAction = "",
  maxRetries = 3,
  testSteps = [],
  messages = [],
}: GraphStateType) => {
  // Create a timestamp for logging
  const timestamp = new Date().toISOString();

  if (!testSteps || testSteps.length === 0) {
    logger.warn("No test steps to track and update");
    return {};
  }

  try {
    // Extract recent messages for analysis (limit to last 10 for efficiency)
    const recentMessages = messages.slice(-10);

    // Extract tool usage information
    const toolCalls = recentMessages
      .filter((msg: any) => msg.tool_calls?.length > 0)
      .flatMap((msg: any) => msg.tool_calls || []);

    const toolResponses = recentMessages
      .filter(
        (msg: any) =>
          msg.name &&
          (msg.name.includes("navigate") ||
            msg.name.includes("click") ||
            msg.name.includes("type"))
      )
      .map((msg: any) => ({ tool: msg.name, content: msg.content }));

    // Check for verification results in the latest message
    const lastMessageContent =
      recentMessages.length > 0
        ? recentMessages[recentMessages.length - 1]?.content
        : "";
    const lastMessageText =
      typeof lastMessageContent === "string"
        ? lastMessageContent
        : Array.isArray(lastMessageContent)
        ? lastMessageContent
            .map((item) =>
              typeof item === "object" && item.type === "text" ? item.text : ""
            )
            .join("\n")
        : JSON.stringify(lastMessageContent);

    const verificationMatch = lastMessageText.match(
      /VERIFICATION:\s*(SUCCESS|FAILURE)\s*-\s*([\s\S]*?)(?=ACTION INFO:|$)/i
    );
    const verificationResult = verificationMatch
      ? verificationMatch[1].toUpperCase()
      : null;
    const verificationExplanation = verificationMatch
      ? verificationMatch[2].trim()
      : null;

    // Define system prompt for test progress analysis
    const systemPrompt = new SystemMessage(
      `You are a real-time test progress analyzer. Examine the current execution state and update the test steps accordingly.
       Be precise in determining which steps are in progress, completed, or failed.
       
       Here's how to decide test step statuses:
       1. "not_started" - Step hasn't been attempted yet
       2. "in_progress" - Step is currently being executed
       3. "passed" - Step was executed successfully (verified or completed without errors)
       4. "failed" - Step failed after retries or encountered an error
       
       Your goal is to provide an accurate real-time assessment of the test execution state.`
    );

    // Create a summary of the current execution state
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
          `Step ${step.id}: "${step.instruction}" (Currently: ${step.status}${
            step.notes ? ` - Notes: ${step.notes}` : ""
          })`
      )
      .join("\n");

    const userMessage = new HumanMessage(
      `Analyze the current state of test execution and update the test steps status.
       
       CURRENT EXECUTION STATE:
       - Current/Last Action: ${lastAction || "None"}
       - Expected Outcome: ${expectedOutcome || "None"}
       - Verification Result: ${
         verificationResult
           ? `${verificationResult} - ${verificationExplanation}`
           : "None"
       }
       - Retry Count: ${retryCount} / ${maxRetries}${
        retryCount > 0 ? ` for "${retryAction}"` : ""
      }
       - Is Complete: ${isComplete ? "Yes" : "No"}
       - Error: ${lastError || "None"}
       
       TEST STEPS:
       ${stepsDesc}
       
       RECENT ACTIONS:
       ${actionsSummary || "No recent actions"}
       
       Based on this information, update the status of each test step. Pay special attention to:
       1. If verification shows SUCCESS, mark the relevant step as passed
       2. If verification shows FAILURE and max retries are reached, mark as failed
       3. If there are errors, mark the current step as failed
       4. If a tool was just executed successfully without verification, the step is likely in_progress
       5. If one step is passed, the next one should typically be in_progress
       
       IMPORTANT: Your response MUST include ALL test steps with their updated status, even if the status hasn't changed.`
    );

    // Define the schema for step updates
    const outputSchema = z.object({
      updatedSteps: z.array(
        z.object({
          id: z.number().describe("Step ID"),
          status: z
            .enum(["not_started", "in_progress", "passed", "failed"])
            .describe("Updated status of this step"),
          notes: z
            .string()
            .optional()
            .describe("Notes explaining why this status was assigned"),
        })
      ),
    });

    // Use a model with fast inference for real-time updates
    const model = bedrockModel().withStructuredOutput(outputSchema);

    // Generate the step updates
    const analysisResult = await model.invoke([systemPrompt, userMessage]);

    // Add defensive checks to handle potential undefined/null responses
    if (!analysisResult || !analysisResult.updatedSteps) {
      throw new Error("Invalid response from LLM: missing updatedSteps");
    }

    // Validate that we have updates for all steps
    if (analysisResult.updatedSteps.length !== testSteps.length) {
      logger.warn(
        `LLM returned ${analysisResult.updatedSteps.length} steps but expected ${testSteps.length}`
      );

      // Ensure we have updates for all steps by using original status for missing steps
      const completeUpdates = testSteps.map((originalStep) => {
        const update = analysisResult.updatedSteps.find(
          (u) => u.id === originalStep.id
        );
        if (!update) {
          logger.warn(
            `Missing update for step ${originalStep.id}, keeping original status`
          );
          return {
            id: originalStep.id,
            status: originalStep.status,
            notes: originalStep.notes,
          };
        }
        return update;
      });

      // Replace the incomplete updates with our complete set
      analysisResult.updatedSteps = completeUpdates;
    }

    // Update test steps with the results
    const updatedTestSteps = testSteps.map((originalStep) => {
      // Add defensive check
      if (!analysisResult || !analysisResult.updatedSteps) {
        return originalStep; // Keep original if we have issues
      }

      const updatedInfo = analysisResult.updatedSteps.find(
        (updated) => updated && updated.id === originalStep.id
      );

      if (updatedInfo) {
        // Only update if there's a status change or new notes
        if (
          updatedInfo.status !== originalStep.status ||
          (updatedInfo.notes && updatedInfo.notes !== originalStep.notes)
        ) {
          logger.appendToFile(
            `Test step ${originalStep.id} status changed: ${originalStep.status} -> ${updatedInfo.status}`
          );

          return {
            ...originalStep,
            status: updatedInfo.status,
            notes: updatedInfo.notes || originalStep.notes,
          };
        }
      }
      return originalStep;
    });

    // ==========================================
    // Display tracking information
    // ==========================================

    // Find the current in-progress step
    const currentTestStep = updatedTestSteps.find(
      (step) => step.status === "in_progress"
    );
    const stepDisplay = currentTestStep
      ? `STEP ${currentTestStep.id}/${updatedTestSteps.length}`
      : `STEPS ${
          updatedTestSteps.filter((s) => s.status === "passed").length
        }/${updatedTestSteps.length}`;

    const actionInfo = chalk.bold.blue(`[${timestamp}] ${stepDisplay}`);

    // Print to console with a divider for visibility
    console.log("\n" + "=".repeat(80));
    console.log(actionInfo);

    // Display the current test case instruction and action
    if (currentTestStep) {
      console.log(chalk.yellow(`CURRENT STEP: ${currentTestStep.instruction}`));
    }
    console.log(chalk.green(`ACTION: ${lastAction || "No action yet"}`));
    console.log(
      chalk.yellow(`EXPECTED: ${expectedOutcome || "No expected outcome yet"}`)
    );

    // Add verification result if available
    if (verificationResult) {
      if (verificationResult === "SUCCESS") {
        console.log(
          chalk.green(
            `VERIFICATION: SUCCESS - ${
              verificationExplanation || "Step completed successfully"
            }`
          )
        );
      } else {
        console.log(
          chalk.red(
            `VERIFICATION: FAILURE - ${
              verificationExplanation || "Step failed"
            }`
          )
        );
      }
    }

    // Add retry information if applicable
    if (retryCount > 0) {
      console.log(
        chalk.cyan(
          `RETRY: Attempt ${retryCount}/${maxRetries} for action "${
            retryAction || lastAction
          }"`
        )
      );

      // Visual retry indicator
      const retryBar = Array(maxRetries)
        .fill("□")
        .map((char, index) => (index < retryCount ? "■" : char))
        .join(" ");
      console.log(chalk.cyan(`RETRY PROGRESS: [${retryBar}]`));
    }

    // Show test steps progress
    console.log("\nTEST PROGRESS:");

    // Count status totals
    const counts = {
      passed: updatedTestSteps.filter((s) => s.status === "passed").length,
      failed: updatedTestSteps.filter((s) => s.status === "failed").length,
      inProgress: updatedTestSteps.filter((s) => s.status === "in_progress")
        .length,
      notStarted: updatedTestSteps.filter((s) => s.status === "not_started")
        .length,
    };

    console.log(
      chalk.gray(
        `Progress: ${counts.passed} passed, ${counts.failed} failed, ${counts.inProgress} in progress, ${counts.notStarted} pending`
      )
    );

    // Progress bar
    const progressBar = updatedTestSteps
      .map((step) => {
        if (step.status === "passed") return chalk.green("■");
        if (step.status === "failed") return chalk.red("■");
        if (step.status === "in_progress") return chalk.blue("■");
        return chalk.gray("□");
      })
      .join("");

    console.log(progressBar);

    // Display test steps with status indicators
    updatedTestSteps.forEach((step) => {
      let statusIcon = "○"; // not started
      let statusColor = chalk.gray;

      if (step.status === "in_progress") {
        statusIcon = "◉"; // in progress
        statusColor = chalk.blue;
      } else if (step.status === "passed") {
        statusIcon = "✓"; // passed
        statusColor = chalk.green;
      } else if (step.status === "failed") {
        statusIcon = "✗"; // failed
        statusColor = chalk.red;
      }

      const isCurrentStep = step.status === "in_progress";
      const stepText = `${statusIcon} Step ${
        step.id
      }: ${step.instruction.substring(0, 60)}${
        step.instruction.length > 60 ? "..." : ""
      }`;

      // Highlight the current step
      console.log(
        isCurrentStep
          ? chalk.bold(statusColor(stepText))
          : statusColor(stepText)
      );

      // Show notes for the current/failed steps
      if ((isCurrentStep || step.status === "failed") && step.notes) {
        console.log(chalk.gray(`   └─ ${step.notes}`));
      }
    });

    console.log("=".repeat(80) + "\n");

    // Return the updated test steps
    return {
      testSteps: updatedTestSteps,
    };
  } catch (error) {
    // Improved error handling with more detailed error logging
    logger.error("Error updating test steps:", error);

    // Log full error details for debugging
    if (error instanceof Error) {
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
    } else {
      logger.error(`Unknown error type: ${typeof error}`);
      logger.error(`Error stringified: ${JSON.stringify(error)}`);
    }

    // In case of error, display basic tracking info without updating steps
    console.log("\n" + "=".repeat(80));
    console.log(chalk.bold.blue(`[${timestamp}] TRACKING (Error occurred)`));
    console.log(chalk.green(`ACTION: ${lastAction || "No action yet"}`));
    console.log(
      chalk.yellow(`EXPECTED: ${expectedOutcome || "No expected outcome yet"}`)
    );

    // More descriptive error message
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`ERROR: Failed to update test steps: ${errorMsg}`));
    console.log(
      chalk.gray(
        "Test steps will not be updated this cycle. Next tracking update will try again."
      )
    );
    console.log("=".repeat(80) + "\n");

    // Return original steps unchanged
    return {};
  }
};
