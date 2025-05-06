import {
  SessionManager,
  navigate,
  click,
  type,
  getVisibleElements,
  getCurrentUrl,
  wait,
} from "../index";

async function runLogin() {
  // Initialize the session manager
  const sessionManager = new SessionManager();
  let sessionId: string = "";

  try {
    // Create a new browser session
    console.log("Creating session...");
    sessionId = await sessionManager.createSession();
    console.log(`Session created with ID: ${sessionId}`);

    // Navigate to Saucedemo
    console.log("Navigating to Saucedemo...");
    await executeStep(
      () => navigate(sessionId, "https://www.saucedemo.com"),
      "Navigation"
    );

    await getVisibleElements(sessionId, 35).then((result: any) => {
      console.log("Visible elements:", result);
    });

    // Login process
    await loginToSauceDemo(sessionId, "standard_user", "secret_sauce");

    // Wait for redirect after successful login
    console.log("Waiting for page transition after login...");

    await getVisibleElements(sessionId, 35).then((result: any) => {
      console.log("Visible elements:", result);
    });

    await getCurrentUrl(sessionId).then((result: any) => {
      console.log("Current URL:", result);
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log("Login process completed successfully");

    return { success: true, sessionId };
  } catch (error) {
    console.error("Automation failed:", error);
    return { success: false, error };
  } finally {
    if (sessionId) {
      console.log("Closing session...");
      await sessionManager.closeSession(sessionId);
      console.log("Session closed");
    }
  }
}

/**
 * Login to SauceDemo with provided credentials
 * @param {string} sessionId - Browser session ID
 * @param {string} username - SauceDemo username
 * @param {string} password - SauceDemo password
 */
async function loginToSauceDemo(
  sessionId: string,
  username: string,
  password: string
) {
  // Input element coordinates
  const elements = {
    usernameField: { x: 637, y: 172 },
    passwordField: { x: 637, y: 225 },
    loginButton: { x: 637, y: 325 },
  };

  // Enter username
  console.log(`Entering username: ${username}`);
  await executeStep(
    () => click(sessionId, elements.usernameField),
    "Username field click"
  );
  await wait(sessionId, 4);
  await executeStep(() => type(sessionId, username), "Username input");

  // Enter password
  console.log(`Entering password: ******`);
  await executeStep(
    () => click(sessionId, elements.passwordField),
    "Password field click"
  );
  await wait(sessionId, 4);
  await executeStep(() => type(sessionId, password), "Password input");

  // Click login button
  console.log("Clicking login button...");
  await executeStep(
    () => click(sessionId, elements.loginButton),
    "Login button click"
  );
}

/**
 * Execute a step with proper error handling
 * @param {Function} operation - Async function to execute
 * @param {string} stepName - Name of the step for logging
 * @returns {Promise<any>} - Result of the operation
 */
async function executeStep(operation: Function, stepName: string) {
  const result = await operation();
  if (!result.success) {
    throw new Error(`${stepName} failed: ${result.error}`);
  }
  console.log(`${stepName} successful`);
  return result;
}

// Execute the login automation
if (require.main === module) {
  runLogin()
    .then((result) => {
      if (result.success) {
        console.log("Login automation completed successfully");
      } else {
        console.error("Login automation failed");
      }
    })
    .catch(console.error);
}

export { runLogin, loginToSauceDemo, executeStep };
