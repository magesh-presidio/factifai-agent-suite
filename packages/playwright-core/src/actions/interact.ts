import { BrowserService } from "../BrowserService";

type Coordinates = { x: number; y: number };

// Map to track cursor state for each session
export const sessionCursors = new Map<string, boolean>();

/**
 * Creates or gets the AI cursor element
 */
export async function createOrGetCursor(page: any): Promise<void> {
  return page.evaluate(() => {
    let cursor = document.getElementById('__ai_cursor__');
    
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.id = '__ai_cursor__';
      
      // Style the cursor
      Object.assign(cursor.style, {
        position: 'fixed',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 50, 50, 0.8)', // Striking red
        border: '2px solid white', // White stroke
        boxShadow: '0 0 0 1px black', // Black outline for contrast
        zIndex: '9999999', // Very top layer
        pointerEvents: 'none', // Don't interfere with clicks
        transform: 'translate(-50%, -50%)', // Center the cursor at point
        transition: 'left 0.2s, top 0.2s' // Smooth movement
      });
      
      document.body.appendChild(cursor);
    }
    
    return cursor !== null;
  });
}

/**
 * Updates the AI cursor position
 */
export async function updateCursorPosition(page: any, x: number, y: number): Promise<void> {
  await page.evaluate(({x, y}: {x: number, y: number}) => {
    const cursor = document.getElementById('__ai_cursor__');
    if (cursor) {
      // Update position
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      
      // Add click animation
      cursor.animate([
        { transform: 'translate(-50%, -50%) scale(1)' },
        { transform: 'translate(-50%, -50%) scale(1.3)' },
        { transform: 'translate(-50%, -50%) scale(1)' }
      ], {
        duration: 300,
        easing: 'ease-out'
      });
    }
  }, {x, y});
}

/**
 * Updates or creates the AI cursor at the specified position
 */
export async function updateCursorAtPosition(page: any, sessionId: string, x: number, y: number): Promise<void> {
  // Initialize cursor if it doesn't exist for this session
  if (!sessionCursors.has(sessionId)) {
    sessionCursors.set(sessionId, true);
  }
  
  // Only update if cursor is visible for this session
  if (sessionCursors.get(sessionId)) {
    // Create cursor if it doesn't exist
    await createOrGetCursor(page);
    
    // Update cursor position
    await updateCursorPosition(page, x, y);
  }
}

/**
 * Sets the visibility of the AI cursor
 */
export async function setCursorVisibility(
  sessionId: string,
  visible: boolean
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    
    // Update cursor visibility state
    sessionCursors.set(sessionId, visible);
    
    // Show or hide the cursor
    await page.evaluate((visible) => {
      const cursor = document.getElementById('__ai_cursor__');
      if (cursor) {
        cursor.style.display = visible ? 'block' : 'none';
      }
    }, visible);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during cursor visibility operation",
    };
  }
}

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
      
      // Get element center coordinates for the selector
      const coords = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }, selectorOrCoordinates);
      
      // Update cursor position if element was found
      if (coords) {
        await updateCursorAtPosition(page, sessionId, coords.x, coords.y);
      }
      
      // Perform the click
      await page.click(selectorOrCoordinates);
    } else {
      // It's coordinates
      const { x, y } = selectorOrCoordinates;
      
      // Update cursor position
      await updateCursorAtPosition(page, sessionId, x, y);
      
      // Perform the click
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
    
    // Note: We don't update cursor position for typing
    // as it's assumed the cursor is already positioned at the input field
    // from a previous click operation
    
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

export async function clear(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const page = await browserService.getPage(sessionId);
    
    // Note: We don't update cursor position for clearing
    // as it's assumed the cursor is already positioned at the input field
    // from a previous click operation
    
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+A" : "Control+A"
    );
    await page.keyboard.press("Backspace");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during clear operation",
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
    
    // Scroll the page
    await page.evaluate(([x, y]) => window.scrollBy(x, y), [dx, dy]);
    
    // Get cursor position and adjust it based on scroll amount if cursor is visible
    if (sessionCursors.get(sessionId) === true) {
      await page.evaluate(([dx, dy]) => {
        const cursor = document.getElementById('__ai_cursor__');
        if (cursor) {
          // Get current position
          const left = parseFloat(cursor.style.left || '0');
          const top = parseFloat(cursor.style.top || '0');
          
          // Update position based on scroll
          cursor.style.left = `${left}px`;
          cursor.style.top = `${top - dy}px`; // Subtract dy because scrolling down moves content up
        }
      }, [dx, dy]);
    }

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
    
    // Get viewport height before scrolling
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Scroll the page
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    
    // Adjust cursor position if cursor is visible
    if (sessionCursors.get(sessionId) === true) {
      await page.evaluate((viewportHeight) => {
        const cursor = document.getElementById('__ai_cursor__');
        if (cursor) {
          // Get current position
          const top = parseFloat(cursor.style.top || '0');
          
          // Update position based on scroll
          cursor.style.top = `${top - viewportHeight}px`; // Subtract viewport height because scrolling down moves content up
        }
      }, viewportHeight);
    }

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
    
    // Get viewport height before scrolling
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Scroll the page
    await page.evaluate(() => {
      window.scrollBy(0, -window.innerHeight);
    });
    
    // Adjust cursor position if cursor is visible
    if (sessionCursors.get(sessionId) === true) {
      await page.evaluate((viewportHeight) => {
        const cursor = document.getElementById('__ai_cursor__');
        if (cursor) {
          // Get current position
          const top = parseFloat(cursor.style.top || '0');
          
          // Update position based on scroll
          cursor.style.top = `${top + viewportHeight}px`; // Add viewport height because scrolling up moves content down
        }
      }, viewportHeight);
    }

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

/**
 * Closes the currently active tab and switches focus to the previous tab
 * @param sessionId The session identifier
 * @returns Promise with success status and error message if applicable
 */
export async function closeCurrentTab(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const browserService = BrowserService.getInstance();

  try {
    const result = await browserService.closeCurrentTab(sessionId);
    
    if (result) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: "Could not close tab. There may only be one tab open or no tabs available." 
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during tab close operation",
    };
  }
}
