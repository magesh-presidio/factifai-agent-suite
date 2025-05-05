import dotenv from "dotenv";
import { browserAutomationGraph } from "./core/graph/graph";
import boxen from "boxen";
import chalk from "chalk";

dotenv.config();

/**
 * Displays the FACTIFAI logo in a minimal, pretty box
 */
export const displayFactifaiLogo = (): void => {
  const logo = `█▀▀ ▄▀█ █▀▀ ▀█▀ █ █▀▀ ▄▀█ █
█▀  █▀█ █▄▄  █  █ █▀  █▀█ █`;

  // Create a minimal box with the logo
  const boxedLogo = boxen(chalk.blue(logo), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: "round",
    borderColor: "blue",
    float: "left",
  });

  // Display the boxed logo
  console.log(boxedLogo);
};

export const executeBrowserTask = async (
  instruction: string,
  sessionId: string
) => {
  sessionId = sessionId || `browser-session-${Date.now()}`;

  displayFactifaiLogo();

  const runConfig = {
    recursionLimit: 100,
    configurable: { thread_id: sessionId },
  };

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
      },
      runConfig
    );

    if (result.lastError) {
      console.error("Execution failed:", result.lastError);
      return {
        success: false,
        error: result.lastError,
        testSteps: result.testSteps,
        testSummary: result.testSummary,
      };
    }

    console.log("Execution completed successfully!");

    return {
      success: true,
      testSteps: result.testSteps,
      testSummary: result.testSummary,
    };
  } catch (error) {
    console.error("Execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      testSteps: [],
      testSummary: null,
    };
  }
};

executeBrowserTask(
  `
**Objective:** Verify the user flow for purchasing a prebuilt keyboard from the Glorious Gaming website.

**Test Steps & Observations:**

1.  **Step 1: Navigate to gloriousgaming.com**
    * **Action:** Enter "gloriousgaming.com" in the browser's address bar and press Enter.
    * **Expected Result:** The Glorious Gaming homepage should load.

2.  **Step 2: Verify homepage loads with hero banner and featured products**
    * **Action:** Visually inspect the homepage for the presence of a hero banner and a section displaying featured products.
    * **Expected Result:** The homepage should display a hero banner and featured products.

3.  **Step 3: Click “Shop” link on main header and it should open a side bar from left**
    * **Action:** Locate and click the "Shop" link in the main header navigation.
    * **Expected Result:** A sidebar should open from the left side of the screen.

4.  **Step 4: Click the “keyboards” menu on the sidebar and it should open a expanded submenu with the sidebar**
    * **Action:** Locate and click the "keyboards" menu item within the opened sidebar.
    * **Expected Result:** An expanded submenu should appear within the sidebar, displaying keyboard-related options.

5.  **Step 5: Click on “prebuilt keyboards” menu and it should navigate to a new page showing all prebuilt keyboards.**
    * **Action:** Locate and click the "prebuilt keyboards" menu item within the expanded keyboard submenu.
    * **Expected Result:** A new page should load, displaying a list of all prebuilt keyboards.

6.  **Step 6: Scroll and click on any one product and it should navigate to a new link for that particular product**
    * **Action:** Select any prebuilt keyboard product from the displayed list and click on it.
    * **Expected Result:** A new page should load, displaying the details of the selected product.

7.  **Step 7: Scroll until you find the add to cart button and click on it**
    * **Action:** Locate and verify the presence of the "Add to Cart" button on the product details page. Click the "Add to Cart" button.
    * **Expected Result:** The "Add to Cart" button should be displayed, and clicking it should add the product to the shopping cart.

8.  **Step 8: Verify the product is added to cart with correct name and price and proceed to checkout button is displayed**
    * **Action:** Verify the shopping cart displays the correct product name and price. Verify the presence of the "Proceed to Checkout" button.
    * **Expected Result:** The shopping cart should display the correct product name and price, and the "Proceed to Checkout" button should be present.

9.  **Step 9: Click on proceed to checkout and it should display the checkout page with the product added with details**
    * **Action:** Click the "Proceed to Checkout" button.
    * **Expected Result:** The checkout page should load, displaying the added product with its details.
    
10. Step 10: Verify that atleast two coupons are available to be used
    * **Action:** Verify that atleast two free coupons are available as labels next to input box
    * **Expected Result:** Two different coupon labels with coupon code should be displayed above the coupon input box.

11. **Step 11: Provide a report of all test steps and observations**
    * **Action:** Compile all observations from each test step into a comprehensive report.
    * **Expected Result:** A detailed report containing the results of each test step.`,
  `browser-session-${Date.now()}`
);

export * from "./core/graph/graph";
