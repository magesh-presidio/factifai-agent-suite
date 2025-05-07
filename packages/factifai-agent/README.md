# @presidio-dev/factifai-agent

A command-line interface for browser automation testing powered by LLMs.

## Installation

```bash
npm install -g @presidio-dev/factifai-agent
```

## Quick Start

```bash
# Run with OpenAI model
factifai-agent --model openai run "Navigate to duckduckgo.com and search 'eagles' and verify search results are shown"

# Run with AWS Bedrock model
factifai-agent --model bedrock run "Navigate to duckduckgo.com and search 'eagles' and verify search results are shown"

# Run from a file
factifai-agent --model openai run --file ./examples/duckduckgo-test.txt
```

## Commands

### Run Command

Run browser automation tasks:

```bash
# Basic usage (must specify model provider)
factifai-agent --model openai run "Your test instructions"

# Run from a file
factifai-agent --model bedrock run --file ./examples/test-case-file.txt

# With custom session ID
factifai-agent --model openai run --session my-test-123 "Your test instruction"
```

### Config Command

Configure settings and view current configuration:

```bash
# Show current configuration
factifai-agent config --show

# Set model provider for the current session
factifai-agent config --model openai

# Set a configuration value
factifai-agent config --set KEY=value
```

### Models Command

List and manage available models:

```bash
# List all available models and their status
factifai-agent models
```

## Model Providers

Factifai supports multiple LLM providers:

1. **openai** - OpenAI models
   - Required env: `OPENAI_API_KEY`
   - Default model: `gpt-4.1`

2. **bedrock** - AWS Bedrock models
   - Required env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`
   - Default model: `us.anthropic.claude-3-7-sonnet-20250219-v1:0`

## Recommended Test File Format (Example)

```markdown
**Objective:** Verify the Google homepage loads correctly.

**Test Steps & Observations:**

1. **Step 1: Navigate to google.com**
   * **Action:** Enter "google.com" in the browser's address bar and press Enter.
   * **Expected Result:** The Google homepage should load.

2. **Step 2: Verify search box is present**
   * **Action:** Check if the search input box is displayed on the page.
   * **Expected Result:** The search box should be visible and functional.
```

## Environment Variables

Set environment variables for configuring API keys and models:

```
export MODEL_PROVIDER=openai #"openai" | "bedrock"
export OPENAI_MODEL=gpt-4.1
export BEDROCK_MODEL=us.anthropic.claude-3-7-sonnet-20250219-v1:0

export OPENAI_API_KEY=your-api-key-here

export AWS_DEFAULT_REGION=us-west-2
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

## Requirements

- Node.js 16 or higher
