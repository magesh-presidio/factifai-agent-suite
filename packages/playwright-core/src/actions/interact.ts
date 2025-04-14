import { BrowserService } from '../BrowserService';

type Coordinates = { x: number; y: number };

export async function click(
  sessionId: string, 
  selectorOrCoordinates: string | Coordinates
): Promise<{success: boolean, screenshot?: string, error?: string}> {
  const browserService = BrowserService.getInstance();
  
  try {
    const page = await browserService.getPage(sessionId);
    
    // Handle both selector and coordinate cases
    if (typeof selectorOrCoordinates === 'string') {
      // It's a CSS selector
      await page.click(selectorOrCoordinates);
    } else {
      // It's coordinates
      const { x, y } = selectorOrCoordinates;
      await page.mouse.click(x, y);
    }
    
    // Take screenshot after action
    const screenshot = await browserService.takeScreenshot(sessionId);
    
    return {
      success: true,
      screenshot: screenshot || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during click operation'
    };
  }
}

export async function type(
  sessionId: string, 
  text: string
): Promise<{success: boolean, screenshot?: string, error?: string}> {
  const browserService = BrowserService.getInstance();
  
  try {
    const page = await browserService.getPage(sessionId);
    await page.keyboard.type(text);
    
    // Take screenshot after action
    const screenshot = await browserService.takeScreenshot(sessionId);
    
    return {
      success: true,
      screenshot: screenshot || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during type operation'
    };
  }
}
