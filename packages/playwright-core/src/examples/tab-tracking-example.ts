import { BrowserService } from "../BrowserService";
import { SessionManager } from "../SessionManager";
import { navigate } from "../actions/navigate";
import { click, type, closeCurrentTab } from "../actions/interact";

/**
 * Example demonstrating automatic tab tracking and focus
 * 
 * This example:
 * 1. Opens a browser and navigates to a test page
 * 2. Creates a link that opens in a new tab
 * 3. Clicks the link to open a new tab
 * 4. Shows that interactions automatically happen on the new tab
 * 5. Closes the new tab
 * 6. Shows that interactions return to the original tab
 */
async function runTabTrackingExample() {
  console.log("Starting tab tracking example...");
  
  // Create a session
  const sessionManager = new SessionManager();
  const sessionId = await sessionManager.createSession();
  console.log(`Created session: ${sessionId}`);
  
  const browserService = BrowserService.getInstance();
  
  try {
    // Navigate to a test page (we'll use about:blank and inject our own content)
    await navigate(sessionId, "about:blank");
    console.log("Navigated to blank page");
    
    // Get the page
    const page = await browserService.getPage(sessionId);
    
    // Create a simple page with a link that opens in a new tab
    await page.evaluate(() => {
      document.body.innerHTML = `
        <h1>Tab Tracking Example</h1>
        <p>Main page</p>
        <a href="about:blank" target="_blank" id="newTabLink">Open New Tab</a>
        <div>
          <input type="text" id="mainInput" placeholder="Type in main page">
        </div>
        <div id="status">Status: Ready</div>
      `;
      
      document.body.style.fontFamily = 'Arial, sans-serif';
      document.body.style.padding = '20px';
    });
    
    // Take a screenshot of the initial page
    console.log("Taking screenshot of initial page...");
    const initialScreenshot = await browserService.takeScreenshot(sessionId);
    console.log(`Initial screenshot taken: ${initialScreenshot ? "success" : "failed"}`);
    
    // Get tab count
    let tabCount = await browserService.getTabCount(sessionId);
    console.log(`Current tab count: ${tabCount}`);
    
    // Click the link to open a new tab
    console.log("Clicking link to open new tab...");
    await click(sessionId, "#newTabLink");
    
    // Wait a moment for the new tab to open and be registered
    await page.waitForTimeout(1000);
    
    // Get updated tab count
    tabCount = await browserService.getTabCount(sessionId);
    console.log(`Tab count after clicking link: ${tabCount}`);
    
    // The new tab should now be the active one
    // Let's modify its content to distinguish it
    const newPage = await browserService.getPage(sessionId);
    await newPage.evaluate(() => {
      document.body.innerHTML = `
        <h1>New Tab</h1>
        <p>This is the new tab that was opened</p>
        <div>
          <input type="text" id="newTabInput" placeholder="Type in new tab">
        </div>
        <button id="closeButton">Close This Tab</button>
        <p><small>Note: The button above is just for display. In this example, we'll close the tab programmatically.</small></p>
      `;
      
      document.body.style.fontFamily = 'Arial, sans-serif';
      document.body.style.padding = '20px';
      document.body.style.backgroundColor = '#f0f0f0';
    });
    
    // Take a screenshot of the new tab
    console.log("Taking screenshot of new tab...");
    const newTabScreenshot = await browserService.takeScreenshot(sessionId);
    console.log(`New tab screenshot taken: ${newTabScreenshot ? "success" : "failed"}`);
    
    // Type in the input field on the new tab
    console.log("Typing in the new tab input field...");
    await click(sessionId, "#newTabInput");
    await type(sessionId, "This text was typed in the new tab");
    
    // Take another screenshot to show the typing
    console.log("Taking screenshot after typing...");
    const afterTypingScreenshot = await browserService.takeScreenshot(sessionId);
    console.log(`After typing screenshot taken: ${afterTypingScreenshot ? "success" : "failed"}`);
    
    // Close the new tab programmatically using the action function
    console.log("Closing the new tab programmatically...");
    const closeResult = await closeCurrentTab(sessionId);
    console.log(`Tab close result: ${closeResult.success ? "success" : "failed - " + closeResult.error}`);
    
    // The new tab will close and the browser will automatically focus back to the original tab
    // Wait a moment for the tab to close
    await page.waitForTimeout(1000);
    
    // Get updated tab count
    tabCount = await browserService.getTabCount(sessionId);
    console.log(`Tab count after closing new tab: ${tabCount}`);
    
    // Now we should be back on the original tab
    // Let's type in the input field on the original tab to verify
    console.log("Typing in the original tab input field...");
    await click(sessionId, "#mainInput");
    await type(sessionId, "Back to the original tab");
    
    // Update the status to show we're back
    const originalPage = await browserService.getPage(sessionId);
    await originalPage.evaluate(() => {
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = "Status: Back on original tab";
        statusElement.style.color = "green";
        statusElement.style.fontWeight = "bold";
      }
    });
    
    // Take a final screenshot to show we're back on the original tab
    console.log("Taking final screenshot...");
    const finalScreenshot = await browserService.takeScreenshot(sessionId);
    console.log(`Final screenshot taken: ${finalScreenshot ? "success" : "failed"}`);
    
    console.log("Tab tracking example completed successfully!");
  } catch (error) {
    console.error("Error in tab tracking example:", error);
  } finally {
    // Clean up
    console.log("Cleaning up...");
    await browserService.closePage(sessionId);
    console.log("Browser closed");
  }
}

// Run the example
runTabTrackingExample().catch(console.error);
