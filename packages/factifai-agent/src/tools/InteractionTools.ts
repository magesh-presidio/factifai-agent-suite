import { click, type } from "@factifai/playwright-core";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "../utils/logger";

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
          console.log("Click by selector result:", result.success);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error clicking by selector:`, error);
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
          console.log("Click by coordinates result:", result.success);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error clicking by coordinates:`, error);
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
          console.log("Type result:", result.success);
          return JSON.stringify(result);
        } catch (error) {
          logger.error(`Error typing text:`, error);
          return JSON.stringify({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown typing error",
          });
        }
      },
    });

    return [clickByCoordinatesTool, typeTool];
  }
}
