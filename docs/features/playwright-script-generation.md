# Playwright Script Generation

One of the most powerful features of the Factifai Agent Suite is its ability to automatically convert successful test executions into reusable Playwright scripts. After your natural language test completes successfully, the AI generates both selector-based and coordinate-based Playwright TypeScript code, ready to be integrated into your test automation suite.

<video controls autoplay loop muted class="feature-video">
  <source src="../assets/playwright-script-generation-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## How It Works

When your test completes successfully, the Factifai Agent automatically:

1. **Records all actions** - Every browser interaction is captured in a structured `actions.json` file
2. **Analyzes the execution** - The AI examines the recorded actions, element data, and timing information
3. **Generates two script variants** - Creates both selector-based and coordinate-based Playwright scripts
4. **Initializes project structure** - Sets up a complete Playwright project with configuration files
5. **Saves to organized directories** - Stores everything in an organized folder structure

## Generated Output Structure

After test execution, you'll find the following structure in your session directory:

```
playwright/
├── actions/
│   └── actions.json                    # Recorded browser actions with metadata
└── scripts/
    ├── package.json                    # Playwright project configuration
    ├── playwright.config.ts            # Playwright test configuration
    ├── .gitignore
    └── tests/
        ├── playwright-selector-based-script-2025-10-06T10-08-32-569Z.spec.ts
        └── playwright-coordinate-based-script-2025-10-06T10-08-23-908Z.spec.ts
```

## Two Script Generation Approaches

### 1. Selector-Based Scripts

**Best for**: Maintainable, human-readable tests that adapt to UI changes

Selector-based scripts use Playwright's modern locator APIs to interact with elements:
- `page.getByRole()` - for semantic elements (buttons, links, inputs)
- `page.getByText()` - for visible text content
- `page.getByPlaceholder()` - for form inputs
- `page.locator('[data-test]')` - for test-specific attributes

**Example:**
```typescript
await test.step('Login to application', async () => {
  await page.getByPlaceholder(/username/i).fill('standard_user');
  await page.getByPlaceholder(/password/i).fill('secret_sauce');
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForTimeout(2000);
});
```

**Advantages:**
- More resilient to minor UI changes
- Easier to understand and maintain
- Better integration with accessibility best practices
- Follows Playwright's recommended patterns

### 2. Coordinate-Based Scripts

**Best for**: Precise visual regression testing and exact click reproduction

Coordinate-based scripts use exact X/Y coordinates from the original test execution:
- `page.mouse.click(x, y)` - clicks at exact screen coordinates
- `page.keyboard.type()` - types text without element selection
- Reproduces the exact user interaction path

**Example:**
```typescript
await test.step('Login to application', async () => {
  await page.mouse.click(640, 174); // Username field
  await page.keyboard.type('standard_user', { delay: 50 });
  await page.mouse.click(640, 228); // Password field
  await page.keyboard.type('secret_sauce', { delay: 50 });
  await page.mouse.click(640, 328); // Login button
  await page.waitForTimeout(2000);
});
```

**Advantages:**
- Exact reproduction of test execution
- No selector dependencies
- Useful for visual regression testing
- Works with any element, regardless of attributes

## The actions.json File

The `actions.json` file serves as the foundation for script generation. It contains a detailed record of every successful action performed during test execution:

```json
[
  {
    "tool": "navigate",
    "args": {
      "url": "https://www.saucedemo.com"
    },
    "description": "The navigation to saucedemo.com was successful...",
    "timestamp": 1759745240.968
  },
  {
    "tool": "click",
    "args": {
      "coordinates": {
        "x": 640,
        "y": 174
      },
      "element": {
        "tagName": "input",
        "attributes": {
          "class": "input_error form_input",
          "placeholder": "Username",
          "type": "text",
          "data-test": "username",
          "id": "user-name"
        },
        "type": "text",
        "placeholder": "Username"
      }
    },
    "description": "The username input field was clicked successfully...",
    "timestamp": 1759745247.782
  },
  {
    "tool": "type_text",
    "args": {
      "text": "standard_user"
    },
    "description": "Successfully entered 'standard_user' in the username field",
    "timestamp": 1759745256.439
  }
]
```

### Action Types Captured

- **navigate** - URL navigation with success verification
- **click** - Element clicks with coordinates and element metadata
- **type_text** - Text input with content
- **wait** - Explicit wait periods
- **scroll** - Scrolling actions with direction/coordinates
- **reload** - Page reloads
- **go_back** / **go_forward** - Browser navigation
- **clear** - Input field clearing

Each action includes:
- **tool**: The action type
- **args**: Action-specific arguments (coordinates, text, URLs, etc.)
- **element** (when applicable): Complete element metadata including tag, attributes, and selectors
- **description**: AI-generated explanation of what happened
- **timestamp**: Precise timing information for replay accuracy

## LLM-Powered Script Generation

The script generation process leverages Large Language Models to create production-ready code:

### Selector-Based Generation
The LLM analyzes element metadata to choose the best locator strategy:
1. Prioritizes `data-test` and `data-testid` attributes
2. Falls back to semantic attributes (placeholder, aria-label)
3. Uses role-based selectors for buttons, links, inputs
4. Considers stable attributes (href, type)
5. Handles strict mode violations with `.first()` or `.filter()`

### Coordinate-Based Generation
The LLM creates precise coordinate-based scripts by:
1. Analyzing timestamp deltas to determine appropriate wait times
2. Grouping related actions into logical `test.step()` blocks
3. Adding console logging for debugging
4. Implementing proper error handling
5. Including comments derived from action descriptions

### Generated Script Features

Both script types include:
- ✅ Complete TypeScript setup with proper imports
- ✅ Playwright Test framework structure
- ✅ Organized `test.describe()` and `test.step()` blocks
- ✅ Intelligent wait strategies based on timing analysis
- ✅ Console logging for debugging
- ✅ Comments explaining each step
- ✅ Viewport configuration for consistency

## Running Generated Scripts

Once scripts are generated, you can run them immediately:

### 1. Navigate to the scripts directory
```bash
cd playwright/scripts
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the tests
```bash
# Run all tests
npx playwright test

# Run a specific test
npx playwright test tests/playwright-selector-based-script-2025-10-06T10-08-32-569Z.spec.ts

# Run with UI mode for debugging
npx playwright test --ui

# Run with headed browser
npx playwright test --headed
```

### 4. View test reports
```bash
npx playwright show-report
```

## When Script Generation Occurs

Playwright scripts are automatically generated when:
- ✅ The test completes successfully (`isComplete: true`)
- ✅ All test steps pass (no failed steps)
- ✅ At least one action was recorded
- ✅ The `--generate-playwright` flag is not set to false (it's true by default)

Script generation is **skipped** when:
- ❌ The test fails or doesn't complete
- ❌ Any test step has a "failed" status
- ❌ No actions were recorded (empty test)
- ❌ The `--skip-playwright` flag is used

## Disabling Script Generation

If you want to run tests without generating Playwright scripts:

```bash
# Disable for a single test
factifai-agent run --skip-playwright "Your test instruction"

# Set as default in configuration
factifai-agent config --set SKIP_PLAYWRIGHT=false
```

## Best Practices

### When to Use Selector-Based Scripts
- Long-term test maintenance
- Tests that need to adapt to UI changes
- Accessibility-focused testing
- Team collaboration and code reviews
- Integration with existing Playwright test suites

### When to Use Coordinate-Based Scripts
- Visual regression testing
- Exact reproduction of user behavior
- Testing canvas or complex visual elements
- Quick prototyping and exploration
- Elements without stable selectors

### Hybrid Approach
You can also combine both approaches:
1. Use selector-based scripts as your primary test suite
2. Use coordinate-based scripts for visual validation
3. Compare results to ensure consistency
4. Switch to coordinates when selectors prove unstable

## Troubleshooting

### Scripts fail to generate
- Check that the test completed successfully
- Verify that actions were recorded in `actions.json`
- Ensure you have sufficient LLM API credits
- Check the session logs in `factifai.log`

### Generated scripts don't run
- Install dependencies: `npm install`
- Install Playwright browsers: `npx playwright install --with-deps`
- Check Playwright configuration in `playwright.config.ts`
- Verify Node.js version is 18 or higher

### Selector-based scripts fail
- UI may have changed since test execution
- Use LLM tools to analyze the error and suggest more resilient selectors
- Consider using coordinate-based scripts as fallback
- Review the element data in `actions.json` for better selector options

### Coordinate-based scripts fail
- Window size may differ from test execution (set viewport: 1280x720)
- UI layout may have changed
- Try adjusting wait times for slower environments
- Verify coordinates in `actions.json` match current UI

## Next Steps

Now that you understand Playwright script generation, explore:

- [Test Parsing](./test-parsing) - Learn how to write effective test instructions
- [Live Test Progress](./live-progress) - Monitor your tests in real-time
- [HTML & XML Reports](./html-xml-reports) - View comprehensive test reports
- [Quick Start Guide](../getting-started/quick-start) - Try generating your first script

<style>
.feature-video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 1rem 0;
}
</style>
