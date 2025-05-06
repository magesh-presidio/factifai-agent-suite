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

/**
 * Marks all visible elements on the current page with numbered bounding boxes
 * @param sessionId The session identifier
 * @param options Optional configuration
 * @returns Promise with success status and count of marked elements
 */
export async function markVisibleElements(
  sessionId: string,
  options?: {
    boxColor?: string;       // Color of the bounding box (default: red)
    textColor?: string;      // Color of the number label (default: white)
    backgroundColor?: string; // Background color of the number label (default: blue)
    maxElements?: number;    // Maximum number of elements to mark (default: 100)
    minTextLength?: number;  // Minimum text length to consider (default: 0)
    removeExisting?: boolean; // Remove existing markers before adding new ones (default: true)
    randomColors?: boolean;  // Use random colors for each element (default: true)
  }
): Promise<{
  success: boolean;
  markedCount?: number;
  elements?: { labelNumber: string; coordinates: { x: number; y: number } }[];
  error?: string;
}> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    
    // Set default options
    const opts = {
      boxColor: options?.boxColor || 'red',
      textColor: options?.textColor || 'white',
      backgroundColor: options?.backgroundColor || 'blue',
      maxElements: options?.maxElements || 100,
      minTextLength: options?.minTextLength || 0,
      removeExisting: options?.removeExisting !== false, // Default to true
      randomColors: options?.randomColors !== false // Default to true
    };
    
    // Get visible elements and mark them with bounding boxes
    const markedCount = await page.evaluate((opts) => {
      // Remove existing markers if specified
      if (opts.removeExisting) {
        const existingMarkers = document.querySelectorAll('.factifai-element-marker');
        existingMarkers.forEach(marker => marker.remove());
        
        // Also remove any existing label container
        const existingLabelContainer = document.getElementById('factifai-label-container');
        if (existingLabelContainer) {
          existingLabelContainer.remove();
        }
      }
      
      // Create a separate container for all labels to ensure they're always on top
      const labelContainer = document.createElement('div');
      labelContainer.id = 'factifai-label-container';
      labelContainer.style.position = 'fixed';
      labelContainer.style.top = '0';
      labelContainer.style.left = '0';
      labelContainer.style.width = '100vw';
      labelContainer.style.height = '100vh';
      labelContainer.style.pointerEvents = 'none';
      labelContainer.style.zIndex = '2147483647'; // Max z-index value
      document.body.appendChild(labelContainer);

      // Define which elements we're interested in
      const allElements = document.querySelectorAll("*");
      let markedCount = 0;

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

        // Text elements (typically not interactive)
        "p", "span", "h1", "h2", "h3", "h4", "h5", "h6",
        "label", "strong", "em", "b", "i", "u", "small",
        "blockquote", "q", "cite", "dfn", "abbr", "mark",
        "del", "ins", "sub", "sup", "code", "pre", "br",
        "hr", "wbr", "bdi", "bdo", "ruby", "rt", "rp",
        "figcaption", "figure", "picture", "summary",

        // Other non-visual elements
        "base",
        "command",
        "datalist",
        "optgroup",

        // Containers
        "div"
      ]);

      // Define which elements we want to include (interactive elements)
      const includeSelectors = [
        'a', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
        '[role="tab"]', '[role="menuitem"]', '[role="combobox"]', '[role="option"]',
        '[role="switch"]', '[role="searchbox"]', '[role="textbox"]',
        '[onclick]', '[onkeydown]', '[onkeyup]', '[onmousedown]', '[onmouseup]',
        '[tabindex]:not([tabindex="-1"])'
      ];

      // First, collect all interactive elements using the include selectors
      const interactiveElements = [];
      for (const selector of includeSelectors) {
        const elements = document.querySelectorAll(selector);
        interactiveElements.push(...Array.from(elements));
      }
      
      // Array to collect element data
      const markedElements = [];
      
      // Check which elements are visible
      for (const el of interactiveElements) {
        // Skip if we've reached the maximum number of elements
        if (markedCount >= opts.maxElements) break;

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

        // Skip elements that are too small (likely not meaningful interactive elements)
        if (rect.width < 5 || rect.height < 5) continue;

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

        // Generate random colors for this element
        const getRandomColor = () => {
          // Create bold, striking colors with higher saturation and controlled lightness
          const hue = Math.floor(Math.random() * 360); // 0-359 degrees on color wheel
          const saturation = 90 + Math.floor(Math.random() * 10); // 90-100% saturation for vivid colors
          const lightness = 30 + Math.floor(Math.random() * 25); // 30-55% lightness for bold colors
          
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        };
        
        // Choose white or black text depending on background brightness
        const getContrastingTextColor = (bgColor: string): string => {
          // Extract lightness from HSL color
          const lightnessMatch = bgColor.match(/hsl\(\d+,\s*\d+%,\s*(\d+)%\)/);
          if (lightnessMatch) {
            const lightness = parseInt(lightnessMatch[1], 10);
            return lightness < 50 ? 'white' : 'black';
          }
          return 'white'; // Default to white if parsing fails
        };
        
        // Generate a single color for this element (box and label will share the same color)
        const elementColor = opts.randomColors !== false ? getRandomColor() : opts.boxColor;
        const textColor = opts.randomColors !== false ? 
          getContrastingTextColor(elementColor) : opts.textColor;

        // Create the marker element
        const marker = document.createElement('div');
        marker.className = 'factifai-element-marker';
        
        // Style the bounding box
        Object.assign(marker.style, {
          position: 'fixed',
          left: rect.left + 'px',
          top: rect.top + 'px',
          width: rect.width + 'px',
          height: rect.height + 'px',
          border: `3px solid ${elementColor}`, // Thicker border with element color
          pointerEvents: 'none',
          zIndex: '9000000',
          boxSizing: 'border-box',
          background: 'transparent'
        });

        // Increment the counter first
        ++markedCount;
        
        // Create the number label (now in the label container)
        const label = document.createElement('div');
        label.textContent = markedCount.toString();
        
        // Style the number label
        Object.assign(label.style, {
          position: 'fixed', // Fixed position relative to viewport
          left: (rect.right - 10) + 'px', // Position at the right edge of the element
          top: (rect.top - 10) + 'px',   // Position at the top of the element
          backgroundColor: elementColor, // Same color as the border
          color: textColor,
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 0 3px rgba(0,0,0,0.5)', // Add shadow for better visibility
          outline: '1px solid white', // White outline to help it stand out
          zIndex: '2147483647' // Maximum z-index
        });

        // Add the marker to the document body
        document.body.appendChild(marker);
        
        // Add the label to our special container
        labelContainer.appendChild(label);
        
        // Store element data for return value
        markedElements.push({
          labelNumber: markedCount.toString(),
          coordinates: { x, y }
        });
      }

      return { markedCount, markedElements };
    }, opts);

    return {
      success: true,
      markedCount: markedCount.markedCount,
      elements: markedCount.markedElements
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error marking visible elements"
    };
  }
}

/**
 * Removes all element markers previously added by markVisibleElements
 * @param sessionId The session identifier
 * @returns Promise with success status
 */
export async function removeElementMarkers(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    
    await page.evaluate(() => {
      // Remove all marker elements
      const markers = document.querySelectorAll('.factifai-element-marker');
      markers.forEach(marker => marker.remove());
      
      // Also remove the label container
      const labelContainer = document.getElementById('factifai-label-container');
      if (labelContainer) {
        labelContainer.remove();
      }
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error removing element markers"
    };
  }
}
