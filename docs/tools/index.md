# Tools

The Factifai Agent Suite includes a collection of tools designed to make automated testing more accessible, efficient, and powerful. This section provides an overview of the available tools and how they can be used together.

## Currently Available Tools

### Factifai Agent

A CLI-first automation tool that allows you to write browser tests in plain English. It translates natural language instructions into precise browser actions using LLMs, executes them through a structured LangGraph workflow, and provides rich terminal visualization of test progress.

[Learn more about Factifai Agent](/tools/factifai-agent/)

Key features:
- Natural language test instructions
- Real-time test execution visualization
- Comprehensive reporting (CLI, HTML, XML)
- Multiple LLM provider support (OpenAI, AWS Bedrock)
- Cross-browser testing

### Playwright Core

A specialized wrapper around Playwright designed specifically for LLMs to control web browsers through a coordinate-based interaction system. Unlike traditional browser automation that relies on complex DOM selectors, this package enables AI models to work with visual coordinates.

[Learn more about Playwright Core](/tools/playwright-core/)

Key features:
- Coordinate-based browser control
- Automatic element detection
- Visual element highlighting
- Session management
- Simplified API that abstracts away Playwright complexity

## How the Tools Work Together

The Factifai Agent Suite is designed with a modular architecture that allows the tools to work together seamlessly:

1. **Factifai Agent** serves as the high-level orchestrator, handling:
   - Natural language parsing
   - Test step generation
   - Execution flow
   - Reporting and visualization

2. **Playwright Core** provides the low-level browser automation capabilities:
   - Browser session management
   - Coordinate-based interactions
   - Element detection
   - Screenshot capture

This separation of concerns allows each tool to focus on its strengths while providing a cohesive experience for users.

## Choosing the Right Tool

### When to Use Factifai Agent

Use Factifai Agent when you want to:

- Write tests in natural language
- Get comprehensive test reports
- Run tests across multiple browsers
- Integrate with CI/CD pipelines
- Visualize test execution in real-time

Factifai Agent is ideal for:
- QA teams looking to make testing more accessible
- Developers who want to quickly create and run tests
- Organizations looking to reduce the maintenance burden of test suites

### When to Use Playwright Core

Use Playwright Core when you want to:

- Build custom automation solutions
- Integrate browser automation into your own applications
- Have more fine-grained control over browser interactions
- Work with visual coordinates instead of DOM selectors

Playwright Core is ideal for:
- Developers building custom testing frameworks
- AI/ML engineers working on browser automation
- Projects that require specialized browser interaction patterns

## Upcoming Tools

We're continuously working on expanding the Factifai Agent Suite with new tools:

### factifai-quest

A CLI tool that intelligently crawls websites and explores them autonomously, navigating through links and pages to build a comprehensive map of the site. It captures screenshots of each discovered page and leverages LLMs to generate detailed documentation, providing valuable insights for test planning and coverage analysis.

### factifai-test-curator

A web-based interface that combines the capabilities of factifai-agent and factifai-quest to create a complete test management solution. It offers targeted website exploration, visual test case editing with before/after screenshots, and an interactive test creation environment where users can refine AI-suggested test suites or create tests from scratch with live browser previews.

## Next Steps

To learn more about each tool:

- [Explore Factifai Agent](/tools/factifai-agent/)
- [Discover Playwright Core](/tools/playwright-core/)
- [Check out the Getting Started guide](/getting-started/)
