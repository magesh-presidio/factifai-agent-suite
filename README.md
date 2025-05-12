# Factifai Agent Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![pnpm](https://img.shields.io/badge/pnpm-10.10.0-orange?logo=pnpm)
![Node.js](https://img.shields.io/badge/Node.js-16+-green?logo=node.js)

**AI-powered testing tools for modern development workflows**

The Factifai Agent Suite provides a collection of AI-powered tools designed to accelerate and enhance testing processes across various development workflows. By leveraging Large Language Models (LLMs), the suite enables developers and QA teams to create, execute, and maintain tests using natural language, making testing more accessible, maintainable, and efficient.

## 🔍 Overview

Software testing has traditionally required specialized expertise and considerable time investment. The Factifai Agent Suite reimagines this process by allowing tests to be defined in plain English, automatically executed with precision, and seamlessly integrated into modern CI/CD pipelines.

Our tools are designed for developers, QA engineers, and teams who want to:

- **Accelerate testing workflows** without sacrificing quality or coverage
- **Reduce the complexity** of maintaining test suites 
- **Make testing accessible** to team members without specialized testing expertise
- **Integrate AI-powered testing** into existing development processes and pipelines

## 🎬 Demo

![Demo Video](./assets/Demo.mp4)

## 🧰 Tools

### Currently Available

| Tool | Package | Description |
|------|---------|-------------|
| **[Factifai Agent](./packages/factifai-agent/)** | [@presidio-dev/factifai-agent](https://www.npmjs.com/package/@presidio-dev/factifai-agent) | CLI tool for AI-driven browser automation testing using natural language instructions ([documentation](./packages/factifai-agent/README.md)) |
| **[Playwright Core](./packages/playwright-core/)** | [@presidio-dev/playwright-core](https://www.npmjs.com/package/@presidio-dev/playwright-core) | LLM-optimized wrapper around Playwright providing coordinate-based browser control ([documentation](./packages/playwright-core/README.md)) |

#### Factifai Agent

A CLI-first automation tool that allows you to write browser tests in plain English. It translates natural language instructions into precise browser actions using LLMs, executes them through a structured LangGraph workflow, and provides rich terminal visualization of test progress. The agent supports multiple LLM providers (OpenAI and AWS Bedrock), cross-browser testing, and seamless CI/CD integration, making automated testing more accessible to team members without specialized testing expertise.

📚 **[View Full Documentation](./packages/factifai-agent/README.md)** for detailed usage instructions, configuration options, and best practices.

#### Playwright Core

A specialized wrapper around Playwright designed specifically for LLMs to control web browsers through a coordinate-based interaction system. Unlike traditional browser automation that relies on complex DOM selectors, this package enables AI models to work with visual coordinates, automatically identifying interactive elements and providing enhanced debugging capabilities. It offers features like session management, automatic element detection, visual element highlighting, and a simplified API that abstracts away Playwright complexity.

📚 **[View Full Documentation](./packages/playwright-core/README.md)** for detailed API reference, integration options, and advanced usage examples.

### What's Next?

- **factifai-quest**: A CLI tool that intelligently crawls websites and explores them autonomously, navigating through links and pages to build a comprehensive map of the site. It captures screenshots of each discovered page and leverages LLMs to generate detailed documentation, providing valuable insights for test planning and coverage analysis.

- **factifai-test-curator**: A web-based interface that combines the capabilities of factifai-agent and factifai-quest to create a complete test management solution. It offers targeted website exploration, visual test case editing with before/after screenshots, and an interactive test creation environment where users can refine AI-suggested test suites or create tests from scratch with live browser previews.

*Interested in contributing to these tools? Check out our [Contributing Guidelines](CODE_OF_CONDUCT.md) or open an issue to discuss your ideas!*

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- pnpm 10.10.0+
- OpenAI API key or AWS Bedrock credentials

### Installation

```bash
# Install factifai-agent globally
npm install -g @presidio-dev/factifai-agent

# Install Playwright dependencies (required)
npx playwright install --with-deps

# Install playwright-core (if using separately)
npm install @presidio-dev/playwright-core
```

### Quick Start Examples

#### Factifai Agent with AWS Bedrock

```bash
# Configure AWS credentials (only needed once)
factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key-id
factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-access-key
factifai-agent config --set AWS_DEFAULT_REGION=us-west-2

# Run a test using natural language
factifai-agent --model bedrock run "Navigate to saucedemo.com, login with standard_user/secret_sauce, and add the first product to cart"
```

#### Factifai Agent with OpenAI

```bash
# Configure OpenAI API key (only needed once)
factifai-agent config --set OPENAI_API_KEY=your-api-key-here

# Run a test using natural language
factifai-agent --model openai run "Navigate to duckduckgo.com and search for 'testing automation'"
```

#### Playwright Core Integration

```javascript
import { BrowserService, navigate, click, type } from '@presidio-dev/playwright-core';

const run = async () => {
  const sessionId = `test-${Date.now()}`;
  
  // Navigate to a website
  await navigate(sessionId, 'https://example.com');
  
  // Interact with page elements using coordinates
  await click(sessionId, { x: 150, y: 200 });
  await type(sessionId, 'Hello, World!');
  
  // Take a screenshot with highlighted elements
  await BrowserService.getInstance().takeMarkedScreenshot(sessionId);
  
  // Clean up
  await BrowserService.getInstance().closePage(sessionId);
};

run();
```

### Development Setup

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

## 🔧 Use Cases

### End-to-End Testing
Validate complete user journeys using natural language instructions - simply describe what you want to test in plain English. The AI autonomously navigates through complex flows like checkout processes or user registration, handling UI interactions and validations without needing to write selectors or code.

### Cross-Browser Compatibility Testing
Verify that your application works consistently across different browsers with identical natural language test cases. Run the same test instructions on Chrome, Firefox, and Safari simultaneously, leveraging parallel execution to dramatically reduce testing time while catching browser-specific inconsistencies.

### Regression Testing
Maintain a library of human-readable test files that anyone on the team can understand and update. When code changes, the AI intelligently adapts to UI changes and new elements, reducing maintenance overhead while still reliably catching regressions in functionality.

### CI/CD Integration
Automate testing in CI/CD pipelines with natural language test suites that non-technical team members can create and maintain. Run multiple tests in parallel during deployment, with the AI handling browser navigation and verification steps, providing comprehensive test coverage without complex scripting.

## 🏗️ Architecture

The Factifai Agent Suite follows a modular, pipeline-based architecture that transforms natural language test instructions into precise browser interactions:

### Key Components

- **Factifai Agent**: Orchestrates the end-to-end testing process
  - **LLM Orchestration Layer** (LangGraph): Manages the AI workflow for parsing instructions
  - **Node Pipeline**: Preprocessing → Parsing → Execution → Tracking → Reporting
  - **Configuration System**: Handles API keys and settings with persistent storage

- **Playwright Core**: Provides the browser automation foundation for factifai-agent
  - **Browser Service**: Manages browser sessions and page interactions
  - **Visual Element Detection**: Identifies clickable elements without requiring selectors
  - **Coordinate-Based Interaction**: Uses spatial positioning instead of DOM selectors

The architecture decouples natural language understanding from browser automation, allowing each component to evolve independently while maintaining compatibility. This also enables the tools to be used separately or together, depending on the specific testing needs.

## 🤝 Contributing

We welcome contributions to the Factifai Agent Suite! See our [Contributing Guidelines](CODE_OF_CONDUCT.md) for more information on how to get involved.

## 📜 License

MIT © PRESIDIO®
