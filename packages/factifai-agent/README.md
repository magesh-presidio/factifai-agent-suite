# FactifAI Agent

An AI-powered web testing agent built on LangChain and AWS Bedrock Claude.

## Overview

FactifAI Agent is a sophisticated web testing automation tool that combines AWS Bedrock's Claude LLM with Playwright to execute natural language test instructions. It enables automated browser testing without writing complex test code.

## Features

- Execute natural language test instructions
- AI-powered web interaction and verification
- Session-based browser automation
- Detailed test reports with screenshots
- Configurable AWS Bedrock integration

## Installation

```bash
pnpm install
pnpm build
```

## Setup

### Environment Variables

Create a `.env` file in the root directory with your AWS credentials:

```
USE_BEDROCK=true
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
```

Alternatively, you can pass these credentials directly when creating a TestRunner instance.

## Usage

### Basic Usage

```typescript
import { TestRunner } from '@factifai/agent';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Create a test runner
  const runner = new TestRunner();
  
  // Run tests from JSON file
  try {
    const report = await runner.runTestsFromFile('./test-file.json');
    console.log('Test Report:');
    console.log(report);
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

main().catch(console.error);
```

### Test File Format

Create a JSON file with your test instructions:

```json
{
  "testcases": [
    "Navigate to example.com",
    "Verify homepage loads with logo visible",
    "Click 'Products' link in the navigation menu",
    "Verify the products page shows a list of items"
  ]
}
```

## Architecture

- **TestRunner**: Main class for orchestrating test execution
- **BedRockAgentFactory**: Creates and configures the AWS Bedrock Claude agent
- **Tools**: Browser interaction tools (navigation, clicking, typing, etc.)
- **SessionManager**: Manages browser sessions and contexts

## License

ISC
