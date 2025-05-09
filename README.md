# Factifai Suite

<div align="center">
  <br>
  <strong>AI-Powered Browser Automation Testing Suite</strong>
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/maintained%20with-pnpm-cc00ff.svg)](https://pnpm.io/)

## What is Factifai Suite?

Factifai Suite is a monorepo of packages that together form an AI-powered browser testing ecosystem. It leverages Large Language Models (LLMs) to interpret natural language test instructions and execute them through browser automation.

## Packages

This monorepo contains the following packages:

- **[factifai-agent](./packages/factifai-agent/)**: CLI tool that processes natural language test instructions and executes them via Playwright.
- **[playwright-core](./packages/playwright-core/)**: A wrapper around Playwright providing enhanced browser automation capabilities.

## How it Works

The packages work together in a layered architecture:

1. **playwright-core** handles the low-level browser automation
2. **factifai-agent** utilizes LLMs to process natural language instructions and orchestrates test execution via playwright-core

The test flow follows these steps:
- User provides natural language test instructions
- factifai-agent processes these instructions through a LangGraph pipeline
- Browser actions are executed via playwright-core
- Test results and reports are generated

## Quick Setup

```bash
# Clone the repository
git clone https://github.com/presidio-oss/factifai-agent-suite.git
cd factifai-suite

# Install dependencies
pnpm install

# Build all packages
pnpm -r build
```

## Development Commands

```bash
# Build all packages
pnpm -r build

# Build a specific package
pnpm --filter @presidio-dev/factifai-agent build

# Run tests
pnpm -r test

# Run a specific package's script
pnpm --filter @presidio-dev/factifai-agent start
```

## Prerequisites

- Node.js 16+
- pnpm

## Usage

For detailed usage instructions, refer to the individual package READMEs:
- [factifai-agent usage](./packages/factifai-agent/README.md)
- [playwright-core usage](./packages/playwright-core/README.md)

## Roadmap

### Current Components

✅ **factifai-agent**: CLI tool for natural language test execution
✅ **playwright-core**: Enhanced browser automation wrapper

### Upcoming Components

🚧 **crawler-agent**: Autonomous web discovery and mapping tool
- Site exploration and structure analysis
- API endpoint documentation
- Test path suggestion

🚧 **test-curator**: Visual test creation and management
- Test workbench with browser preview
- Visual test editing
- Framework export

## License

MIT © PRESIDIO®
