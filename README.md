<div align="center">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
  <img src="https://img.shields.io/badge/pnpm-10.10.0-orange?logo=pnpm" alt="pnpm" />
  <img src="https://img.shields.io/github/issues/presidio-oss/factifai-agent-suite" alt="Issues" />
  <img src="https://img.shields.io/github/stars/presidio-oss/factifai-agent-suite" alt="Stars" />
  <img src="https://img.shields.io/github/forks/presidio-oss/factifai-agent-suite" alt="Forks" />
</div>
<br />
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/images/logo/hai-build-dark-logo.png">
    <source media="(prefers-color-scheme: light)" srcset="assets/images/logo/hai-build-light-logo.png">
    <img alt="HAI Logo" src="assets/images/logo/hai-build-white-bg.png" height="auto">
  </picture>
</div>
<br />

<div align="center">
  <em>Automate testing through AI-powered computer control.<br>
  From manual steps to automated tests in minutes.</em>
</div>
<br>

# Factifai Agent Suite

**AI-powered testing tools for modern development workflows**

The Factifai Agent Suite provides a collection of AI-powered tools designed to accelerate and enhance testing processes across various development workflows. By leveraging Large Language Models (LLMs), the suite enables developers and QA teams to create, execute, and maintain tests using natural language, making testing more accessible, maintainable, and efficient.

![Demo](assets/images/gifs/Demo.gif)

## 📑 Table of Contents

- [Overview](#-overview)
- [Features in Action](#-features-in-action)
  - [From Plain English to Executable Steps](#-from-plain-english-to-executable-steps)
  - [Real-Time Test Execution Visualization](#-real-time-test-execution-visualization)
  - [Instant, Detailed Test Results](#-instant-detailed-test-results)
  - [Professional Reports for Teams & CI/CD](#-professional-reports-for-teams--cicd)
- [Tools](#-tools)
  - [Currently Available](#currently-available)
  - [What's Next?](#whats-next)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Quick Start Examples](#quick-start-examples)
  - [Development Setup](#development-setup)
- [Use Cases](#-use-cases)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [License](#-license)
- [Code of Conduct](#-code-of-conduct)
- [Contact](#-contact)

## 🔍 Overview

Software testing has traditionally required specialized expertise and considerable time investment. The Factifai Agent Suite reimagines this process by allowing tests to be defined in plain English, automatically executed with precision, and seamlessly integrated into modern CI/CD pipelines.

Our tools are designed for developers, QA engineers, and teams who want to:

- **Accelerate testing workflows** without sacrificing quality or coverage
- **Reduce the complexity** of maintaining test suites 
- **Make testing accessible** to team members without specialized testing expertise
- **Integrate AI-powered testing** into existing development processes and pipelines

## ✨ Features in Action

### 🧠 From Plain English to Executable Steps
Watch the magic happen as your natural language transforms into a structured test plan! The AI breaks down complex instructions into precise, organized steps that are ready for execution.

![Test Parsing](assets/images/gifs/test-parsing.gif)

### 🔄 Real-Time Test Execution Visualization
Experience the satisfaction of seeing your tests run live! The intuitive CLI interface shows you exactly what's happening at each moment, making debugging and monitoring a breeze.

![Live Test Progress](assets/images/gifs/live-test-progress.gif)

### 📊 Instant, Detailed Test Results
No more digging through logs! Get comprehensive, beautifully formatted test results right in your terminal the moment execution completes.

![CLI Test Reports](assets/images/gifs/test-report-cli.gif)

### 📑 Professional Reports for Teams & CI/CD
Seamlessly integrate with your workflow! Generate polished HTML reports for team sharing and structured XML outputs for your CI/CD pipelines.

![HTML & XML Reports](assets/images/gifs/test-report.gif)

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

*Interested in contributing to these tools? Check out our [Contributing Guidelines](CONTRIBUTING.md) or open an issue to discuss your ideas!*

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
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

### CI/CD Integration
Automate testing in CI/CD pipelines with natural language test suites that non-technical team members can create and maintain. Run multiple tests in parallel during deployment, with the AI handling browser navigation and verification steps, providing comprehensive test coverage without complex scripting.

### Cross-Browser Compatibility Testing
Verify that your application works consistently across different browsers with identical natural language test cases. Run the same test instructions on Chrome, Firefox, and Safari simultaneously, leveraging parallel execution to dramatically reduce testing time while catching browser-specific inconsistencies.

### End-to-End Testing
Validate complete user journeys using natural language instructions - simply describe what you want to test in plain English. The AI autonomously navigates through complex flows like checkout processes or user registration, handling UI interactions and validations without needing to write selectors or code.

### Regression Testing
Maintain a library of human-readable test files that anyone on the team can understand and update. When code changes, the AI intelligently adapts to UI changes and new elements, reducing maintenance overhead while still reliably catching regressions in functionality.

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

We welcome contributions to the Factifai Agent Suite! See our [Contributing Guidelines](./CONTRIBUTING.md) for more information on how to get involved.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📜 Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectable.

## 📧 Contact

For questions or feedback, please contact us at [hai-feedback@presidio.com](mailto:hai-feedback@presidio.com).
