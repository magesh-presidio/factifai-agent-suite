import { BrowserService } from "../BrowserService";
import { markVisibleElements, removeElementMarkers } from "../actions/navigate";

/**
 * Example showing how to use the markVisibleElements function to 
 * visualize elements on a webpage and get their data
 */
async function getMarkedElementsExample() {
  // Initialize a browser session
  const sessionId = "example-session";
  const browserService = BrowserService.getInstance();
  
  try {
    // Get a page instance
    const page = await browserService.getPage(sessionId);
    
    // Navigate to a website with interactive elements
    await page.goto("https://gloriousgaming.com");
    console.log("Navigated to gloriousgaming.com");
    
    // Wait for the page to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Mark all visible elements and get their data
    console.log("Marking all visible elements and getting their data...");
    const result = await markVisibleElements(sessionId);
    
    console.log(`Marked ${result.markedCount} elements on the page`);
    console.log("Elements data:", JSON.stringify(result.elements, null, 2));
    
    // Wait for 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Remove all markers
    console.log("Removing all element markers...");
    await removeElementMarkers(sessionId);
    console.log("All markers removed");
    
    console.log("Example completed successfully");
  } catch (error) {
    console.error("Error in getMarkedElementsExample:", error);
  } finally {
    // Close the browser
    await browserService.closeAll();
  }
}

// Run the example
getMarkedElementsExample().catch(console.error);
