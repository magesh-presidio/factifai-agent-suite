# Test Parsing

One of the most powerful features of the Factifai Agent Suite is its ability to transform natural language test instructions into structured, executable test steps. This page explains how the test parsing feature works and how to write effective test instructions.

<video controls autoplay loop muted class="feature-video">
  <source src="../assets/test-parsing-demo.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## How It Works

When you provide a test instruction in plain English, the Factifai Agent uses Large Language Models (LLMs) to:

1. **Analyze the instruction** - The AI reads and understands your natural language description
2. **Identify key actions** - It identifies the specific actions that need to be performed
3. **Structure into steps** - It breaks down the instruction into logical, sequential steps
4. **Add verification points** - It adds appropriate verification steps to ensure the test is meaningful
5. **Generate executable commands** - It translates each step into commands that can be executed by the browser automation engine

## Benefits of AI-Powered Test Parsing

### Accessibility for Non-Technical Team Members

Anyone on your team can write tests, regardless of their technical background. Product managers, QA analysts, and other stakeholders can contribute to test creation without learning complex testing frameworks.

### Reduced Maintenance Burden

Traditional test scripts often break when the UI changes. With natural language tests, the AI can adapt to minor UI changes, reducing the maintenance burden.

### Faster Test Creation

Writing tests in plain English is much faster than writing code. You can create comprehensive test suites in a fraction of the time it would take with traditional testing frameworks.

### Better Collaboration

Natural language tests are easier to review, discuss, and refine as a team. Everyone can understand what's being tested without needing to understand the underlying code.

## Writing Effective Test Instructions

To get the best results from the test parsing feature, follow these guidelines:

### Be Specific and Clear

Provide clear, specific instructions that leave no room for ambiguity. For example:

```
Good: "Navigate to saucedemo.com, login with username 'standard_user' and password 'secret_sauce', then add the first product to the cart"

Not as good: "Go to the website and log in, then add something to the cart"
```

### Include Verification Steps

Mention what should be verified after each action to make your tests more robust:

```
Good: "Click the 'Add to Cart' button for the first product, then verify that the cart icon shows '1' item"

Not as good: "Add the first product to the cart"
```

### Use Natural Language Patterns

The AI understands common natural language patterns, so write your tests as you would explain them to a person:

```
Good: "Fill in the registration form with email 'test@example.com', password 'Test123!', and click the 'Register' button"

Not as good: "email=test@example.com; password=Test123!; click(register_button);"
```

### Specify Waiting Conditions

If a test needs to wait for something to happen, be explicit about it:

```
Good: "Click the 'Submit' button and wait for the confirmation message to appear"

Not as good: "Click the 'Submit' button and check for confirmation"
```

## Example Test Instructions

Here are some examples of effective test instructions:

### E-commerce Flow

```
Navigate to saucedemo.com, login with username 'standard_user' and password 'secret_sauce'.
Add the 'Sauce Labs Backpack' to the cart.
Click on the cart icon in the top right.
Click the 'Checkout' button.
Fill in First Name: 'John', Last Name: 'Doe', Zip Code: '12345'.
Click 'Continue'.
Verify the item name and price are correct on the checkout overview page.
Click 'Finish' and verify the 'Thank you for your order' message appears.
```

### Form Validation

```
Navigate to demoqa.com/text-box.
Fill in the form with Full Name: 'Test User', Email: 'invalid-email', Current Address: '123 Test St', Permanent Address: '456 Perm Ave'.
Click the 'Submit' button.
Verify that an error is shown for the email field.
Change the email to 'test@example.com' and submit again.
Verify that the submitted information appears below the form.
```

### Search Functionality

```
Navigate to duckduckgo.com.
Type 'automated testing tools' in the search box and press Enter.
Wait for the search results to load.
Verify that the results page contains at least 5 search results.
Click on the first search result and verify that a new page loads.
```

## Advanced Features

### Multi-step Test Sequences

The test parser can handle complex, multi-step test sequences with conditional logic:

```
Navigate to an e-commerce site, search for 'laptop', filter by price range $500-$1000, 
sort by customer rating, and add the highest-rated laptop to the cart. 
If a popup appears asking about warranty, select 'No thanks'. 
Proceed to checkout and verify the correct item is in the cart.
```

### Data-Driven Testing

You can include multiple data points in your test instructions:

```
Navigate to the registration page and test the following scenarios:
1. Valid email 'test@example.com' with password 'Valid123!' should succeed
2. Invalid email 'test@' with password 'Valid123!' should show an email error
3. Valid email 'test2@example.com' with password '123' should show a password error
```

## Next Steps

Now that you understand how test parsing works, you might want to explore:

- [Writing Effective Test Cases](../guides/writing-test-cases) - Learn best practices for writing clear, reliable test instructions
- [Live Test Progress](./live-progress) - See how your parsed tests are executed in real-time
- [CLI Reports](./cli-reports) - Learn about the detailed reports generated after test execution
- [Quick Start Guide](../getting-started/quick-start) - Try writing your own test instructions

<style>
.feature-video {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 1rem 0;
}
</style>
