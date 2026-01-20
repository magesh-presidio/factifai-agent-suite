import * as fs from 'fs';
import * as path from 'path';
import { getModel } from '../../core/models/models';
import { getSessionSubdirPath } from './path-utils';
import { logger } from './logger';
import { PLAYWRIGHT_DIR_NAME, SCRIPTS_SUBDIR_NAME } from '../../core/nodes/playwright/playwright-utils/action-extractor';

/**
 * Script generation types
 */
export enum ScriptType {
  COORDINATE = 'coordinate-based',
  SELECTOR = 'selector-based'
}

/**
 * Script output formats
 */
export enum ScriptFormat {
  SPEC = 'spec',      // Traditional .spec.ts format for Playwright test runner
  MODULE = 'module'   // Export function format for workflow orchestration
}

/**
 * Generate a Playwright script from test execution data using coordinates
 * @param sessionId The session ID
 * @param actions The recorded actions with timestamps
 * @param format The output format (spec or module)
 * @param scriptName Optional name for the exported function (used in module format)
 * @returns Promise with the generated script
 */
export async function generatePlaywrightCoordinateScript(
  _sessionId: string,
  actions: any[],
  format: ScriptFormat = ScriptFormat.MODULE,
  scriptName?: string
): Promise<string> {
  try {
    if (actions.length === 0) {
      throw new Error('No actions provided for script generation');
    }

    // Remove element property from actions for coordinate-based generation
    const coordinateActions = actions.map(action => {
      const { element, ...remainingAction } = action.args || {};
      return {
        ...action,
        args: remainingAction
      };
    });

    // Get the LLM model
    const model = getModel(false);
    if (!model) {
      throw new Error('Failed to initialize model');
    }

    // Create system prompt based on format
    const modulePrompt = `You are an expert Playwright test automation engineer. Generate a reusable TypeScript module that exports an async function for browser automation using ONLY mouse coordinates and keyboard input.

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid TypeScript code - NO markdown fences, NO explanations, NO commentary outside code comments
- Export an async function that takes a Page object as parameter
- Return a result object with success status and message
- All actions must use coordinates exclusively - NEVER use selectors, locators, or DOM queries

REQUIRED STRUCTURE:

import { Page } from 'playwright';

export interface ScriptResult {
  success: boolean;
  message: string;
}

export async function ${scriptName || 'executeScript'}(page: Page): Promise<ScriptResult> {
  try {
    // Set viewport for consistency
    await page.setViewportSize({ width: 1280, height: 720 });

    // Your steps here with console.log for each step
    console.log('Step 1: Description...');
    // [T=timestamp] Action description

    return {
      success: true,
      message: 'Script completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: \`Script failed - \${error}\`
    };
  }
}


NAVIGATION:
- Use: await page.goto(url, { timeout: 60000 });
- Add wait after navigation: await page.waitForTimeout(2000);

TIMING STRATEGY (critical for reliability):
Analyze timestamp deltas between actions from the 'timestamp' field:
- Delta < 200ms → await page.waitForTimeout(200);
- Delta 200-1000ms → await page.waitForTimeout(Math.round(delta));
- Delta 1000-5000ms → await page.waitForTimeout(Math.min(delta, 3000));
- Delta > 5000ms → await page.waitForTimeout(2000);
- After navigation → await page.waitForTimeout(2000);
- After click that opens/closes elements → await page.waitForTimeout(500);

MOUSE ACTIONS:
- Click: await page.mouse.click(x, y);
- Double-click: await page.mouse.dblclick(x, y);
- Right-click: await page.mouse.click(x, y, { button: 'right' });
- Hover: await page.mouse.move(x, y);

KEYBOARD ACTIONS:
- Type text: await page.keyboard.type('text', { delay: 50 });
- Special keys: await page.keyboard.press('Enter' | 'Tab' | 'Escape' | 'Backspace');
- Newline in text: await page.keyboard.press('Enter');

ERROR HANDLING & LOGGING:
- Add console.log() before major actions: console.log('Step N: Clicking login button...');
- Include timestamp references in comments: // [T=1759222754.022] Navigate to homepage
- Use descriptive step numbers for tracking progress

CODE ORGANIZATION:
- Group actions into logical steps based on description field
- Add brief comments derived from description: // Close promotional popup
- Use async/await consistently

STRICT RULES:
1. NEVER use: page.locator(), page.getByRole(), page.getByText(), CSS selectors, XPath
2. NEVER use: waitForSelector, waitForLoadState, waitUntil options
3. ALWAYS use coordinates from the data
4. NEVER invent actions not in the provided data
5. NEVER add assertions unless specifically verifying test success at the end
6. Output ONLY the code - no explanations

EXAMPLE:

import { Page } from 'playwright';

export interface ScriptResult {
  success: boolean;
  message: string;
}

export async function ${scriptName || 'executeScript'}(page: Page): Promise<ScriptResult> {
  try {
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('Step 1: Navigating to website...');
    // [T=1759222754.022] Navigate to homepage
    await page.goto('https://example.com', { timeout: 60000 });
    await page.waitForTimeout(2000);

    console.log('Step 2: Closing popup...');
    // [T=1759222756.500] Close promotional popup
    await page.mouse.click(1089, 45);
    await page.waitForTimeout(500);

    return {
      success: true,
      message: 'Script completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: \`Script failed - \${error}\`
    };
  }
}

Generate the complete module now.`;

    const specPrompt = `You are an expert Playwright test automation engineer. Generate a complete, production-ready Playwright test script in TypeScript that replays browser interactions using ONLY mouse coordinates and keyboard input.

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid TypeScript code - NO markdown fences, NO explanations, NO commentary outside code comments
- Use Playwright Test framework: import { test, expect } from '@playwright/test';
- Structure: test.describe() with test() blocks and test.step() for organization
- All actions must use coordinates exclusively - NEVER use selectors, locators, or DOM queries

BROWSER SETUP (required):

test.describe('Test Suite Name', () => {
  test('test description', async ({ page }) => {
    // Set viewport for consistency
    await page.setViewportSize({ width: 1280, height: 720 });

    // Your test steps here
  });
});


NAVIGATION:
- Use: await page.goto(url, { timeout: 60000 });
- Add wait after navigation: await page.waitForTimeout(2000);

TIMING STRATEGY (critical for reliability):
Analyze timestamp deltas between actions from the 'timestamp' field:
- Delta < 200ms → await page.waitForTimeout(200);
- Delta 200-1000ms → await page.waitForTimeout(Math.round(delta));
- Delta 1000-5000ms → await page.waitForTimeout(Math.min(delta, 3000));
- Delta > 5000ms → await page.waitForTimeout(2000);
- After navigation → await page.waitForTimeout(2000);
- After click that opens/closes elements → await page.waitForTimeout(500);

MOUSE ACTIONS:
- Click: await page.mouse.click(x, y);
- Double-click: await page.mouse.dblclick(x, y);
- Right-click: await page.mouse.click(x, y, { button: 'right' });
- Hover: await page.mouse.move(x, y);

KEYBOARD ACTIONS:
- Type text: await page.keyboard.type('text', { delay: 50 });
- Special keys: await page.keyboard.press('Enter' | 'Tab' | 'Escape' | 'Backspace');
- Newline in text: await page.keyboard.press('Enter');

ERROR HANDLING & LOGGING:
- Wrap critical sections in test.step() with descriptive names
- Add console.log() before major actions: console.log('Navigating to website...');

CODE ORGANIZATION:
- Group actions into logical test.step() blocks based on description field
- Add brief comments derived from description: // Close promotional popup
- Use async/await consistently
- Include timestamp references in comments: // [T=1759222754.022] Navigate to homepage

STRICT RULES:
1. NEVER use: page.locator(), page.getByRole(), page.getByText(), CSS selectors, XPath
2. NEVER use: waitForSelector, waitForLoadState, waitUntil options
3. ALWAYS use coordinates from the data
4. NEVER invent actions not in the provided data
5. NEVER add assertions unless specifically verifying test success at the end
6. Output ONLY the test code - no explanations

EXAMPLE STRUCTURE:

import { test, expect } from '@playwright/test';

test.describe('Website Interaction Test', () => {
  test('should complete user flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await test.step('Navigate to website', async () => {
      // [T=1759222754.022] Navigate to homepage
      await page.goto('https://example.com', { timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Close popup', async () => {
      // [T=1759222756.500] Close promotional popup
      await page.mouse.click(1089, 45);
      await page.waitForTimeout(500);
    });

    // More steps...
  });
});

Generate the complete test script now.`;

    const systemPrompt = format === ScriptFormat.MODULE ? modulePrompt : specPrompt;



    // Create a prompt with the actions
    const userPrompt = `
      Generate a Playwright script based on the following browser interaction data:
      ${JSON.stringify(coordinateActions, null, 2)}

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
 * Generate a Playwright script from test execution data using selectors/locators
 * @param sessionId The session ID
 * @param actions The recorded actions with timestamps
 * @param format The output format (spec or module)
 * @param scriptName Optional name for the exported function (used in module format)
 * @returns Promise with the generated script
 */
export async function generatePlaywrightSelectorScript(
  _sessionId: string,
  actions: any[],
  format: ScriptFormat = ScriptFormat.MODULE,
  scriptName?: string
): Promise<string> {
  try {
    if (actions.length === 0) {
      throw new Error('No actions provided for script generation');
    }

    // Remove coordinates property from actions for selector-based generation
    const selectorActions = actions.map(action => {
      if (action.args && action.args.coordinates) {
        const { coordinates, ...remainingArgs } = action.args;
        return {
          ...action,
          args: remainingArgs
        };
      }
      return action;
    });

    // Get the LLM model
    const model = getModel(false);
    if (!model) {
      throw new Error('Failed to initialize model');
    }

    // Create system prompt based on format
    const selectorModulePrompt = `You are an expert Playwright test automation engineer. Generate a reusable TypeScript module that exports an async function for browser automation using Playwright locators and selectors. NEVER use coordinates.

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid TypeScript code - NO markdown fences, NO explanations, NO commentary outside code comments
- Export an async function that takes a Page object as parameter
- Return a result object with success status and message
- All interactions must use Playwright's modern locator APIs

REQUIRED STRUCTURE:

import { Page } from 'playwright';

export interface ScriptResult {
  success: boolean;
  message: string;
}

export async function ${scriptName || 'executeScript'}(page: Page): Promise<ScriptResult> {
  try {
    // Your steps here with console.log for each step
    console.log('Step 1: Description...');
    // [T=timestamp] Action description

    return {
      success: true,
      message: 'Script completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: \`Script failed - \${error}\`
    };
  }
}


NAVIGATION:
- Use: await page.goto(url, { timeout: 60000 });
- Playwright auto-waits for most actions - minimal explicit waits needed
- Use await page.waitForTimeout() only when absolutely necessary (e.g., after navigation or for dynamic content)

TIMING STRATEGY (use when necessary):
Analyze timestamp deltas between actions from the 'timestamp' field for guidance:
- After navigation → await page.waitForTimeout(2000);
- After click that triggers dynamic content → await page.waitForTimeout(500);
- Playwright's auto-wait handles most cases, but add waits for animations/transitions

LOCATOR STRATEGY (priority order, use first applicable):
1. **getByRole** - button, link, textbox, checkbox, radio (use role + name)
2. **getByPlaceholder** - inputs with placeholder text
3. **getByText** - visible text content
4. **getByLabel** - form inputs with associated labels
5. **getByTestId** - ONLY for data-testid attribute
6. **locator('[attribute]')** - data-test, data-gtm-tag, href, type, stable classes

ELEMENT ANALYSIS EXAMPLES:

Login button: { attributes: { "data-test": "login-button" } }
→ page.locator('[data-test="login-button"]')

Username input: { attributes: { "placeholder": "Username" } }
→ page.getByPlaceholder(/username/i)

Add to cart: { tagName: "button", textContent: "Add to Cart" }
→ page.getByRole('button', { name: /add to cart/i })

Product link: { attributes: { "href": "/products/item-1" } }
→ page.locator('[href="/products/item-1"]')

Checkout button: { attributes: { "data-testid": "checkout" } }
→ page.getByTestId('checkout')

ACTIONS:
- Click: await locator.click();
- Fill: await locator.fill('text');
- Press key: await locator.press('Enter');
- Check: await locator.check();
- Select: await locator.selectOption('value');

HANDLING STRICT MODE VIOLATIONS:
If multiple elements match:
- Add .first() with comment: // Multiple instances, using first visible
- Use .filter({ hasText: /specific/i }): locator.filter({ hasText: /cart/i })
- Scope to parent: page.locator('#parent-id').getByRole(...)
- Use nth(): locator.nth(0) only if order is deterministic

ERROR HANDLING & LOGGING:
- Add console.log() before major actions: console.log('Step N: Clicking login button...');
- Include timestamp references in comments: // [T=1759222754.022] Navigate to homepage
- Use descriptive step numbers for tracking progress

CODE ORGANIZATION:
- Group actions into logical steps based on description field
- Add brief comments derived from description: // Close promotional popup
- Use async/await consistently

STRICT RULES:
1. NEVER use coordinates or page.mouse
2. ALWAYS use case-insensitive regex: /text/i
3. NEVER invent selectors - derive from element data
4. NEVER add assertions unless specifically verifying test success at the end
5. Output ONLY the code - no explanations
6. Use descriptive console.log() for each step

CRITICAL: Analyze the element data carefully to build the most specific, reliable locator possible. Avoid brittle selectors.

Generate the complete module now.`;

    const selectorSpecPrompt = `You are an expert Playwright test automation engineer. Generate a complete, production-ready Playwright test script in TypeScript using ONLY Playwright locators and selectors. NEVER use coordinates.

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid TypeScript code - NO markdown fences, NO explanations, NO commentary outside code comments
- Use Playwright Test framework: import { test, expect } from '@playwright/test';
- Structure: test.describe() with test() blocks and test.step() for organization
- All interactions must use Playwright's modern locator APIs

BROWSER SETUP (required):

test.describe('Test Suite Name', () => {
  test('test description', async ({ page }) => {
    // Your test steps here
  });
});


NAVIGATION:
- Use: await page.goto(url, { timeout: 60000 });
- Playwright auto-waits for most actions - minimal explicit waits needed
- Use await page.waitForTimeout() only when absolutely necessary (e.g., after navigation or for dynamic content)

TIMING STRATEGY (use when necessary):
Analyze timestamp deltas between actions from the 'timestamp' field for guidance:
- After navigation → await page.waitForTimeout(2000);
- After click that triggers dynamic content → await page.waitForTimeout(500);
- Playwright's auto-wait handles most cases, but add waits for animations/transitions

LOCATOR STRATEGY (priority order, use first applicable):
1. **getByRole** - button, link, textbox, checkbox, radio (use role + name)
2. **getByPlaceholder** - inputs with placeholder text
3. **getByText** - visible text content
4. **getByLabel** - form inputs with associated labels
5. **getByTestId** - ONLY for data-testid attribute
6. **locator('[attribute]')** - data-test, data-gtm-tag, href, type, stable classes

ELEMENT ANALYSIS EXAMPLES:

Login button: { attributes: { "data-test": "login-button" } }
→ page.locator('[data-test="login-button"]')

Username input: { attributes: { "placeholder": "Username" } }
→ page.getByPlaceholder(/username/i)

Add to cart: { tagName: "button", textContent: "Add to Cart" }
→ page.getByRole('button', { name: /add to cart/i })

Product link: { attributes: { "href": "/products/item-1" } }
→ page.locator('[href="/products/item-1"]')

Checkout button: { attributes: { "data-testid": "checkout" } }
→ page.getByTestId('checkout')

ACTIONS:
- Click: await locator.click();
- Fill: await locator.fill('text');
- Press key: await locator.press('Enter');
- Check: await locator.check();
- Select: await locator.selectOption('value');

HANDLING STRICT MODE VIOLATIONS:
If multiple elements match:
- Add .first() with comment: // Multiple instances, using first visible
- Use .filter({ hasText: /specific/i }): locator.filter({ hasText: /cart/i })
- Scope to parent: page.locator('#parent-id').getByRole(...)
- Use nth(): locator.nth(0) only if order is deterministic

ERROR HANDLING & LOGGING:
- Wrap critical sections in test.step() with descriptive names
- Add console.log() before major actions: console.log('Navigating to website...');

CODE ORGANIZATION:
- Group actions into logical test.step() blocks based on description field
- Add brief comments derived from description: // Close promotional popup
- Use async/await consistently
- Include timestamp references in comments: // [T=1759222754.022] Navigate to homepage

STRICT RULES:
1. NEVER use coordinates or page.mouse
2. ALWAYS use case-insensitive regex: /text/i
3. NEVER invent selectors - derive from element data
4. NEVER add assertions unless specifically verifying test success at the end
5. Output ONLY the test code - no explanations

EXAMPLE STRUCTURE:

import { test, expect } from '@playwright/test';

test.describe('Website Interaction Test', () => {
  test('should complete user flow', async ({ page }) => {
    await test.step('Navigate to website', async () => {
      await page.goto('https://example.com', { timeout: 60000 });
      await page.waitForTimeout(2000);
    });

    await test.step('Search for product', async () => {
      // [T=1759222756.500] Enter search term
      const searchInput = page.getByPlaceholder(/search/i);
      await searchInput.fill('laptop');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    });

    await test.step('Select and add product to cart', async () => {
      const productLink = page.locator('[href="/products/product-name"]').first();
      await productLink.click();

      const addToCartBtn = page.locator('[data-gtm-tag*="add-to-cart"]');
      await addToCartBtn.click();

      // Verify
      await expect(page.getByText(/cart.*1 item/i)).toBeVisible();
    });
  });
});

CRITICAL: Analyze the element data carefully to build the most specific, reliable locator possible. Avoid brittle selectors.

Generate the complete test script now.`;

    const systemPrompt = format === ScriptFormat.MODULE ? selectorModulePrompt : selectorSpecPrompt;

    // Create a prompt with the actions
    const userPrompt = `
      Generate a Playwright script based on the following browser interaction data:
      ${JSON.stringify(selectorActions, null, 2)}

      The script should be a complete, runnable Playwright script that can be executed independently.
      Include proper imports, setup, and teardown code.

      Remember to use Playwright's locator APIs (page.getByRole(), page.getByText(), etc.) instead of coordinates.
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
    logger.error(`Error generating Playwright selector script: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Initialize Playwright project structure in scripts directory
 * Creates package.json, playwright.config.ts, .gitignore, and tests folder
 * @param scriptsDir The scripts directory path
 */
function initializePlaywrightProject(scriptsDir: string): void {
  // Create package.json
  const packageJson = {
    name: "playwright-tests",
    version: "1.0.0",
    description: "Generated Playwright tests",
    main: "index.js",
    scripts: {},
    keywords: [],
    author: "",
    license: "ISC",
    packageManager: "pnpm@10.17.0",
    devDependencies: {
      "@playwright/test": "^1.55.1",
      "@types/node": "^24.7.0"
    }
  };

  const packageJsonPath = path.join(scriptsDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  // Create playwright.config.ts
  const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
`;

  const configPath = path.join(scriptsDir, 'playwright.config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, playwrightConfig);
  }

  // Create .gitignore
  const gitignore = `
# Playwright
node_modules/
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
/playwright/.auth/
`;

  const gitignorePath = path.join(scriptsDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignore);
  }

  // Create tests directory
  const testsDir = path.join(scriptsDir, 'tests');
  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }
}

/**
 * Save a generated Playwright script to the scripts/tests directory
 * @param sessionId The session ID
 * @param script The generated script content
 * @param type The type of script (coordinate or selector)
 * @param format The script format (spec or module)
 * @param scriptName Optional custom name for the script file
 * @returns The path to the saved script file
 */
export function savePlaywrightScript(
  sessionId: string,
  script: string,
  type: ScriptType = ScriptType.COORDINATE,
  format: ScriptFormat = ScriptFormat.MODULE,
  scriptName?: string
): string {
  try {
    // Create the playwright/scripts directory within the session directory
    const playwrightDir = getSessionSubdirPath(sessionId, PLAYWRIGHT_DIR_NAME);
    const scriptsDir = path.join(playwrightDir, SCRIPTS_SUBDIR_NAME);

    // Ensure the scripts directory exists
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Initialize Playwright project structure (only for spec format)
    if (format === ScriptFormat.SPEC) {
      initializePlaywrightProject(scriptsDir);
    }

    // Determine output directory based on format
    const outputDir = format === ScriptFormat.SPEC
      ? path.join(scriptsDir, 'tests')
      : scriptsDir;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename based on format
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const baseName = scriptName || `playwright-${type}-script-${timestamp}`;
    const extension = format === ScriptFormat.SPEC ? '.spec.ts' : '.ts';
    const filename = `${baseName}${extension}`;

    // Full path to the script file
    const scriptPath = path.join(outputDir, filename);

    // Write the script to the file
    fs.writeFileSync(scriptPath, script);

    return scriptPath;
  } catch (error) {
    logger.error(`Error saving Playwright script: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
