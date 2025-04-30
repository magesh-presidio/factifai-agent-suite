import chalk from "chalk";
import { GraphStateType } from "../main";
import { logger } from "../utils/logger";

/**
 * This node tracks and logs changes to lastAction and expectedOutcome
 * It runs in parallel with the main execution flow
 */
export const trackActionsNode = async ({
  lastAction,
  expectedOutcome,
  instruction,
}: GraphStateType) => {
  // Create a formatted output with a timestamp
  const timestamp = new Date().toISOString();
  const actionInfo = chalk.bold.blue(`[${timestamp}] STEP ${1}`);

  // Format the action and expected outcome with different colors
  const actionText = chalk.green(`ACTION: ${lastAction || "No action yet"}`);
  const outcomeText = chalk.yellow(
    `EXPECTED: ${expectedOutcome || "No expected outcome yet"}`
  );

  // Print to console with a divider for visibility
  console.log("\n" + "=".repeat(80));
  console.log(`${actionInfo}`);
  console.log(`TASK: ${instruction}`);
  console.log(`${actionText}`);
  console.log(`${outcomeText}`);
  console.log("=".repeat(80) + "\n");

  // You could also log to a file or send to a monitoring service here
  logger.info(
    `Action Tracking: Action: "${lastAction}", Expected: "${expectedOutcome}"`
  );

  // This node doesn't modify state, it just observes and logs
  return {};
};
