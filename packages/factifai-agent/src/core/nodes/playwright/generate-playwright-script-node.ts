import chalk from 'chalk';
import figures from 'figures';
import boxen from 'boxen';
import { GraphStateType } from '../../graph/graph';
import { enhancedLogger } from '../../../common/services/console-display-service';
import { generatePlaywrightScript, savePlaywrightScript } from '../../../common/utils/llm-script-generator';
import { getActionsFilePath, getSessionActions } from './playwright-utils/action-extractor';

/**
 * Display header for Playwright script generation
 */
function displayPlaywrightHeader(): void {
  console.log("\n");
  console.log(
    boxen(
      chalk.bold.magenta("PLAYWRIGHT SCRIPT GENERATION") +
        "\n\n" +
        chalk.dim("Converting successful test execution to Playwright automation"),
      {
        padding: 1,
        margin: { top: 1, bottom: 1 },
        borderStyle: "round",
        borderColor: "magenta",
        float: "left",
      }
    )
  );
}


/**
 * Node that generates a Playwright script from successful test execution data
 */
export const generatePlaywrightScriptNode = async ({
  sessionId,
  isComplete,
  testEndTime,
  testDuration,
  testSteps,
}: GraphStateType) => {
  // Only generate script if test completed successfully
  if (!isComplete || !testEndTime || !testDuration) {
    enhancedLogger.warn('Test did not complete successfully, skipping Playwright script generation');
    return {};
  }

  // Check if any test step failed
  const hasFailedSteps = testSteps.some(step => step.status === "failed");
  if (hasFailedSteps) {
    enhancedLogger.warn('Some test steps failed, skipping Playwright script generation');
    return {};
  }

  try {
    // Display the script generation header
    displayPlaywrightHeader();

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Analyzing test execution for script generation...`
    );

    // Get the actions from the actions.json file
    const actions = getSessionActions(sessionId);

    if (actions.length === 0) {
      enhancedLogger.warn('No actions recorded for this session, skipping Playwright script generation');
      return {};
    }

    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Found ${actions.length} actions for script generation`
    );

    // Show progress for script generation
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating Playwright script...`
    );

    // Generate the Playwright script using the actions from the file
    const script = await generatePlaywrightScript(sessionId, actions);

    // Save the script to the session directory
    const scriptPath = savePlaywrightScript(sessionId, script);

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Playwright script generated successfully`
    );

    const actionsFilePath = getActionsFilePath(sessionId);

    // Display the script path in a box
    console.log(
      boxen(
        chalk.bold.green("Playwright Script Generated") +
          "\n\n" +
          chalk.white(`Script: ${scriptPath}`) +
          "\n" +
          chalk.white(`Actions: ${actionsFilePath}`) +
          "\n" +
          chalk.dim(`(${actions.length} actions converted)`),
        {
          padding: 1,
          margin: { top: 1, bottom: 1 },
          borderStyle: "round",
          borderColor: "green",
        }
      )
    );
    

    return {
      playwrightScriptPath: scriptPath,
      playwrightActionsPath: actionsFilePath,
    };
  } catch (error) {
    enhancedLogger.error(
      `${chalk.red(figures.cross)} Error generating Playwright script: ${error instanceof Error ? error.message : String(error)}`
    );
    return {
      lastError: `Failed to generate Playwright script: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
