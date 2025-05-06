import { BrowserService } from "../BrowserService";
import { markVisibleElements, removeElementMarkers } from "../actions/navigate";

/**
 * Example showing how to use the markVisibleElements function to
 * visualize elements on a webpage with numbered bounding boxes
 */
async function markElementsExample() {
  // Initialize a browser session
  const sessionId = "example-session";
  const browserService = BrowserService.getInstance();

  try {
    // Get a page instance
    const page = await browserService.getPage(sessionId);

    // Navigate to a website with interactive elements
    await page.goto("https://en.wikipedia.org/wiki/Main_Page");
    console.log("Navigated to gloriousgaming.com");

    // Wait for the page to load
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Mark all visible elements with default styling (red boxes, blue numbered labels)
    console.log("Marking all visible elements with default styling...");
    const result = await markVisibleElements(sessionId, { maxElements: 500 });
    console.log(`Marked ${result.markedCount} elements on the page`);

    // Wait for 5 seconds to let the user see the marked elements
    console.log("Waiting for 5 seconds to observe the markers...");
    await new Promise((resolve) => setTimeout(resolve, 25000));

    // Now mark elements again with custom styling
    console.log("Now marking elements with custom styling...");
    const customResult = await markVisibleElements(sessionId, {
      boxColor: "green",
      textColor: "black",
      backgroundColor: "yellow",
      maxElements: 30,
      minTextLength: 5,
      removeExisting: true,
    });
    console.log(
      `Marked ${customResult.markedCount} elements with custom styling`
    );

    // Wait for another 5 seconds
    console.log("Waiting for 5 seconds to observe the custom markers...");
    await new Promise((resolve) => setTimeout(resolve, 15000));

    // Remove all markers
    console.log("Removing all element markers...");
    await removeElementMarkers(sessionId);
    console.log("All markers removed");

    // Wait for 2 more seconds
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Example completed successfully");
  } catch (error) {
    console.error("Error in markElementsExample:", error);
  } finally {
    // Close the browser
    await browserService.closeAll();
  }
}

// Run the example
markElementsExample().catch(console.error);
