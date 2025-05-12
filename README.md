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

## 🧰 Tools

### Currently Available

| Tool | Package | Description |
|------|---------|-------------|
| **[Factifai Agent](./packages/factifai-agent/)** | [@presidio-dev/factifai-agent](https://www.npmjs.com/package/@presidio-dev/factifai-agent) | CLI tool for AI-driven browser automation testing using natural language instructions |
| **[Playwright Core](./packages/playwright-core/)** | [@presidio-dev/playwright-core](https://www.npmjs.com/package/@presidio-dev/playwright-core) | LLM-optimized wrapper around Playwright providing coordinate-based browser control |

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- pnpm 10.10.0+
- OpenAI API key or AWS Bedrock credentials

### Installation & Development Setup

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

### Running Tests

```bash
# Set your API key (persists across sessions)
factifai-agent config --set OPENAI_API_KEY=your-api-key-here

# Run a browser test using natural language
factifai-agent --model openai run "go to saucedemo.com and login with sample creds on the footer"
```

## 🏗️ Architecture

The Factifai Agent Suite uses a modular architecture built on:

- **pnpm Workspaces**: For efficient monorepo package management
- **TypeScript**: For type safety across the codebase
- **LangGraph**: Providing the AI orchestration layer for complex workflows
- **Playwright**: Handling reliable browser automation with cross-browser support

Each tool in the suite is designed to be used independently or in combination with others, allowing for flexible integration into existing workflows.

### Core Components

1. **Natural Language Processing**: Transforms plain English test instructions into structured, executable steps
2. **Directed Graph Execution**: Uses a state machine approach for reliable test execution flow
3. **Browser Integration**: Provides LLM-friendly coordinates-based interaction with web elements
4. **Persistent Configuration**: Stores API keys and settings across sessions
5. **Rich Visualization**: Terminal-based interfaces for monitoring test progress

## 🔧 Use Cases

### End-to-End Testing

```bash
factifai-agent run "Navigate to our e-commerce site, add a product to cart, proceed to checkout, and verify the order confirmation"
```

### Cross-Browser Compatibility Testing (To be added)

```bash
factifai-agent run --browser firefox "Verify that user registration works on our website"
factifai-agent run --browser webkit "Verify that user registration works on our website"
```

### Regression Testing

```bash
factifai-agent run --file regression-tests.txt
```

### CI/CD Integration

```yaml
# GitHub Actions example
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run browser tests
        run: |
          npm install -g @presidio-dev/factifai-agent
          npx playwright install --with-deps
          factifai-agent config --set OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          factifai-agent run --file tests/e2e-tests.txt
```

## 🤝 Contributing

We welcome contributions to the Factifai Agent Suite! See our [Contributing Guidelines](CODE_OF_CONDUCT.md) for more information on how to get involved.

## 📜 License

MIT © PRESIDIO®
