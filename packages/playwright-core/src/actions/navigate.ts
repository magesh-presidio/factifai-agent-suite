import { BrowserService } from '../BrowserService';

export async function navigate(sessionId: string, url: string): Promise<{success: boolean, screenshot?: string, error?: string}> {
  const browserService = BrowserService.getInstance();
  
  try {
    const page = await browserService.getPage(sessionId);
    await page.goto(url);
    
    // Take screenshot after navigation
    const screenshot = await browserService.takeScreenshot(sessionId);
    
    return {
      success: true,
      screenshot: screenshot || undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during navigation'
    };
  }
}
