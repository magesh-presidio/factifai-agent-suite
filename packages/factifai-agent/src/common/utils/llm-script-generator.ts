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
  COORDINATE = 'coordinate',
  SELECTOR = 'selector'
}

/**
 * Generate a Playwright script from test execution data using coordinates
 * @param sessionId The session ID
 * @param actions The recorded actions with timestamps
 * @returns Promise with the generated script
 */
export async function generatePlaywrightCoordinateScript(
  _sessionId: string,
  actions: any[]
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

    // Create a system prompt for the LLM
    const systemPrompt = `You are an expert Playwright test automation engineer. Generate a complete, production-ready Playwright test script that replays browser interactions using ONLY mouse coordinates and keyboard input.

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JavaScript/TypeScript code - NO markdown fences, NO explanations, NO commentary outside code comments
- Use Playwright Test framework: import { test, expect } from '@playwright/test';
- Structure: test.describe() with test() blocks and test.step() for organization
- All actions must use coordinates exclusively - NEVER use selectors, locators, or DOM queries

BROWSER SETUP (required):
\`\`\`javascript
test.describe('Test Suite Name', () => {
  test('test description', async ({ page }) => {
    // Set viewport for consistency
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Your test steps here
  });
});
\`\`\`

NAVIGATION:
- Use: await page.goto(url, { timeout: 60000 });
- Add wait after navigation: await page.waitForTimeout(2000);

TIMING STRATEGY (critical for reliability):
Analyze timestamp deltas between actions:
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
\`\`\`javascript
const { test, expect } = require('@playwright/test');

test.describe('Website Interaction Test', () => {
  test('should complete user flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    await test.step('Navigate to website', async () => {
      await page.goto('https://example.com', { timeout: 60000 });
      await page.waitForTimeout(2000);
    });
    
    await test.step('Close popup', async () => {
      await page.mouse.click(1089, 45);
      await page.waitForTimeout(500);
    });
    
    // More steps...
  });
});
\`\`\`

Generate the complete test script now.`;



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
 * @returns Promise with the generated script
 */
export async function generatePlaywrightSelectorScript(
  _sessionId: string,
  actions: any[]
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

    // Create a system prompt for the LLM
    const systemPrompt = `You are an expert Playwright test automation engineer. Generate a complete, production-ready Playwright test script using ONLY Playwright locators and selectors. NEVER use coordinates.

CRITICAL OUTPUT REQUIREMENTS:
- Output ONLY valid JavaScript/TypeScript code - NO markdown fences, NO explanations, NO commentary outside code comments
- Use Playwright Test framework: import { test, expect } from '@playwright/test';
- Structure: test.describe() with test() blocks and test.step() for organization
- All interactions must use Playwright's modern locator APIs

BROWSER SETUP (required):
\`\`\`javascript
test.describe('Test Suite Name', () => {
  test('test description', async ({ page }) => {
    // Your test steps here
  });
});
\`\`\`

NAVIGATION:
- Use: await page.goto(url, { timeout: 60000 });
- Playwright auto-waits for most actions - minimal explicit waits needed
- Use await page.waitForTimeout() only when absolutely necessary (e.g., after navigation or for dynamic content)

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
If strict mode violations occur:
- Add .first() with comment: // Multiple instances, using first visible
- Use .filter({ hasText: /specific/i }): locator.filter({ hasText: /cart/i })
- Scope to parent: page.locator('#parent-id').getByRole(...)
- Use nth(): locator.nth(0) only if order is deterministic

LOCATOR SELECTION (analyze element.attributes and choose the first match):

**Data Attributes** (highest priority - most specific):
- data-testid → page.getByTestId('value')
- data-test → page.locator('[data-test="value"]')
- data-gtm-tag → page.locator('[data-gtm-tag="value"]')
- Any other data-* → page.locator('[data-*="value"]')

**Semantic Attributes**:
- placeholder → page.getByPlaceholder(/text/i)
- aria-label on button/link/input → page.getByRole(role, { name: /text/i })

**Content & Role**:
- button with text → page.getByRole('button', { name: /text/i })
- link with text → page.getByRole('link', { name: /text/i })
- visible text → page.getByText(/text/i)

**Stable Attributes**:
- href → page.locator('[href="value"]')
- type → page.locator('[type="value"]') or appropriate getByRole

**Last Resort**:
- Stable class names → page.locator('.class-name')

**Key Rules**:
- Scan element.attributes top to bottom - use the first applicable attribute
- data-test and data-testid are different attributes requiring different methods
- Always use case-insensitive regex for text: /text/i
- Never invent attributes not present in the element data

ACTIONS:
- Click: await locator.click();
- Fill input: await locator.fill('text');
- Type with delay: await locator.pressSequentially('text', { delay: 50 });
- Press key: await locator.press('Enter');
- Hover: await locator.hover();

WAITING & TIMING:
- Playwright auto-waits - no explicit waits unless:
  - After navigation: await page.waitForTimeout(2000);
  - Dynamic content: await page.waitForTimeout(500); (sparingly)
  - Specific element: await locator.waitFor({ state: 'visible' });

ERROR HANDLING:
- Use test.step() for logical sections
- Add descriptive console.log() statements
- Optional assertions to verify success:
  \`\`\`javascript
  await expect(page).toHaveURL(/expected-path/);
  await expect(locator).toBeVisible();
  \`\`\`

STRICT RULES:
1. NEVER use coordinates or page.mouse
2. NEVER use page.waitForSelector, waitForLoadState, or waitUntil options
3. ALWAYS use case-insensitive regex for text matching: /text/i
4. ALWAYS handle strict mode violations explicitly
5. NEVER invent selectors - derive from provided element data
6. PREFER getByRole over CSS selectors
7. Output ONLY the test code - no explanations

EXAMPLE STRUCTURE:
\`\`\`javascript
const { test, expect } = require('@playwright/test');

test.describe('Website Interaction Test', () => {
  test('should complete user flow', async ({ page }) => {
    
    await test.step('Navigate to website', async () => {
      await page.goto('https://example.com', { timeout: 60000 });
      await page.waitForTimeout(2000);
    });
    
    await test.step('Search for product', async () => {
      const searchButton = page.getByRole('button', { name: /search/i });
      await searchButton.click();
      
      const searchInput = page.getByPlaceholder(/search/i);
      await searchInput.fill('product name');
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
\`\`\`

CRITICAL: Analyze the element data carefully to build the most specific, reliable locator possible. Avoid brittle selectors.

Generate the complete test script now.`;

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
 * Save a generated Playwright script to the session directory
 * @param sessionId The session ID
 * @param script The generated script content
 * @param type The type of script (coordinate or selector)
 * @returns The path to the saved script file
 */
export function savePlaywrightScript(
  sessionId: string,
  script: string,
  type: ScriptType = ScriptType.COORDINATE
): string {
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

    // Create the script filename based on type
    const filename = `playwright-${type}-script-${timestamp}.js`;

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
