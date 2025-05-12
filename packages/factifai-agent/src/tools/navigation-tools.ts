import {
  navigate,
  getCurrentUrl,
  wait,
  reload,
  goBack,
  goForward,
} from "@presidio-dev/playwright-core";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../common/utils/logger";

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
        logger.appendToFile(`Fetching current URL for session ${input.sessionId}`);
        try {
          const result = await getCurrentUrl(input.sessionId);
          logger.info("Current URL:", result.url);
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

    const waitBySecondsTool = new DynamicStructuredTool({
      name: "waitBySeconds",
      description: "Wait for a specified number of seconds before continuing",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
        seconds: z
          .number()
          .describe("Number of seconds to wait (between 1 and 30)"),
      }),
      func: async (input) => {
        logger.info(
          `Waiting for ${input.seconds} seconds in session ${input.sessionId}`
        );
        try {
          const result = await wait(input.sessionId, input.seconds);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error waiting in session ${input.sessionId}:`, error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error during wait operation",
          });
        }
      },
    });

    const reloadTool = new DynamicStructuredTool({
      name: "reload",
      description: "Reload the current page in the browser",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info(`Reloading page for session ${input.sessionId}`);
        try {
          const result = await reload(input.sessionId);
          logger.appendToFile(`Reload result: ${result.success}, URL: ${result.url}`);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error reloading page for session ${input.sessionId}:`, error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error during page reload",
          });
        }
      },
    });

    const goBackTool = new DynamicStructuredTool({
      name: "goBack",
      description: "Navigate back in browser history",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info(`Navigating back in history for session ${input.sessionId}`);
        try {
          const result = await goBack(input.sessionId);
          logger.appendToFile(`Go back result: ${result.success}, URL: ${result.url}`);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error navigating back for session ${input.sessionId}:`, error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error during navigation back",
          });
        }
      },
    });

    const goForwardTool = new DynamicStructuredTool({
      name: "goForward",
      description: "Navigate forward in browser history",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info(`Navigating forward in history for session ${input.sessionId}`);
        try {
          const result = await goForward(input.sessionId);
          logger.appendToFile(`Go forward result: ${result.success}, URL: ${result.url}`);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error navigating forward for session ${input.sessionId}:`, error);
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error during navigation forward",
          });
        }
      },
    });

    return [navigateTool, getCurrentUrlTool, waitBySecondsTool, reloadTool, goBackTool, goForwardTool];
  }
}
