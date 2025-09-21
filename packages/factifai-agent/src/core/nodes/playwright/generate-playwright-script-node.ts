import { GraphStateType } from "../../graph/graph";
import { logger } from "../../../common/utils/logger";
import { getSessionSubdirPath } from "../../../common/utils/path-utils";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

export const PLAYWRIGHT_SCRIPTS_DIR_NAME = "playwright-scripts";

interface ActionData {
  type: string;
  coordinates?: { x: number; y: number };
  text?: string;
  selector?: string;
  timestamp: number;
}

const extractActionsFromLogs = (sessionId: string): ActionData[] => {
  const actions: ActionData[] = [];

  try {
    const sessionPath = getSessionSubdirPath(sessionId, "");
    const logPath = path.join(sessionPath, "factifai.log");

    if (fs.existsSync(logPath)) {
      const logContent = fs.readFileSync(logPath, "utf-8");
      const logLines = logContent.split("\n");

      for (const line of logLines) {
        // Parse the new simplified format: PLAYWRIGHT_SUCCESS: {...}
        if (line.includes("PLAYWRIGHT_SUCCESS:")) {
          try {
            const actionDataStr = line.split("PLAYWRIGHT_SUCCESS:")[1].trim();
            const actionData = JSON.parse(actionDataStr);

            // Convert to our ActionData format
            const action: ActionData = {
              type: actionData.actionType || "unknown",
              timestamp: actionData.timestamp || Date.now(),
            };

            if (actionData.coordinates) {
              action.coordinates = actionData.coordinates;
            }

            if (actionData.text) {
              action.text = actionData.text;
            }

            actions.push(action);
          } catch (e) {
            console.warn("Failed to parse PLAYWRIGHT_SUCCESS entry:", e);
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error extracting actions from logs:", error);
  }

  return actions;
};

const generatePlaywrightScript = (actions: ActionData[], testName: string, sessionUrl?: string): string => {
  const imports = `import { test, expect, Page } from '@playwright/test';

`;

  const testHeader = `test('${testName}', async ({ page }) => {
  // Set viewport to match the recorded session
  await page.setViewportSize({ width: 1280, height: 720 });

  // Navigate to the test URL
  await page.goto('${sessionUrl || 'https://www.saucedemo.com'}');
  await page.waitForTimeout(2000);

`;

  let scriptBody = "";

  for (const action of actions) {
    switch (action.type) {
      case "click":
        if (action.coordinates) {
          scriptBody += `  // Click at coordinates (${action.coordinates.x}, ${action.coordinates.y})
  await page.mouse.click(${action.coordinates.x}, ${action.coordinates.y});
  await page.waitForTimeout(2000);

`;
        }
        break;
      case "type":
        if (action.text) {
          scriptBody += `  // Type text: ${action.text}
  await page.keyboard.type('${action.text.replace(/'/g, "\\'")}');
  await page.waitForTimeout(2000);

`;
        }
        break;
      case "scroll":
        if (action.coordinates) {
          scriptBody += `  // Scroll by (${action.coordinates.x}, ${action.coordinates.y}) pixels
  await page.mouse.wheel(${action.coordinates.x}, ${action.coordinates.y});
  await page.waitForTimeout(2000);

`;
        }
        break;
      case "clear":
        scriptBody += `  // Clear input field
  await page.keyboard.selectAll();
  await page.keyboard.press('Delete');
  await page.waitForTimeout(2000);

`;
        break;
    }
  }

  const testFooter = `});
`;

  return imports + testHeader + scriptBody + testFooter;
};


export const generatePlaywrightScriptNode = async ({
  sessionId,
  processedInstruction,
  isComplete,
  testStartTime,
  testEndTime,
}: GraphStateType) => {
  // Only generate scripts if the session completed successfully
  if (!isComplete || !testStartTime) {
    logger.info(chalk.yellow("⏭️  Skipping Playwright script generation - session not completed successfully"));
    return {};
  }

  try {
    logger.info(chalk.cyan("🎭 Generating Playwright scripts..."));

    // Create playwright-scripts directory
    const playwrightScriptsDir = getSessionSubdirPath(sessionId, PLAYWRIGHT_SCRIPTS_DIR_NAME);

    // Extract actions from session logs
    const actions = extractActionsFromLogs(sessionId);

    if (actions.length === 0) {
      logger.warn(chalk.yellow("⚠️  No actions found in session logs - cannot generate scripts"));
      return {};
    }

    // Extract URL from session logs for navigation
    let sessionUrl = "https://www.saucedemo.com"; // default
    try {
      const sessionPath = getSessionSubdirPath(sessionId, "");
      const logPath = path.join(sessionPath, "factifai.log");

      if (fs.existsSync(logPath)) {
        const logContent = fs.readFileSync(logPath, "utf-8");
        const urlMatch = logContent.match(/Navigating to (https?:\/\/[^\s]+)/);
        if (urlMatch) {
          sessionUrl = urlMatch[1];
        }
      }
    } catch (error) {
      console.warn("Could not extract URL from logs, using default");
    }

    // Generate test name from instruction
    const testName = processedInstruction
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .substring(0, 50);

    // Generate single Playwright script
    const playwrightScript = generatePlaywrightScript(actions, testName, sessionUrl);
    const scriptPath = path.join(playwrightScriptsDir, "test.spec.ts");
    fs.writeFileSync(scriptPath, playwrightScript);

    logger.info(chalk.green(`✅ Successfully generated Playwright script in ${playwrightScriptsDir}`));
    logger.info(chalk.gray(`   📄 Generated ${actions.length} actions in test.spec.ts`));
    logger.info(chalk.gray(`   🎯 Script includes navigation to: ${sessionUrl}`));

    return {};
  } catch (error) {
    logger.error("Error generating Playwright scripts:", error);
    return {
      lastError: `Failed to generate Playwright scripts: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};