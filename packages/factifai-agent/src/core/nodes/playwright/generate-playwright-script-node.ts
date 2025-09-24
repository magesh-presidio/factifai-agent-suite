import chalk from 'chalk';
import { GraphStateType } from '../../graph/graph';
import { logger } from '../../../common/utils/logger';
import { generatePlaywrightScript, savePlaywrightScript } from '../../../common/utils/llm-script-generator';
import { getActionsFilePath, getSessionActions } from './playwright-utils/action-extractor';


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
    logger.info('Test did not complete successfully, skipping Playwright script generation');
    return {};
  }
  
  // Check if any test step failed
  const hasFailedSteps = testSteps.some(step => step.status === "failed");
  if (hasFailedSteps) {
    logger.info('Some test steps failed, skipping Playwright script generation');
    return {};
  }

  try {
    logger.info(chalk.cyan('🎭 Generating Playwright script from successful test execution...'));
    
    // Get the actions from the actions.json file
    const actions = getSessionActions(sessionId);
    
    if (actions.length === 0) {
      logger.warn('No actions recorded for this session, skipping Playwright script generation');
      return {};
    }
    
    // Get the path to the actions file for reference
    const actionsFilePath = getActionsFilePath(sessionId);
    logger.info(chalk.cyan(`📝 Using actions from ${actionsFilePath} (${actions.length} actions recorded)`));
    
    // Generate the Playwright script using the actions from the file
    const script = await generatePlaywrightScript(sessionId, actions);
    
    // Save the script to the session directory
    const scriptPath = savePlaywrightScript(sessionId, script);
    
    logger.success(chalk.green(`✅ Playwright script generated successfully and saved to: ${scriptPath}`));
    
    return {
      playwrightScriptPath: scriptPath,
      playwrightActionsPath: actionsFilePath,
    };
  } catch (error) {
    logger.error(`Error in generatePlaywrightScriptNode: ${error instanceof Error ? error.message : String(error)}`);
    return {
      lastError: `Failed to generate Playwright script: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
