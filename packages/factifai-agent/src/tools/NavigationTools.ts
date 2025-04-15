import { navigate } from "@factifai/playwright-core";
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

    return [navigateTool];
  }
}
