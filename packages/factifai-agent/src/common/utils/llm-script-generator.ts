import * as fs from 'fs';
import * as path from 'path';
import { getModel } from '../../core/models/models';
import { getSessionSubdirPath } from './path-utils';
import { logger } from './logger';
import chalk from 'chalk';
import { PLAYWRIGHT_DIR_NAME, SCRIPTS_SUBDIR_NAME } from '../../core/nodes/playwright/playwright-utils/action-extractor';

/**
 * Generate a Playwright script from test execution data
 * @param sessionId The session ID
 * @param actions The recorded actions with timestamps
 * @returns Promise with the generated script
 */
export async function generatePlaywrightScript(
    _sessionId: string,
    actions: any[]
): Promise<string> {
    try {
        if (actions.length === 0) {
            throw new Error('No actions provided for script generation');
        }

        // Get the LLM model
        const model = getModel(false);
        if (!model) {
            throw new Error('Failed to initialize model');
        }

        // Create a system prompt for the LLM
        const systemPrompt = `
  You are an expert Playwright script generator specializing in creating robust, maintainable automation scripts from browser interaction data.
  
  Your task is to analyze the provided browser interaction data and generate a comprehensive Playwright script that accurately reproduces the test scenario. The script should be coordinate-based but also intelligent and optimized.
  
  ANALYSIS INSTRUCTIONS:
  1. Carefully analyze the sequence of actions, their timing, and relationships
  2. Identify patterns and logical groupings of actions (e.g., form filling, navigation flows)
  3. Look for opportunities to make the script more robust and maintainable
  
  SCRIPT REQUIREMENTS:
  1. The script must be pure coordinate-based for interactions (clicks, typing, etc.)
  2. Include appropriate waits between actions based on the timing data
  3. Add comprehensive error handling for reliability
  4. Include detailed comments explaining each action and its purpose
  5. Structure the code logically with proper organization
  
  The input data contains various tool calls with the following format:
  - tool: The name of the tool used (navigate, clickByCoordinates, type, etc.)
  - args: The arguments passed to the tool (coordinates, text, etc.)
  - timestamp: When the action was performed
  - description: A detailed description of what the tool is performing for better context

  
  
  PLAYWRIGHT BEST PRACTICES TO INCORPORATE:
  - Do not use page.waitForLoadState() as it causes issues, especially networkidle which may give false signals of completion
  - Add appropriate try/catch blocks for error handling
  - Include page.waitForTimeout() between actions when needed for proper timing
  - Structure the script with async/await patterns
  - Add meaningful comments and section headers
  - Use viewport size consistently: Fix the browser viewport (page.setViewportSize({ width: 1280, height: 720 })) to avoid shifting coordinates across runs
  - Use the description and timing information to calculate the most appropriate timeouts for each action to ensure correct execution. Consider the nature of each action (navigation, form filling, button clicks, etc.) when determining timeout values.
  
  Your output should be a complete, runnable Playwright script that accurately reproduces the test scenario and follows best practices for maintainability and reliability. Strictly don't include any additional explanations outside of the script. Return only the script alone.
`;


        // Create a prompt with the actions
        const userPrompt = `
      Generate a Playwright script based on the following browser interaction data:
      ${JSON.stringify(actions, null, 2)}
      
      The script should be a complete, runnable Playwright script that can be executed independently.
      Include proper imports, setup, and teardown code.
    `;

        // Generate the script using the LLM
        const response = await model.invoke([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]);

        // Extract the script from the response
        const scriptContent = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Clean up the script (remove markdown code blocks if present)
        const cleanScript = scriptContent.replace(/```typescript|```javascript|```js|```/g, '').trim();

        return cleanScript;
    } catch (error) {
        logger.error(`Error generating Playwright script: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}

/**
 * Save a generated Playwright script to the session directory
 * @param sessionId The session ID
 * @param script The generated script content
 * @returns The path to the saved script file
 */
export function savePlaywrightScript(sessionId: string, script: string): string {
    try {
        // Create the playwright/scripts directory within the session directory
        const playwrightDir = getSessionSubdirPath(sessionId, PLAYWRIGHT_DIR_NAME);
        const scriptsDir = path.join(playwrightDir, SCRIPTS_SUBDIR_NAME);

        // Ensure the scripts directory exists
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }

        // Generate a timestamp for the filename
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');

        // Create the script filename
        const filename = `playwright-coordinate-script-${timestamp}.js`;

        // Full path to the script file
        const scriptPath = path.join(scriptsDir, filename);

        // Write the script to the file
        fs.writeFileSync(scriptPath, script);

        return scriptPath;
    } catch (error) {
        logger.error(`Error saving Playwright script: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}
