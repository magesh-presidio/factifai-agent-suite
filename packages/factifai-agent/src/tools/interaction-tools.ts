import {
  click,
  type,
  clear,
  scrollToNextChunk,
  scrollToPrevChunk,
  scrollBy,
} from "@presidio-dev/playwright-core";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../common/utils/logger";

export class InteractionTools {
  static getTools() {
    const clickBySelectorTool = new DynamicStructuredTool({
      name: "clickBySelector",
      description: "Click on an element in the browser using a CSS selector",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
        selector: z.string().describe("CSS selector for the element to click"),
      }),
      func: async (input) => {
        logger.info(`Clicking element with selector: ${input.selector}`);
        try {
          const result = await click(input.sessionId, input.selector);
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error clicking by selector:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown click error",
          });
        }
      },
    });

    const clickByCoordinatesTool = new DynamicStructuredTool({
      name: "clickByCoordinates",
      description:
        "Click on a specific position in the browser using x,y coordinates",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
      }),
      func: async (input) => {
        logger.info(`Clicking at coordinates: (${input.x}, ${input.y})`);
        try {
          const result = await click(input.sessionId, {
            x: input.x,
            y: input.y,
          });
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error clicking by coordinates:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown click error",
          });
        }
      },
    });

    const typeTool = new DynamicStructuredTool({
      name: "type",
      description: "Type text into the focused element",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
        text: z.string().describe("The text to type"),
      }),
      func: async (input) => {
        logger.info(`Typing text: ${input.text}`);
        try {
          const result = await type(input.sessionId, input.text);
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error typing text:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown typing error",
          });
        }
      },
    });

    const scrollByTool = new DynamicStructuredTool({
      name: "scrollBy",
      description:
        "Scroll the current page by arbitrary pixel offsets (dx, dy)",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
        dx: z.number().describe("Horizontal pixels (+right, -left)"),
        dy: z.number().describe("Vertical pixels (+down, -up)"),
      }),
      func: async (input) => {
        logger.info(`Scrolling by (${input.dx}, ${input.dy}) pixels`);
        try {
          const result = await scrollBy(input.sessionId, input.dx, input.dy);
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error scrolling by:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown scroll error",
          });
        }
      },
    });

    const scrollToNextChunkTool = new DynamicStructuredTool({
      name: "scrollToNextChunk",
      description: "Scroll down by one full viewport height",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info("Scrolling down by one viewport");
        try {
          const result = await scrollToNextChunk(input.sessionId);
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error scrolling down:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown scroll error",
          });
        }
      },
    });

    const scrollToPrevChunkTool = new DynamicStructuredTool({
      name: "scrollToPrevChunk",
      description: "Scroll up by one full viewport height",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info("Scrolling up by one viewport");
        try {
          const result = await scrollToPrevChunk(input.sessionId);
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error scrolling up:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown scroll error",
          });
        }
      },
    });

    const clearInputTool = new DynamicStructuredTool({
      name: "clearInput",
      description: "Clear text from the currently focused input field",
      schema: z.object({
        sessionId: z.string().describe("The browser session ID"),
      }),
      func: async (input) => {
        logger.info("Clearing currently focused input field");
        try {
          const result = await clear(input.sessionId);
          return JSON.stringify(result);
        } catch (error) {
          logger.error("Error clearing input field:", error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown clear error",
          });
        }
      },
    });

    return [
      // clickBySelectorTool,
      clickByCoordinatesTool,
      typeTool,
      clearInputTool,
      scrollToNextChunkTool,
      scrollToPrevChunkTool,
      scrollByTool,
    ];
  }
}
