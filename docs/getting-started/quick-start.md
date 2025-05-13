# Quick Start Guide

This guide will help you run your first tests with the Factifai Agent Suite. We'll cover basic examples using both OpenAI and AWS Bedrock models.

## Prerequisites

Before you begin, make sure you have:

1. [Installed the Factifai Agent Suite](/getting-started/installation)
2. [Configured your API keys](/getting-started/installation#configuring-api-keys) (OpenAI or AWS Bedrock)
3. [Installed Playwright dependencies](/getting-started/installation#installing-playwright-dependencies)

## Running Your First Test with OpenAI

If you've configured your OpenAI API key, you can run a simple test like this:

```bash
# Run a test using natural language
factifai-agent --model openai run "Navigate to duckduckgo.com and search for 'testing automation'"
```

This command will:
1. Launch a browser
2. Navigate to DuckDuckGo
3. Enter "testing automation" in the search box
4. Submit the search
5. Wait for the results to load
6. Generate a report of the test execution

## Running Your First Test with AWS Bedrock

If you've configured your AWS credentials, you can run a test using AWS Bedrock models:

```bash
# Run a test using natural language
factifai-agent --model bedrock run "Navigate to saucedemo.com, login with standard_user/secret_sauce, and add the first product to cart"
```

This command will:
1. Launch a browser
2. Navigate to the Sauce Demo website
3. Enter the username and password
4. Click the login button
5. Add the first product to the cart
6. Generate a report of the test execution

## Understanding the Output

When you run a test, you'll see real-time progress in your terminal:

1. **Test Parsing**: The AI breaks down your natural language instructions into discrete steps
2. **Test Execution**: Each step is executed in the browser with visual feedback
3. **Test Results**: A summary of the test execution is displayed in the terminal
4. **Report Generation**: HTML and XML reports are generated for documentation and CI/CD integration

## Example Test Scenarios

Here are some more examples of tests you can run:

### E-commerce Flow

```bash
factifai-agent run "Navigate to saucedemo.com, login with standard_user/secret_sauce, add all products to cart, go to checkout, fill in First Name: John, Last Name: Doe, Zip: 12345, and complete the purchase"
```

### Form Validation

```bash
factifai-agent run "Navigate to demoqa.com/text-box, fill in the form with name 'Test User', email 'test@example.com', current address '123 Test St', permanent address '456 Perm Ave', and submit the form. Verify the submitted information appears below the form."
```

### Cross-browser Testing

```bash
factifai-agent --browser firefox run "Navigate to whatismybrowser.com and take a screenshot"
```

## Next Steps

Now that you've run your first tests, you can:

- [Explore the features](/features/) in more detail
- Learn about [test parsing](/features/test-parsing) and how to write effective test instructions
- Learn [best practices for writing test cases](/guides/writing-test-cases) to get the most reliable results
- Check out the [guides](/guides/) for more advanced usage
- Learn how to [integrate with CI/CD pipelines](/guides/ci-cd-integration)

::: tip
Remember, you can write tests in plain English! The more descriptive your instructions, the better the AI can understand what you want to test.
:::
