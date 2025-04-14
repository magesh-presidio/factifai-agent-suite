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
    console.log("Navigating to Google...");
    const navResult = await navigate(sessionId, "https://www.google.com");
    if (!navResult.success) {
      console.error("Navigation failed:", navResult.error);
      return;
    }
    console.log("Navigation successful");

    // Click on the search box (using selector)
    console.log("Clicking on search box...");
    const clickResult = await click(sessionId, { x: 470, y: 270 }); // Example coordinates, adjust as needed
    if (!clickResult.success) {
      console.error("Click operation failed:", clickResult.error);
      return;
    }
    console.log("Click successful");

    // Type a search query
    console.log("Typing search query...");
    const typeResult = await type(sessionId, "Playwright automation");
    if (!typeResult.success) {
      console.error("Type operation failed:", typeResult.error);
      return;
    }
    console.log("Type operation successful");

    // Click search button (using coordinates - just as an example, coordinates would need to be adjusted)
    console.log("Clicking search button via coordinates...");
    const clickButtonResult = await click(sessionId, { x: 568, y: 349 });
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
