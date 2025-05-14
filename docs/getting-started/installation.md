# Installation

This guide will walk you through the process of installing the Factifai Agent Suite and its dependencies.

## Prerequisites

Before installing the Factifai Agent Suite, ensure you have the following prerequisites:

- **Node.js 18+** - The runtime environment for JavaScript
- **pnpm 10.10.0+** - The package manager used by Factifai Agent Suite
- **OpenAI API key** or **AWS Bedrock credentials** - Required for the AI capabilities

## Installing Factifai Agent

The Factifai Agent is the main CLI tool that you'll use to run tests. You can install it globally using npm:

```bash
# Install factifai-agent globally
npm install -g @presidio-dev/factifai-agent
```

## Installing Playwright Dependencies

Factifai Agent uses Playwright under the hood for browser automation. You'll need to install the Playwright dependencies:

```bash
# Install Playwright dependencies (required)
npx playwright install --with-deps
```

This command installs browser binaries for Chromium, Firefox, and WebKit, along with any necessary system dependencies.

## Installing Playwright Core (Optional)

If you want to use the Playwright Core package separately, you can install it using npm:

```bash
# Install playwright-core
npm install @presidio-dev/playwright-core
```

## Configuring API Keys

### OpenAI

To use Factifai Agent with OpenAI models, you need to configure your API key:

```bash
# Configure OpenAI API key (only needed once)
factifai-agent config --set OPENAI_API_KEY=your-api-key-here
```

### AWS Bedrock

To use Factifai Agent with AWS Bedrock models, you need to configure your AWS credentials:

```bash
# Configure AWS credentials (only needed once)
factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key-id
factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-access-key
factifai-agent config --set AWS_DEFAULT_REGION=us-west-2
```

## Development Setup

If you want to contribute to the Factifai Agent Suite or run it from source, follow these steps:

```bash
# Clone the repository
git clone https://github.com/presidio-oss/factifai-agent-suite.git
cd factifai-agent-suite

# Install dependencies
pnpm i

# Build all packages
pnpm -r build

# Install Playwright dependencies (required)
npx playwright install --with-deps

# Create a global symlink for factifai-agent
cd packages/factifai-agent
pnpm link --global
```

## Verifying Installation

To verify that the installation was successful, run:

```bash
factifai-agent --version
```

This should display the version of the Factifai Agent that you have installed.

## Next Steps

Now that you have installed the Factifai Agent Suite, you can proceed to the [Quick Start Guide](/getting-started/quick-start) to run your first test.
