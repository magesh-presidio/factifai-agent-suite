import { SessionManager, navigate, click, type } from "../index";

async function runExample() {
  // Initialize the session manager
  const sessionManager = new SessionManager();

  try {
    // Create a new browser session
    console.log("Creating session...");
    const sessionId = await sessionManager.createSession();
    console.log(`Session created with ID: ${sessionId}`);

    // Navigate to Google
    console.log("Navigating to Saucedemo...");
    const navResult = await navigate(sessionId, "https://www.saucedemo.com");
    if (!navResult.success) {
      console.error("Navigation failed:", navResult.error);
      return;
    }
    console.log("Navigation successful");

    // Click on the username input (using selector)
    console.log("Clicking on username box...");
    const clickResult = await click(sessionId, { x: 637, y: 172 });
    if (!clickResult.success) {
      console.error("Click operation failed:", clickResult.error);
      return;
    }
    console.log("Click successful");

    // Type a search query
    console.log("Typing username...");
    const typeResult = await type(sessionId, "standard_user");
    if (!typeResult.success) {
      console.error("Type operation failed:", typeResult.error);
      return;
    }
    console.log("Type operation successful");

    // Click on the password input (using selector)
    console.log("Clicking on password box...");
    const clickResult2 = await click(sessionId, { x: 637, y: 225 });
    if (!clickResult2.success) {
      console.error("Click operation failed:", clickResult2.error);
      return;
    }
    console.log("Click successful");

    // Type a search query
    console.log("Typing password...");
    const typeResult2 = await type(sessionId, "secret_sauce");
    if (!typeResult2.success) {
      console.error("Type operation failed:", typeResult2.error);
      return;
    }
    console.log("Type operation successful");

    // Click search button (using coordinates - just as an example, coordinates would need to be adjusted)
    console.log("Clicking login button via coordinates...");
    const clickButtonResult = await click(sessionId, { x: 637, y: 325 });
    if (!clickButtonResult.success) {
      console.error("Button click failed:", clickButtonResult.error);
      return;
    }
    console.log("Button click successful");

    setTimeout(async () => {
      // Clean up
      console.log("Closing session...");
      await sessionManager.closeSession(sessionId);
      console.log("Session closed");
      console.log("Waiting for search box to be ready...");
    }, 3000);
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

// Execute the example
runExample()
  .catch(console.error)
  .finally(() => console.log("Example completed"));

// Also export for use in other examples
export { runExample };
