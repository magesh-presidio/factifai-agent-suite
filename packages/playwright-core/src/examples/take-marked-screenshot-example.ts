import { BrowserService } from "../BrowserService";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example showing how to use the takeMarkedScreenshot function to 
 * visualize elements on a webpage and get their data along with a screenshot
 */
async function takeMarkedScreenshotExample() {
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
    
    // Take a screenshot with marked elements
    console.log("Taking screenshot with marked elements...");
    const result = await browserService.takeMarkedScreenshot(sessionId, {
      // Custom options
      randomColors: true,
      maxElements: 20,
      minWaitMs: 1000,
      removeAfter: true // Clean up markers after taking the screenshot
    });
    
    // Check if we got a screenshot
    if (result.image) {
      console.log("Screenshot taken successfully!");
      console.log(`Marked ${result.elements.length} elements on the page`);
      console.log("Elements data:", JSON.stringify(result.elements, null, 2));
      
      // Save the screenshot to logs directory for debugging
      const screenshot = result.image;
      const logsDir = path.join(__dirname, '../../../factifai-agent/src/logs');
      
      // Ensure logs directory exists
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Write the screenshot to the logs directory
      const imagePath = path.join(logsDir, 'currentImage.jpeg');
      fs.writeFileSync(imagePath, Buffer.from(screenshot, 'base64'));
      console.log(`Screenshot saved to ${imagePath} for debugging`);
      
      // Use the coordinates for further processing
      console.log("First element coordinates:", result.elements[0]?.coordinates);
    } else {
      console.error("Failed to take screenshot");
    }
    
    console.log("Example completed successfully");
  } catch (error) {
    console.error("Error in takeMarkedScreenshotExample:", error);
  } finally {
    // Close the browser
    await browserService.closeAll();
  }
}

// Run the example
takeMarkedScreenshotExample().catch(console.error);
