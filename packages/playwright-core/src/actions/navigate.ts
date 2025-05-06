import { BrowserService } from "../BrowserService";
import { VisibleElement } from "../interfaces";

export async function navigate(
  sessionId: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    await page.goto(url);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during navigation",
    };
  }
}

/**
 * Gets all visible elements on the current page with their coordinates
 * @param sessionId The session identifier
 * @param maxTextLength max text length of inner text
 * @returns Promise with an array of visible elements and their properties
 */
export async function getVisibleElements(
  sessionId: string,
  maxTextLength?: number
): Promise<{
  success: boolean;
  elements?: VisibleElement[];
  error?: string;
}> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);

    // Get all visible elements with their properties
    const elements = await page.evaluate((maxTextLength) => {
      // Define which elements we're interested in
      const allElements = document.querySelectorAll("*");
      const results: any[] = [];

      // Elements to exclude (structural, non-visual, or utility elements)
      const excludeTags = new Set([
        // Document structure
        "html",
        "body",
        "head",

        // Metadata and resources
        "script",
        "style",
        "meta",
        "link",
        "title",
        "noscript",

        // Hidden elements
        "template",
        "slot",
        "iframe",

        // SVG/MathML internals
        "defs",
        "clippath",
        "lineargradient",
        "radialgradient",
        "mask",
        "pattern",
        "stop",

        // Hidden form elements
        "input[type=hidden]",

        // Web Components internals
        "shadow",
        "shadowroot",

        // Non-visual semantic elements
        "time",
        "data",
        "param",
        "source",
        "track",

        // Document sections that are typically containers
        "main",
        "section",
        "article",
        "nav",

        // Other non-visual elements
        "base",
        "command",
        "datalist",
        "optgroup",

        // containers
        "div",
      ]);

      // Check which elements are visible
      for (const el of Array.from(allElements)) {
        // Skip non-visual elements
        const tagName = el.tagName.toLowerCase();
        if (excludeTags.has(tagName)) continue;

        // Special case for hidden inputs
        if (tagName === "input" && (el as HTMLInputElement).type === "hidden")
          continue;

        const rect = el.getBoundingClientRect();

        // Skip elements with no dimensions or those outside viewport
        if (rect.width === 0 || rect.height === 0) continue;
        if (
          rect.bottom < 0 ||
          rect.right < 0 ||
          rect.top > window.innerHeight ||
          rect.left > window.innerWidth
        )
          continue;

        // Check if element is hidden by CSS
        const style = window.getComputedStyle(el);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        )
          continue;

        // Calculate center coordinates
        const x = Math.round(rect.left + rect.width / 2);
        const y = Math.round(rect.top + rect.height / 2);

        // Check if element is actually the top element at these coordinates
        const topElementAtPoint = document.elementFromPoint(x, y);
        if (
          !topElementAtPoint ||
          (!el.contains(topElementAtPoint) && topElementAtPoint !== el)
        ) {
          continue; // Element is covered by another element
        }

        // Check if element is fully visible in viewport
        const isFullyVisible =
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth;

        // Skip elements without meaningful content or identifiers
        if (
          !el.id &&
          !el.className &&
          (!el.textContent || el.textContent.trim() === "")
        ) {
          continue;
        }

        // Create the element object with only defined properties
        const elementObject: any = {
          tagName: el.tagName.toLowerCase(),
          coordinates: { x, y },
        };

        // Only add properties that exist
        if (el.id) elementObject.id = el.id;
        if (el.className) elementObject.className = el.className;

        // Process text content with length limitation if configured
        let textContent = el.textContent?.trim();
        if (textContent) {
          if (maxTextLength && textContent.length > maxTextLength) {
            textContent = textContent.substring(0, maxTextLength) + "...";
          }

          elementObject.trimmedText = textContent;
        }

        // Add to results
        results.push(elementObject);
      }

      return results;
    }, maxTextLength || 0);

    return {
      success: true,
      elements,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error getting visible elements",
    };
  }
}

/**
 * Gets the current URL of the page for the given session
 * @param sessionId The session identifier
 * @returns Promise with success flag and url or error
 */
export async function getCurrentUrl(
  sessionId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const browserService = BrowserService.getInstance();
  try {
    const page = await browserService.getPage(sessionId);
    const url = page.url();
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error getting current URL",
    };
  }
}

/**
 * Waits for the specified number of seconds in the given session
 */
export async function wait(
  sessionId: string,
  seconds: number
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();
  try {
    const page = await browserService.getPage(sessionId);
    await page.waitForTimeout(seconds * 1000);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error during wait",
    };
  }
}

/**
 * Reloads the current page for the given session
 * @param sessionId The session identifier
 * @returns Promise with success flag, current URL, or error
 */
export async function reload(
  sessionId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const browserService = BrowserService.getInstance();
  try {
    const page = await browserService.getPage(sessionId);
    await page.reload();
    const url = page.url();
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during page reload",
    };
  }
}

/**
 * Navigates back in the browser history for the given session
 * @param sessionId The session identifier
 * @returns Promise with success flag, current URL, or error
 */
export async function goBack(
  sessionId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const browserService = BrowserService.getInstance();
  try {
    const page = await browserService.getPage(sessionId);
    await page.goBack();
    const url = page.url();
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during navigation back",
    };
  }
}

/**
 * Navigates forward in the browser history for the given session
 * @param sessionId The session identifier
 * @returns Promise with success flag, current URL, or error
 */
export async function goForward(
  sessionId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const browserService = BrowserService.getInstance();
  try {
    const page = await browserService.getPage(sessionId);
    await page.goForward();
    const url = page.url();
    return { success: true, url };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during navigation forward",
    };
  }
}
