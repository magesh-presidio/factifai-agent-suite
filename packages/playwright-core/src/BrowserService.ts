import { Browser, BrowserContext, Page } from "playwright";
import * as playwright from "playwright";
import { BrowserInferenceData, IClickableElement } from "./interfaces";
import { markVisibleElements, removeElementMarkers } from "./actions/navigate";

export class BrowserService {
  private static instance: BrowserService;
  private browser: Browser | null = null;
  private readonly contexts: Map<string, BrowserContext> = new Map();
  // Replace single page map with an array of pages per session
  private readonly pageStacks: Map<string, Page[]> = new Map();

  private constructor() {}

  static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  private async initBrowser(): Promise<void> {
    this.browser ??= await playwright.chromium.launch({
      headless: false,
      args: ["--window-size=1280,720"],
    });
  }

  /**
   * Set up listeners for new tab creation
   */
  private setupTabTracking(sessionId: string, context: BrowserContext): void {
    // When a new page is created in the context
    context.on("page", async (page) => {
      // Add the new page to the stack
      const pageStack = this.pageStacks.get(sessionId) || [];
      pageStack.push(page);
      this.pageStacks.set(sessionId, pageStack);

      // Set up listener for when this page closes
      page.once("close", () => {
        console.log(`Page closed in session ${sessionId}`);
        const currentStack = this.pageStacks.get(sessionId) || [];
        // Remove the closed page from the stack
        const index = currentStack.indexOf(page);
        if (index > -1) {
          currentStack.splice(index, 1);
          this.pageStacks.set(sessionId, currentStack);
        }
      });

      // Wait for page to load
      try {
        await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      } catch (e) {
        // Continue even if timeout
        console.log(`Timeout waiting for page to load in session ${sessionId}`);
      }
    });
  }

  /**
   * Gets the currently active page for the session (the last one in the stack)
   */
  async getPage(sessionId: string): Promise<Page> {
    const pageStack = this.pageStacks.get(sessionId) || [];

    // If we already have pages, return the active one (last in the stack)
    if (pageStack.length > 0) {
      return pageStack[pageStack.length - 1];
    }

    await this.initBrowser();

    if (!this.contexts.has(sessionId)) {
      const context = await this.browser!.newContext();
      this.contexts.set(sessionId, context);
      this.setupTabTracking(sessionId, context);
    }

    const page = await this.contexts.get(sessionId)!.newPage();

    // Add the new page to the stack
    this.pageStacks.set(sessionId, [page]);

    return page;
  }

  /**
   * Gets all pages for a session
   */
  async getAllPages(sessionId: string): Promise<Page[]> {
    return this.pageStacks.get(sessionId) || [];
  }

  /**
   * Gets the number of open tabs for a session
   */
  async getTabCount(sessionId: string): Promise<number> {
    const pageStack = this.pageStacks.get(sessionId) || [];
    return pageStack.length;
  }

  /**
   * Closes the currently active tab and switches focus to the previous tab
   * @param sessionId The session identifier
   * @returns Promise with success status
   */
  async closeCurrentTab(sessionId: string): Promise<boolean> {
    const pageStack = this.pageStacks.get(sessionId) || [];

    // If there's only one tab or no tabs, don't close it
    if (pageStack.length <= 1) {
      return false;
    }

    // Get the current active tab (last in the stack)
    const currentTab = pageStack[pageStack.length - 1];

    try {
      // Close the tab
      await currentTab.close();

      // The page.close() event will trigger the 'close' event handler
      // which will update the pageStack automatically

      return true;
    } catch (error) {
      console.error("Error closing current tab:", error);
      return false;
    }
  }

  async takeScreenshot(
    sessionId: string,
    minWaitMs = 1000
  ): Promise<string | null> {
    try {
      const page = await this.getPage(sessionId);
      const start = Date.now();

      // Try readiness checks (ignore time-outs)
      try {
        await Promise.all([
          page.waitForLoadState("load", { timeout: 5000 }),
          page.waitForLoadState("networkidle", { timeout: 5000 }),
          page.waitForFunction(() => document.readyState === "complete", {
            timeout: 5000,
          }),
        ]);
      } catch {
        /* proceed regardless */
      }

      // Enforce a minimum wait of 2 s
      const elapsed = Date.now() - start;
      if (elapsed < minWaitMs) {
        await page.waitForTimeout(minWaitMs - elapsed);
      }

      const buffer = await page.screenshot({
        type: "jpeg",
        quality: 90,
        fullPage: false,
        timeout: 5000,
      });
      return buffer.toString("base64");
    } catch (error) {
      console.error("Screenshot error:", error);
      return null;
    }
  }

  /**
   * Captures a screenshot and analyzes page elements
   * @param sessionId The session identifier
   * @returns Promise with browser inference data
   */
  async captureScreenshotAndInfer(
    sessionId: string
  ): Promise<BrowserInferenceData | null> {
    try {
      const page = await this.getPage(sessionId);
      const base64Image = await this.takeScreenshot(sessionId);

      if (!base64Image) {
        throw new Error("Failed to capture screenshot");
      }

      const elements = await this.getAllPageElements(sessionId);
      const combinedElements = [
        ...elements.clickableElements,
        ...elements.inputElements,
      ];

      let scrollPosition = 0;
      let totalScroll = 0;

      await page
        .evaluate(() => {
          const position = window.scrollY;
          const total = document.body.scrollHeight;
          return { position, total };
        })
        .then((result) => {
          scrollPosition = result.position;
          totalScroll = result.total;
        });

      console.log(combinedElements, "combinedElements");

      return {
        image: base64Image,
        inference: combinedElements,
        scrollPosition,
        totalScroll,
        originalImage: base64Image,
      };
    } catch (error) {
      console.error("Error in captureScreenshotAndInfer:", error);
      return null;
    }
  }

  /**
   * Checks if an element at the given coordinates is visible
   * @param sessionId The session identifier
   * @param coordinate The x,y coordinates of the element
   * @returns Promise with visibility information
   */
  async checkIfElementIsVisible(
    sessionId: string,
    coordinate: { x: number; y: number }
  ): Promise<{
    top?: number;
    isSuccess: boolean;
    isConditionPassed?: boolean;
    message?: string;
  } | null> {
    try {
      const page = await this.getPage(sessionId);

      return await page.evaluate((coordinate) => {
        let result: {
          top?: number;
          isSuccess: boolean;
          isConditionPassed?: boolean;
          message?: string;
        } | null = null;

        try {
          const element = document.elementFromPoint(coordinate.x, coordinate.y);
          if (!element) {
            return {
              isSuccess: false,
              message: "No element found at the specified coordinates",
            };
          }

          const { top } = element.getBoundingClientRect();
          const needsScrolling = top > window.innerHeight || top < 0;

          if (needsScrolling) {
            element.scrollIntoView({ behavior: "smooth" });
          }

          result = {
            top,
            isSuccess: true,
            isConditionPassed: needsScrolling,
          };
        } catch (e) {
          result = {
            isSuccess: false,
            message:
              "Element not available on the visible viewport. Please check if the element is visible in the current viewport otherwise scroll the page to make the element visible in the viewport",
          };
        }
        return result;
      }, coordinate);
    } catch (error) {
      console.error("Error checking element visibility:", error);
      return null;
    }
  }

  /**
   * Gets all clickable and input elements on the page
   * @param sessionId The session identifier
   * @returns Promise with clickable and input elements
   */
  async getAllPageElements(sessionId: string): Promise<{
    clickableElements: Array<IClickableElement>;
    inputElements: Array<IClickableElement>;
  }> {
    try {
      const page = await this.getPage(sessionId);

      return await page.evaluate(() => {
        const clickableSelectors = `a, button, [role], [onclick], input[type="submit"], input[type="button"]`;
        const inputSelectors = `input:not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"], select`;

        // Create Arrays of unique elements
        const uniqueClickableElements = Array.from(
          document.querySelectorAll(clickableSelectors)
        );
        const uniqueInputElements = Array.from(
          document.querySelectorAll(inputSelectors)
        );

        /**
         * Checks if an element is visually visible (not overlapped)
         */
        function checkIfElementIsVisuallyVisible(
          element: Element,
          centerX: number,
          centerY: number
        ) {
          const topElement = document.elementFromPoint(centerX, centerY);
          return !(topElement !== element && !element.contains(topElement));
        }

        /**
         * Checks if an element is visible based on CSS and attributes
         */
        function elementVisibility(element: Element) {
          // Use modern visibility API if available
          const checkVisibilityResult =
            "checkVisibility" in element
              ? (element as any).checkVisibility({
                  checkOpacity: true,
                  checkVisibilityCSS: true,
                  contentVisibilityAuto: true,
                  opacityProperty: true,
                  visibilityProperty: true,
                })
              : true;

          const style = getComputedStyle(element);
          const notHiddenByCSS =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            parseFloat(style.opacity) > 0;
          const notHiddenAttribute = !(element as any).hidden;

          return checkVisibilityResult && notHiddenByCSS && notHiddenAttribute;
        }

        /**
         * Gets information about an element
         */
        function getElementInfo(element: Element) {
          const { top, left, bottom, right, width, height } =
            element.getBoundingClientRect();
          const attributes: Record<string, string> = {};
          const { innerHeight, innerWidth } = window;
          const isVisibleInCurrentViewPort =
            top >= 0 &&
            left >= 0 &&
            bottom <= innerHeight &&
            right <= innerWidth;

          // Get all attributes
          Array.from(element.attributes).forEach((attr) => {
            attributes[attr.name] = attr.value;
          });

          return elementVisibility(element)
            ? {
                type:
                  (element as HTMLInputElement).type ||
                  element.tagName.toLowerCase(),
                tagName: element.tagName.toLowerCase(),
                text: element.textContent?.trim(),
                placeholder: (element as HTMLInputElement).placeholder,
                coordinate: {
                  x: Math.round(left + width / 2),
                  y: Math.round(top + height / 2),
                },
                attributes,
                isVisibleInCurrentViewPort,
                isVisuallyVisible: checkIfElementIsVisuallyVisible(
                  element,
                  Math.round(left + width / 2),
                  Math.round(top + height / 2)
                ),
              }
            : null;
        }

        return {
          clickableElements: uniqueClickableElements
            .map(getElementInfo)
            .filter(Boolean) as any[],
          inputElements: uniqueInputElements
            .map(getElementInfo)
            .filter(Boolean) as any[],
        };
      });
    } catch (error) {
      console.error("Error getting page elements:", error);
      return { clickableElements: [], inputElements: [] };
    }
  }

  async closePage(sessionId: string): Promise<void> {
    const pageStack = this.pageStacks.get(sessionId) || [];

    // Close all pages in the stack
    for (const page of pageStack) {
      await page
        .close()
        .catch((e) => console.error(`Error closing page: ${e}`));
    }

    // Clear the page stack
    this.pageStacks.delete(sessionId);

    // Close the context
    if (this.contexts.has(sessionId)) {
      await this.contexts
        .get(sessionId)!
        .close()
        .catch((e) => console.error(`Error closing context: ${e}`));
      this.contexts.delete(sessionId);
    }
  }

  async closeAll(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.contexts.clear();
      this.pageStacks.clear();
    }
  }

  /**
   * Takes a screenshot with elements marked with numbered bounding boxes
   * @param sessionId The session identifier
   * @param options Optional configuration for marking elements and screenshot
   * @returns Promise with screenshot image and marked elements data
   */
  async takeMarkedScreenshot(
    sessionId: string,
    options?: {
      boxColor?: string; // Color of the bounding box (default: red)
      textColor?: string; // Color of the number label (default: white)
      backgroundColor?: string; // Background color of the number label (default: blue)
      maxElements?: number; // Maximum number of elements to mark (default: 100)
      minTextLength?: number; // Minimum text length to consider (default: 0)
      removeExisting?: boolean; // Remove existing markers before adding new ones (default: true)
      randomColors?: boolean; // Use random colors for each element (default: true)
      minWaitMs?: number; // Minimum wait time before screenshot (default: 1000ms)
      removeAfter?: boolean; // Whether to remove markers after taking screenshot (default: false)
    }
  ): Promise<{
    image: string | null; // Base64-encoded screenshot
    elements: { labelNumber: string; coordinates: { x: number; y: number } }[]; // Marked elements data
  }> {
    try {
      // Mark all elements first
      const markResult = await markVisibleElements(sessionId, {
        boxColor: options?.boxColor,
        textColor: options?.textColor,
        backgroundColor: options?.backgroundColor,
        maxElements: options?.maxElements,
        minTextLength: options?.minTextLength,
        removeExisting: options?.removeExisting,
        randomColors: options?.randomColors,
      });

      // Take the screenshot
      const minWaitMs = options?.minWaitMs || 1000;
      const screenshot = await this.takeScreenshot(sessionId, minWaitMs);

      // Remove markers if requested
      if (options?.removeAfter) {
        await removeElementMarkers(sessionId);
      }

      // Return both the screenshot and elements data
      return {
        image: screenshot,
        elements: markResult.elements || [],
      };
    } catch (error) {
      console.error("Error in takeMarkedScreenshot:", error);
      return { image: null, elements: [] };
    }
  }
}
