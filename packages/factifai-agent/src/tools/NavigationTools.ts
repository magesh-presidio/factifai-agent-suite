import { navigate, getCurrentUrl } from "@factifai/playwright-core";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../utils/logger";

export class NavigationTools {
  static getTools() {
    const navigateTool = new DynamicStructuredTool({
      name: "navigate",
      description: "Navigate to a URL in the browser",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
        url: z.string().describe("The URL to navigate to"),
      }),
      func: async (input) => {
        logger.info(`Navigating to ${input.url}`);
        try {
          const result = await navigate(input.sessionId, input.url);
          console.log("Navigation result:", result.success);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error navigating to ${input.url}:`, error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown navigation error",
          });
        }
      },
    });

    const getCurrentUrlTool = new DynamicStructuredTool({
      name: "getCurrentUrl",
      description: "Get the current URL of the active page in the browser",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info(`Fetching current URL for session ${input.sessionId}`);
        try {
          const result = await getCurrentUrl(input.sessionId);
          logger.info("Current URL result:", result.url);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(
            `Error getting current URL for session ${input.sessionId}:`,
            error
          );
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error fetching current URL",
          });
        }
      },
    });

    return [navigateTool, getCurrentUrlTool];
  }
}
