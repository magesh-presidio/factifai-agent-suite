# Cross-Browser Testing

This guide explains how to use the Factifai Agent Suite for cross-browser testing. By testing your application across different browsers, you can ensure consistent functionality and user experience for all your users, regardless of their browser choice.

## Why Cross-Browser Testing Matters

Even in today's modern web landscape, browsers still have differences in:

- **Rendering engines**: How HTML and CSS are interpreted and displayed
- **JavaScript engines**: How JavaScript code is executed
- **Feature support**: Which web APIs and features are available
- **Default styles**: How unstyled elements appear
- **Performance characteristics**: Speed of execution and rendering

These differences can lead to inconsistent user experiences or even broken functionality if not properly tested.

## Supported Browsers in Factifai Agent

Factifai Agent supports testing on the following browsers:

- **Chromium** (Default): The open-source browser that powers Google Chrome and Microsoft Edge
- **Firefox**: Mozilla's open-source browser
- **WebKit**: The engine that powers Safari

## Prerequisites

Before starting cross-browser testing, make sure you have:

- Factifai Agent installed and configured (see [Setting Up a Test Project](/guides/setup-test-project))
- Playwright browser dependencies installed (`npx playwright install --with-deps`)
- Test instructions or files ready to run

## Basic Cross-Browser Testing

### Running Tests on a Specific Browser

To run a test on a specific browser, use the `--browser` flag:

```bash
# Run on Firefox
factifai-agent run --browser firefox "Navigate to example.com and verify the page title"

# Run on WebKit (Safari)
factifai-agent run --browser webkit "Navigate to example.com and verify the page title"

# Run on Chromium (default)
factifai-agent run --browser chromium "Navigate to example.com and verify the page title"
```

### Running the Same Test Across Multiple Browsers

To run the same test across multiple browsers, you'll need to execute the command multiple times:

```bash
# Create a script to run tests across browsers
echo '#!/bin/bash
factifai-agent run --browser chromium --file tests/my-test.txt --report-dir=./reports/chromium
factifai-agent run --browser firefox --file tests/my-test.txt --report-dir=./reports/firefox
factifai-agent run --browser webkit --file tests/my-test.txt --report-dir=./reports/webkit
' > run-cross-browser.sh

# Make it executable
chmod +x run-cross-browser.sh

# Run the script
./run-cross-browser.sh
```

## Advanced Cross-Browser Testing

### Browser-Specific Test Instructions

Sometimes you may need to handle browser-specific behaviors in your test instructions:

```
**Objective:** Test responsive design across browsers

**Test Steps:**

1. **Navigate to our-website.com**
   * **Expected:** Homepage loads

2. **Resize browser window to mobile dimensions**
   * **Action:** Set viewport to 375x667
   * **Expected:** Mobile menu icon appears
   * **Note for WebKit:** Look for the menu icon in the top-right corner
   * **Note for Firefox/Chromium:** Look for the menu icon in the top-left corner

3. **Click the mobile menu icon**
   * **Expected:** Mobile navigation menu opens
```

When running these tests, Factifai Agent's LLM will interpret the browser-specific notes and adjust its actions accordingly.

### Setting Browser-Specific Options

You can set browser-specific options using environment variables or configuration files:

```bash
# Set viewport size for WebKit tests
WEBKIT_VIEWPORT_WIDTH=1024 WEBKIT_VIEWPORT_HEIGHT=768 factifai-agent run --browser webkit "..."
```

### Handling Browser Differences in Test Reports

When analyzing test reports from different browsers, look for:

- **Rendering differences**: Compare screenshots to spot visual inconsistencies
- **Timing differences**: Note if certain operations are slower in specific browsers
- **Error patterns**: Identify if certain errors only occur in specific browsers

## Parallel Cross-Browser Testing

For faster results, you can run tests on multiple browsers in parallel:

### Using Multiple Terminal Sessions

```bash
# Terminal 1
factifai-agent run --browser chromium --file tests/my-test.txt --report-dir=./reports/chromium

# Terminal 2
factifai-agent run --browser firefox --file tests/my-test.txt --report-dir=./reports/firefox

# Terminal 3
factifai-agent run --browser webkit --file tests/my-test.txt --report-dir=./reports/webkit
```

### Using Node.js for Parallel Execution

Create a file named `run-parallel.js`:

```javascript
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const browsers = ['chromium', 'firefox', 'webkit'];
const testFile = 'tests/my-test.txt';

async function runTests() {
  const promises = browsers.map(browser => {
    const command = `factifai-agent run --browser ${browser} --file ${testFile} --report-dir=./reports/${browser}`;
    console.log(`Starting tests on ${browser}...`);
    return execPromise(command)
      .then(({ stdout }) => {
        console.log(`${browser} tests completed`);
        return { browser, success: true, output: stdout };
      })
      .catch(error => {
        console.error(`${browser} tests failed:`, error.message);
        return { browser, success: false, error: error.message };
      });
  });

  const results = await Promise.all(promises);
  console.log('\nTest Summary:');
  results.forEach(({ browser, success }) => {
    console.log(`${browser}: ${success ? '✅ Passed' : '❌ Failed'}`);
  });
}

runTests();
```

Run it with:

```bash
node run-parallel.js
```

## CI/CD Integration for Cross-Browser Testing

### GitHub Actions Example

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: |
          npm install -g @presidio-dev/factifai-agent
          npx playwright install --with-deps
          
      - name: Configure Factifai Agent
        run: |
          factifai-agent config --set OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          
      - name: Run tests on ${{ matrix.browser }}
        run: |
          factifai-agent run --browser ${{ matrix.browser }} --dir tests --report-dir=./test-reports/${{ matrix.browser }}
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports-${{ matrix.browser }}
          path: ./test-reports/${{ matrix.browser }}
```

See the [CI/CD Integration](/guides/ci-cd-integration) guide for more details on integrating with CI/CD systems.

## Best Practices for Cross-Browser Testing

### Test Selection

- **Prioritize critical user journeys** for cross-browser testing
- Focus on areas with complex UI or JavaScript
- Test forms, interactive elements, and responsive layouts across browsers

### Test Organization

- Group tests by feature rather than by browser
- Use consistent test instructions across browsers when possible
- Document browser-specific workarounds or expectations

### Viewport Testing

Test at different viewport sizes to ensure responsive design works across browsers:

```bash
# Test on mobile viewport
factifai-agent run --browser webkit --viewport-size=375,667 "..."

# Test on tablet viewport
factifai-agent run --browser firefox --viewport-size=768,1024 "..."

# Test on desktop viewport
factifai-agent run --browser chromium --viewport-size=1920,1080 "..."
```

### Screenshot Comparison

Use screenshots to compare visual rendering across browsers:

```bash
# Take screenshots on different browsers
factifai-agent run --browser chromium "Navigate to example.com and take a screenshot"
factifai-agent run --browser firefox "Navigate to example.com and take a screenshot"
factifai-agent run --browser webkit "Navigate to example.com and take a screenshot"
```

### Common Cross-Browser Issues to Test For

- **CSS rendering differences**: Flexbox, Grid, animations
- **Form behavior**: Validation, submission, autofill
- **JavaScript API support**: Check for polyfills or fallbacks
- **Media playback**: Video and audio playback controls
- **Font rendering**: Typography and icon fonts
- **Touch interactions**: Mobile gestures and events

## Troubleshooting Cross-Browser Testing

### Browser Launch Issues

If you encounter issues launching specific browsers:

```bash
# Reinstall browser binaries
npx playwright install --with-deps
```

### WebKit-Specific Issues

WebKit (Safari) often has the most differences from other browsers:

```bash
# Install additional WebKit dependencies on Linux
sudo apt-get install libwoff1 libopus0 libwebp6 libwebpdemux2 libenchant1c2a libgudev-1.0-0 libsecret-1-0 libhyphen0 libgdk-pixbuf2.0-0 libegl1 libnotify4 libxslt1.1 libevent-2.1-7 libgles2 libvpx6
```

### Firefox-Specific Issues

For Firefox-specific issues:

```bash
# Install additional Firefox dependencies on Linux
sudo apt-get install libdbus-glib-1-2 libxt6
```

### Debugging Browser Differences

To debug browser-specific issues:

```bash
# Run with increased verbosity
factifai-agent run --browser firefox --verbose=3 "..."

# Run with browser debugging enabled
factifai-agent run --browser webkit --debug-browser "..."
```

## Next Steps

Now that you understand cross-browser testing with Factifai Agent, you might want to explore:

- [CI/CD Integration](/guides/ci-cd-integration) - Automate cross-browser testing in your CI/CD pipeline
- [Custom Reporting](/guides/custom-reporting) - Create custom reports for cross-browser test results
- [Performance Testing](/guides/performance-testing) - Measure and compare performance across browsers
