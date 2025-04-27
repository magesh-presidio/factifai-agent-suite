import { BrowserService } from "../BrowserService";

type Coordinates = { x: number; y: number };

export async function click(
  sessionId: string,
  selectorOrCoordinates: string | Coordinates
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);

    // Handle both selector and coordinate cases
    if (typeof selectorOrCoordinates === "string") {
      // It's a CSS selector
      await page.click(selectorOrCoordinates);
    } else {
      // It's coordinates
      const { x, y } = selectorOrCoordinates;
      await page.mouse.click(x, y);
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during click operation",
    };
  }
}

export async function type(
  sessionId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    await page.keyboard.type(text);

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during type operation",
    };
  }
}

export async function scrollBy(
  sessionId: string,
  dx: number, // pixels to move on the X-axis (left = −, right = +)
  dy: number // pixels to move on the Y-axis (up   = −, down  = +)
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    await page.evaluate(([x, y]) => window.scrollBy(x, y), [dx, dy]);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during scroll operation",
    };
  }
}

export async function scrollToNextChunk(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during scroll operation",
    };
  }
}

export async function scrollToPrevChunk(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    await page.evaluate(() => {
      window.scrollBy(0, -window.innerHeight);
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during scroll operation",
    };
  }
}
