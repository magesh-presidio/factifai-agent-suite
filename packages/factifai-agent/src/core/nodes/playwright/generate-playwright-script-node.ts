import chalk from 'chalk';
import figures from 'figures';
import boxen from 'boxen';
import { GraphStateType } from '../../graph/graph';
import { enhancedLogger } from '../../../common/services/console-display-service';
import { 
  generatePlaywrightCoordinateScript, 
  generatePlaywrightSelectorScript, 
  savePlaywrightScript,
  ScriptType
} from '../../../common/utils/llm-script-generator';
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

    // Show progress for coordinate-based script generation
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating coordinate-based Playwright script...`
    );

    // Generate the coordinate-based Playwright script
    const coordinateScript = await generatePlaywrightCoordinateScript(sessionId, actions);

    // Save the coordinate-based script to the session directory
    const coordinateScriptPath = savePlaywrightScript(sessionId, coordinateScript, ScriptType.COORDINATE);

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Coordinate-based Playwright script generated successfully`
    );

    // Show progress for selector-based script generation
    enhancedLogger.info(
      `${chalk.blue(figures.pointer)} Generating selector-based Playwright script...`
    );

    // Generate the selector-based Playwright script
    const selectorScript = await generatePlaywrightSelectorScript(sessionId, actions);

    // Save the selector-based script to the session directory
    const selectorScriptPath = savePlaywrightScript(sessionId, selectorScript, ScriptType.SELECTOR);

    enhancedLogger.success(
      `${chalk.green(figures.tick)} Selector-based Playwright script generated successfully`
    );

    const actionsFilePath = getActionsFilePath(sessionId);

    // Display the script paths in a box
    console.log(
      boxen(
        chalk.bold.green("Playwright Scripts Generated") +
          "\n\n" +
          chalk.white(`Coordinate Script: ${coordinateScriptPath}`) +
          "\n" +
          chalk.white(`Selector Script: ${selectorScriptPath}`) +
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
      playwrightCoordinateScriptPath: coordinateScriptPath,
      playwrightSelectorScriptPath: selectorScriptPath,
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
