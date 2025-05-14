# Factifai Agent

Factifai Agent is a powerful CLI tool for AI-driven browser automation testing that integrates seamlessly into development and testing workflows and CI/CD pipelines. Leveraging Large Language Models (LLMs), it interprets natural language test instructions and executes them through a structured, reliable process.

## Overview

Built on LangGraph and Playwright, Factifai Agent enables testers and developers to write test cases in plain English while maintaining precision and reproducibility. The tool provides rich CLI visualization of test progress with real-time feedback, making it ideal for both interactive use and automated testing environments.

## Key Features

- **Natural Language Test Instructions**: Write test cases in plain English
- **LLM-Powered Test Interpretation**: Automatically converts natural language to executable test steps
- **CLI-First Design**: Purpose-built as a command-line tool for both interactive use and automation
- **CI/CD Pipeline Integration**: Easily integrate into GitHub Actions, Jenkins, GitLab CI, and more
- **Rich Progress Visualization**: Beautiful terminal interfaces showing real-time test execution progress
- **Playwright Integration**: Leverages Playwright's robust browser automation capabilities
- **LangGraph Architecture**: Uses a directed state graph for reliable test execution flow
- **Cross-Browser Support**: Works across Chromium, Firefox, and WebKit
- **Detailed Test Reporting**: Generates comprehensive test execution reports
- **Step-by-Step Verification**: Validates each test step against expected outcomes
- **Automatic Retry Mechanism**: Intelligently retries failed steps
- **Multiple LLM Providers**: Supports OpenAI and AWS Bedrock

## Requirements

- Node.js 18+
- Playwright with browsers (must be installed with `npx playwright install --with-deps`)

## Installation

```bash
# Install globally
npm install -g @presidio-dev/factifai-agent

# Install Playwright and dependencies
npx playwright install --with-deps
```

## Quick Start

### With OpenAI

```bash
# Set your API key (only needed once, persists across sessions)
factifai-agent config --set OPENAI_API_KEY=your-api-key-here

# Run your test
factifai-agent --model openai run "Navigate to duckduckgo.com and search 'eagles'"
```

### With AWS Bedrock

```bash
# Set your AWS credentials (only needed once, persists across sessions)
factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key-id
factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-access-key
factifai-agent config --set AWS_DEFAULT_REGION=us-west-2

# Run your test
factifai-agent --model bedrock run "Navigate to duckduckgo.com and search 'eagles'"
```

## Usage Guide

### Commands

#### Test Automation

```bash
# Run with test instructions in the command
factifai-agent --model openai run "Your test instructions"

# Run from a file
factifai-agent --model openai run --file ./examples/test-case.txt

# With custom session ID
factifai-agent --model openai run --session my-test-123 "Your test instruction"
```

#### Configuration Management

```bash
# Show current configuration
factifai-agent config --show

# Set default model provider (persists across sessions)
factifai-agent config --model openai

# Set individual configuration values (persists across sessions)
factifai-agent config --set OPENAI_API_KEY=your-api-key
factifai-agent config --set OPENAI_MODEL=gpt-4.1
```

#### Model Management

```bash
# List all available models
factifai-agent models
```

### Cross-Browser Compatibility Testing

You can run the same test across different browsers to ensure consistent functionality:

```bash
# Test with Firefox
factifai-agent run --browser firefox "Verify that user registration works on our website"

# Test with WebKit (Safari)
factifai-agent run --browser webkit "Verify that user registration works on our website"

# Test with Chromium (default)
factifai-agent run "Verify that user registration works on our website"
```

### Test File Format

Create structured test files for complex scenarios:

```markdown
**Objective:** Search on DuckDuckGo

**Test Steps:**

1. **Navigate to duckduckgo.com**
   * **Expected:** DuckDuckGo homepage loads

2. **Search for "eagles"**
   * **Action:** Type "eagles" in search box and press Enter
   * **Expected:** Search results for "eagles" appear
```

## Configuration

Factifai Agent uses a persistent configuration system that stores settings in `~/.factifai/config.json`. This ensures your settings are remembered across terminal sessions.

### Setting Configuration Values

```bash
# Model selection
factifai-agent config --set MODEL_PROVIDER=openai  # "openai" | "bedrock"
factifai-agent config --set OPENAI_MODEL=gpt-4.1
factifai-agent config --set BEDROCK_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0

# API credentials
factifai-agent config --set OPENAI_API_KEY=your-api-key-here
factifai-agent config --set AWS_DEFAULT_REGION=us-west-2
factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key-id
factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### Viewing Current Configuration

```bash
# Show all configuration values
factifai-agent config --show
```

## Supported Models

| Provider | Configuration | Available Models |
|----------|--------------|-----------------|
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4.1` (default)<br>`gpt-4o` |
| **AWS Bedrock** | `AWS_ACCESS_KEY_ID`<br>`AWS_SECRET_ACCESS_KEY`<br>`AWS_DEFAULT_REGION` | `us.anthropic.claude-3-7-sonnet-20250219-v1:0` (default)<br>`anthropic.claude-3-5-sonnet-20240620-v1:0` |

## Best Practices for Test Creation

### Writing Effective Tests

1. **Create Focused Tests**
   - Keep tests small and focused on single user journeys
   - Test one feature or functionality at a time
   - Break complex workflows into separate test cases
   - Example: ✅ "Check login functionality" instead of ❌ "Verify entire website works"

2. **Use Descriptive Language**
   - Be specific about actions and targets
   - Include element identifiers when possible
   - Use clear, unambiguous instructions
   - Example: ✅ "Type 'standard_user' into the username field" instead of ❌ "enter username"

3. **Include Expected Outcomes**
   - Always specify what success looks like
   - Include explicit verification points
   - Mention what elements or text should appear
   - Example: ✅ "Verify that the account dashboard displays the username" 

4. **Structure Your Test Instructions**
   - Use numbered steps for complex scenarios
   - Group related actions together
   - Include setup and teardown steps when needed
   - Example: ✅ "1. Navigate to login page, 2. Enter credentials, 3. Click submit, 4. Verify dashboard appears"

### Example of Good vs. Poor Test Instructions

#### ❌ Poor Example:
```
Test login at saucedemo site
```

#### ✅ Good Example:
```
Test login functionality on saucedemo.com

1. Navigate to https://www.saucedemo.com
2. Enter "standard_user" in the username field
3. Enter "secret_sauce" in the password field 
4. Click the Login button
5. Verify that:
   - The inventory page loads
   - The shopping cart icon is visible
   - The hamburger menu is available in the top-left corner
```

## Architecture

Factifai Agent employs a robust LangGraph-based architecture:

1. **Preprocessing Node**: Formats and prepares the test instruction
2. **Parsing Node**: Converts natural language to structured test steps
3. **Execution Node**: Performs browser actions via Playwright
4. **Tracking Node**: Monitors test progress and status
5. **Tool Node**: Provides necessary tools for interaction
6. **Report Generation Node**: Creates detailed test results

## Next Steps

- [Installation Guide](/getting-started/installation)
- [Quick Start Guide](/getting-started/quick-start)
- [Test Parsing Feature](/features/test-parsing)
- [Live Test Progress](/features/live-progress)
- [CLI Reports](/features/cli-reports)
- [HTML & XML Reports](/features/html-xml-reports)
