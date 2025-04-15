import { Browser, BrowserContext, Page } from "playwright";
import * as playwright from "playwright";

export class BrowserService {
  private static instance: BrowserService;
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();

  private constructor() {}

  static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await playwright.chromium.launch({
        headless: false,
        args: ["--window-size=1280,720"],
      });
    }
  }

  async getPage(sessionId: string): Promise<Page> {
    if (this.pages.has(sessionId)) {
      return this.pages.get(sessionId)!;
    }

    await this.initBrowser();

    if (!this.contexts.has(sessionId)) {
      const context = await this.browser!.newContext();
      this.contexts.set(sessionId, context);
    }

    const page = await this.contexts.get(sessionId)!.newPage();
    this.pages.set(sessionId, page);

    return page;
  }

  async takeScreenshot(sessionId: string): Promise<string | null> {
    try {
      const page = await this.getPage(sessionId);
      const buffer = await page.screenshot({
        type: "jpeg",
        quality: 80,
        fullPage: false,
        timeout: 3000,
      });
      return buffer.toString("base64");
    } catch (error) {
      console.error("Screenshot error:", error);
      return null;
    }
  }

  async closePage(sessionId: string): Promise<void> {
    if (this.pages.has(sessionId)) {
      await this.pages.get(sessionId)!.close();
      this.pages.delete(sessionId);
    }

    if (this.contexts.has(sessionId)) {
      await this.contexts.get(sessionId)!.close();
      this.contexts.delete(sessionId);
    }
  }

  async closeAll(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.contexts.clear();
      this.pages.clear();
    }
  }
}
