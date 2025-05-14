# Writing Effective Test Cases

This guide provides best practices and examples for writing effective test cases with the Factifai Agent Suite. Since Factifai uses natural language processing to interpret your test instructions, the way you write your test cases significantly impacts their execution quality and reliability.

## Understanding How Factifai Interprets Test Cases

Factifai Agent uses Large Language Models (LLMs) to interpret your natural language instructions and convert them into executable steps. Understanding this process helps you write more effective test cases:

1. **Parsing** - The AI analyzes your instructions to identify actions, targets, and expected outcomes
2. **Step Identification** - It breaks down complex instructions into discrete steps
3. **Element Recognition** - It determines how to locate and interact with UI elements
4. **Verification Points** - It identifies what needs to be verified after actions

## Key Principles for Effective Test Cases

### 1. Be Specific and Clear

Provide clear, unambiguous instructions that leave no room for interpretation:

#### Good Example:
```
Navigate to saucedemo.com, enter username "standard_user" and password "secret_sauce" in their respective fields, then click the Login button.
```

#### Poor Example:
```
Go to the website and log in.
```

### 2. Include Verification Points

Always specify what should be verified after actions:

#### Good Example:
```
Click the "Add to Cart" button for the Sauce Labs Backpack, then verify that the cart icon shows "1" item.
```

#### Poor Example:
```
Add the product to the cart.
```

### 3. Use Descriptive Element Identifiers

Describe UI elements clearly so the AI can identify them:

#### Good Example:
```
Click the blue "Checkout" button at the bottom of the cart page.
```

#### Poor Example:
```
Click checkout.
```

### 4. Structure Complex Flows Logically

Break down complex workflows into clear, sequential steps:

#### Good Example:
```
1. Navigate to saucedemo.com
2. Login with username "standard_user" and password "secret_sauce"
3. Add the Sauce Labs Backpack to the cart
4. Navigate to the cart page
5. Click the Checkout button
6. Fill in First Name: "John", Last Name: "Doe", Zip Code: "12345"
7. Click Continue
8. Verify the item name and price on the checkout overview page
9. Click Finish
10. Verify the "Thank you for your order" message appears
```

#### Poor Example:
```
Test the checkout process on saucedemo.com
```

### 5. Specify Wait Conditions When Needed

Explicitly mention when the test should wait for something to happen:

#### Good Example:
```
Click the "Submit" button and wait for the confirmation message to appear.
```

#### Poor Example:
```
Click submit and check for confirmation.
```

## Test Case Templates

### Basic Navigation and Verification

```
**Objective:** Verify [feature/functionality]

**Test Steps:**
1. **Navigate to [URL]**
   * **Expected:** [Page/element] loads successfully

2. **[Action to perform]**
   * **Action:** [Detailed description of the action]
   * **Expected:** [Expected outcome]

3. **Verify [condition]**
   * **Expected:** [Detailed description of what should be verified]
```

### Login Flow

```
**Objective:** Verify user login functionality

**Test Steps:**
1. **Navigate to [login page URL]**
   * **Expected:** Login page loads with username and password fields visible

2. **Enter credentials**
   * **Action:** Enter "[username]" in the username field
   * **Action:** Enter "[password]" in the password field
   * **Action:** Click the Login button
   * **Expected:** User is redirected to the dashboard/home page

3. **Verify successful login**
   * **Expected:** User's name/account information is displayed
   * **Expected:** Logout option is available
```

### Form Submission

```
**Objective:** Verify form submission functionality

**Test Steps:**
1. **Navigate to [form page URL]**
   * **Expected:** Form loads with all required fields

2. **Fill in form fields**
   * **Action:** Enter "[value1]" in [field1]
   * **Action:** Enter "[value2]" in [field2]
   * **Action:** Select "[option]" from [dropdown]
   * **Action:** Check the [checkbox] option
   * **Expected:** All fields accept input correctly

3. **Submit the form**
   * **Action:** Click the Submit button
   * **Expected:** Form submission is processed

4. **Verify submission result**
   * **Expected:** Success message "[expected message]" is displayed
   * **Expected:** Submitted data is correctly reflected in [location]
```

## Examples for Different Testing Scenarios

### E-commerce Product Search and Filter

```
**Objective:** Verify product search and filter functionality

**Test Steps:**
1. **Navigate to example-shop.com**
   * **Expected:** Homepage loads successfully

2. **Search for a product**
   * **Action:** Enter "wireless headphones" in the search box and press Enter
   * **Expected:** Search results page shows products related to wireless headphones

3. **Apply price filter**
   * **Action:** Click on the "Price" filter dropdown
   * **Action:** Select the "$50-$100" price range
   * **Expected:** Results are filtered to show only products in the $50-$100 range

4. **Sort results**
   * **Action:** Click on the "Sort by" dropdown
   * **Action:** Select "Customer Rating"
   * **Expected:** Products are sorted by customer rating from highest to lowest

5. **Verify filter functionality**
   * **Expected:** All displayed products are wireless headphones
   * **Expected:** All displayed products have prices between $50 and $100
   * **Expected:** Products are sorted by customer rating
```

### Form Validation Testing

```
**Objective:** Verify form validation for a registration form

**Test Steps:**
1. **Navigate to example.com/register**
   * **Expected:** Registration form loads with all required fields

2. **Test empty submission**
   * **Action:** Leave all fields empty and click the Register button
   * **Expected:** Form shows validation errors for required fields

3. **Test invalid email format**
   * **Action:** Enter "John" in the Name field
   * **Action:** Enter "invalid-email" in the Email field
   * **Action:** Enter "Password123!" in the Password field
   * **Action:** Click the Register button
   * **Expected:** Form shows validation error for the email field

4. **Test password strength requirements**
   * **Action:** Enter "John" in the Name field
   * **Action:** Enter "john@example.com" in the Email field
   * **Action:** Enter "weak" in the Password field
   * **Action:** Click the Register button
   * **Expected:** Form shows validation error for password strength

5. **Test successful submission**
   * **Action:** Enter "John" in the Name field
   * **Action:** Enter "john@example.com" in the Email field
   * **Action:** Enter "StrongPassword123!" in the Password field
   * **Action:** Click the Register button
   * **Expected:** Registration is successful
   * **Expected:** Confirmation message or redirect to login page occurs
```

### Responsive Design Testing

```
**Objective:** Verify responsive behavior of a website

**Test Steps:**
1. **Navigate to example.com**
   * **Expected:** Website loads successfully

2. **Test desktop layout**
   * **Action:** Set viewport to 1920x1080
   * **Expected:** Navigation menu is displayed horizontally
   * **Expected:** All content is properly aligned and visible

3. **Test tablet layout**
   * **Action:** Set viewport to 768x1024
   * **Expected:** Navigation may collapse into a hamburger menu
   * **Expected:** Content adjusts to fit the narrower screen
   * **Expected:** No horizontal scrolling is required

4. **Test mobile layout**
   * **Action:** Set viewport to 375x667
   * **Expected:** Navigation is collapsed into a hamburger menu
   * **Expected:** Content is stacked vertically
   * **Expected:** Text is readable without zooming
   * **Expected:** All interactive elements are easily tappable
```

## Common Challenges and Solutions

### Challenge: Element Not Found

If Factifai has trouble finding elements, be more descriptive:

#### Solution:
```
Click the "Add to Cart" button (blue button with shopping cart icon) below the product description.
```

### Challenge: Timing Issues

If actions are happening too quickly or slowly:

#### Solution:
```
Click the "Submit" button and wait up to 10 seconds for the confirmation message to appear.
```

### Challenge: Dynamic Content

For pages with dynamic content:

#### Solution:
```
Search for "headphones" and verify that at least 3 product results appear on the page.
```

### Challenge: Complex Verification

For complex verification needs:

#### Solution:
```
After submitting the form, verify that:
1. A success message appears at the top of the page
2. The user's name appears in the account section
3. A confirmation email is sent to the user's email address
```

## Best Practices for Test Organization

### Group Related Tests

Organize related tests together for better maintainability:

```
**Test Suite: User Authentication**

**Test Case 1: Successful Login**
[Test steps...]

**Test Case 2: Failed Login - Incorrect Password**
[Test steps...]

**Test Case 3: Failed Login - User Not Found**
[Test steps...]

**Test Case 4: Password Reset**
[Test steps...]
```

### Use Consistent Formatting

Maintain consistent formatting across all test cases:

```
**Objective:** [Clear statement of what is being tested]

**Preconditions:** [Any required setup or conditions]

**Test Steps:**
1. **[Action description]**
   * **Action:** [Detailed action]
   * **Expected:** [Expected outcome]

2. **[Next action description]**
   * **Action:** [Detailed action]
   * **Expected:** [Expected outcome]
```

### Include Test Data

Clearly specify test data to make tests more reproducible:

```
**Test Data:**
- Username: test_user_123
- Password: Test@123
- Product ID: PRD-12345
- Search Term: "wireless earbuds"
```

## Troubleshooting Tips

If your test cases aren't executing as expected, try these troubleshooting tips:

1. **Be More Explicit** - Add more details about elements and actions
2. **Add Verification Points** - Ensure each action has a clear expected outcome
3. **Break Down Complex Steps** - Split complex instructions into smaller, simpler steps
4. **Use Descriptive Element Identifiers** - Include text, position, or appearance details
5. **Add Wait Conditions** - Explicitly state when to wait for elements or state changes

## Next Steps

Now that you understand how to write effective test cases, you might want to explore:

- [Setting Up a Test Project](/guides/setup-test-project) - Create a structured test project
- [CI/CD Integration](/guides/ci-cd-integration) - Integrate your tests with CI/CD pipelines
- [Test Parsing](/features/test-parsing) - Learn more about how Factifai parses your test instructions
