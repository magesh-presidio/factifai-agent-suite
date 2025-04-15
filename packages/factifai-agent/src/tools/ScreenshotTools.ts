import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { BrowserService } from "@factifai/playwright-core";
import { logger } from "../utils/logger";

export class ScreenshotTools {
  static getTools() {
    const screenshotTool = new DynamicStructuredTool({
      name: "screenshot",
      description: "Take a screenshot of the current browser state",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info(`Taking screenshot for session ${input.sessionId}`);
        try {
          const browserService = BrowserService.getInstance();
          const screenshot = await browserService.takeScreenshot(
            input.sessionId
          );
          console.log("Screenshot result:", !!screenshot);
          return JSON.stringify({
            success: true,
            screenshot,
          });
        } catch (error) {
          logger.error(`Error taking screenshot:`, error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown screenshot error",
          });
        }
      },
    });

    return [screenshotTool];
  }
}
