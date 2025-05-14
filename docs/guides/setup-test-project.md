# Setting Up a Test Project

This guide will walk you through the process of setting up a test project with the Factifai Agent Suite. By the end, you'll have a fully functional test environment ready for creating and running automated tests.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed on your system
- **npm or pnpm** for package management
- **An OpenAI API key** or **AWS Bedrock credentials** for the AI capabilities

## Step 1: Install Factifai Agent

First, install the Factifai Agent CLI tool globally:

```bash
# Using npm
npm install -g @presidio-dev/factifai-agent

# Using pnpm
pnpm add -g @presidio-dev/factifai-agent
```

## Step 2: Install Playwright Dependencies

Factifai Agent uses Playwright for browser automation. Install the necessary browser dependencies:

```bash
npx playwright install --with-deps
```

This command installs browser binaries for Chromium, Firefox, and WebKit, along with any necessary system dependencies.

## Step 3: Configure API Credentials

Configure your API credentials for the LLM provider you want to use:

### For OpenAI

```bash
factifai-agent config --set OPENAI_API_KEY=your-api-key-here
```

### For AWS Bedrock

```bash
factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key-id
factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-access-key
factifai-agent config --set AWS_DEFAULT_REGION=us-west-2
```

## Step 4: Create a Project Directory

Create a directory for your test project:

```bash
mkdir my-factifai-tests
cd my-factifai-tests
```

## Step 5: Initialize a Package

Initialize a package.json file:

```bash
npm init -y
```

This creates a basic package.json file that you can customize later.

## Step 6: Create a Tests Directory

Create a directory for your test files:

```bash
mkdir tests
```

## Step 7: Create Your First Test File

Create a simple test file to verify your setup:

```bash
touch tests/first-test.txt
```

Open the file in your editor and add a simple test:

```
**Objective:** Verify DuckDuckGo Search

**Test Steps:**

1. **Navigate to duckduckgo.com**
   * **Expected:** DuckDuckGo homepage loads

2. **Search for "automated testing"**
   * **Action:** Type "automated testing" in search box and press Enter
   * **Expected:** Search results for "automated testing" appear

3. **Verify search results**
   * **Expected:** At least 5 search results are displayed
   * **Expected:** The page title contains "automated testing"
```

## Step 8: Run Your First Test

Run your first test using the Factifai Agent CLI:

```bash
# Using OpenAI
factifai-agent --model openai run --file tests/first-test.txt

# Using AWS Bedrock
factifai-agent --model bedrock run --file tests/first-test.txt
```

You should see the test execute in real-time, with the browser opening, navigating to DuckDuckGo, performing the search, and verifying the results.

## Step 9: Review the Test Results

After the test completes, review the results in the terminal. You should see:

- A summary of the test execution
- Details for each step
- Screenshots taken during the test
- Any errors or warnings

## Step 10: Create a Test Script in package.json

Add a test script to your package.json file:

```json
{
  "scripts": {
    "test": "factifai-agent run --file tests/first-test.txt"
  }
}
```

Now you can run your tests using:

```bash
npm test
```

> **Coming Soon:** Configuration file support will be available in a future release, allowing you to set default options like model, browser, timeout, and retry settings.

## Step 12: Create Additional Test Files

Create additional test files for different features or scenarios:

```bash
touch tests/login-test.txt
touch tests/checkout-test.txt
```

Add appropriate test steps to each file.

## Step 13: Organize Your Tests

As your test suite grows, consider organizing your tests into directories:

```bash
mkdir -p tests/e2e
mkdir -p tests/regression
mkdir -p tests/smoke

# Move or create tests in these directories
touch tests/e2e/full-user-journey.txt
touch tests/regression/login-scenarios.txt
touch tests/smoke/critical-paths.txt
```

## Step 14: Set Up a CI/CD Configuration

If you're using a CI/CD system, create a configuration file for it. For example, for GitHub Actions:

```bash
mkdir -p .github/workflows
touch .github/workflows/tests.yml
```

Add the following content to the file:

```yaml
name: Factifai Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm install -g @presidio-dev/factifai-agent
          npx playwright install --with-deps
      - name: Configure Factifai Agent
        run: |
          factifai-agent config --set OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
      - name: Run tests
        run: |
          factifai-agent run --file tests/first-test.txt
```

> **Coming Soon:** Directory-based test running with the `--dir` option will be available in a future release, allowing you to run all tests in a directory.

## Step 15: Create a README

Create a README.md file to document your test project:

```bash
touch README.md
```

Add information about your test project, how to run the tests, and any other relevant details.

## Next Steps

Now that you have set up your test project, you can:

- [Integrate with CI/CD pipelines](/guides/ci-cd-integration)

**Coming Soon:**
- Creating more complex test suites
- Writing effective test instructions
- Cross-browser testing

## Troubleshooting

### Browser Dependencies

If you encounter issues with browser dependencies, try reinstalling them:

```bash
npx playwright install --with-deps
```

### API Key Issues

If you have issues with your API key, verify it's correctly set:

```bash
factifai-agent config --show
```

### Permission Issues

If you encounter permission issues when running tests, make sure you have the necessary permissions for the directories you're using.

### Browser Launch Issues

If the browser fails to launch, check if you have any conflicting browser processes running or if your system has the necessary dependencies installed.
