import * as fs from "fs";
import * as path from "path";
import { getSessionSubdirPath } from "../../../../common/utils/path-utils";
import { logger } from "../../../../common/utils/logger";


// Define constants for the playwright directory structure
export const PLAYWRIGHT_DIR_NAME = 'playwright';
export const ACTIONS_SUBDIR_NAME = 'actions';
export const SCRIPTS_SUBDIR_NAME = 'scripts';

/**
 * Store a successful action by appending to actions.json file
 * @param sessionId The session ID
 * @param action The action data to store
 * @returns Path to the actions file
 */
export function storeSuccessfulAction(sessionId: string, action: any): string {
  try {
    // Add timestamp if not present
    if (!action.timestamp) {
      action.timestamp = Date.now() / 1000; // Convert to seconds to match format
    }
    
    // Create directory path: sessionId/playwright/actions
    const playwrightDir = getSessionSubdirPath(sessionId, PLAYWRIGHT_DIR_NAME);
    const actionsDir = path.join(playwrightDir, ACTIONS_SUBDIR_NAME);

    // Ensure the actions directory exists
    if (!fs.existsSync(actionsDir)) {
      fs.mkdirSync(actionsDir, { recursive: true });
    }
    
    // Create the actions filename
    const filename = `actions.json`;
    
    // Full path to the actions file
    const actionsPath = path.join(actionsDir, filename);
    
    // Read existing actions or create empty array
    let actions: any[] = [];
    if (fs.existsSync(actionsPath)) {
      try {
        const fileContent = fs.readFileSync(actionsPath, 'utf-8');
        actions = JSON.parse(fileContent);
      } catch (readError) {
        logger.warn(`Error reading actions file, creating new one: ${readError instanceof Error ? readError.message : String(readError)}`);
      }
    }
    
    // Add the new action
    actions.push(action);
    
    // Write the updated actions to the file
    fs.writeFileSync(actionsPath, JSON.stringify(actions, null, 2));
    
    logger.appendToFile(`PLAYWRIGHT_ACTION_STORED: ${JSON.stringify(action)}`);
    
    return actionsPath;
  } catch (error) {
    logger.error(`Error storing Playwright action: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get all actions for a session from the actions.json file
 * @param sessionId The session ID
 * @returns Array of stored actions
 */
export function getSessionActions(sessionId: string): any[] {
  try {
    // Get the path to the actions file
    const actionsPath = getActionsFilePath(sessionId);

    // Check if the file exists
    if (!fs.existsSync(actionsPath)) {
      return [];
    }
    
    // Read and parse the actions file
    const fileContent = fs.readFileSync(actionsPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    logger.error(`Error reading actions file: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Get the path to the actions.json file for a session
 * @param sessionId The session ID
 * @returns Path to the actions file
 */
export function getActionsFilePath(sessionId: string): string {
  const playwrightDir = getSessionSubdirPath(sessionId, PLAYWRIGHT_DIR_NAME);
  const actionsDir = path.join(playwrightDir, ACTIONS_SUBDIR_NAME);
  return path.join(actionsDir, 'actions.json');
}

/**
 * Get the path to the scripts directory for a session
 * @param sessionId The session ID
 * @returns Path to the scripts directory
 */
export function getScriptsDirectoryPath(sessionId: string): string {
  const playwrightDir = getSessionSubdirPath(sessionId, PLAYWRIGHT_DIR_NAME);
  return path.join(playwrightDir, SCRIPTS_SUBDIR_NAME);
}

/**
 * Process and store successful action from messages
 * @param sessionId The session ID
 * @param messages Array of messages to search for tool calls
 * @param verificationExplanation Optional explanation from verification result
 * @returns void
 */
export function processSuccessfulAction(sessionId: string, messages: any[], verificationExplanation?: string): void {
  // Look for tool calls and their responses in messages
  let toolCallData = null;
  let toolResponse = null;

  // Check previous messages for the most recent tool call and its response
  if (messages && messages.length > 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];

      // Look for tool call
      if (msg && msg.tool_calls && msg.tool_calls.length > 0) {
        const lastToolCall = msg.tool_calls[msg.tool_calls.length - 1];
        toolCallData = {
          name: lastToolCall.name,
          args: lastToolCall.args
        };

        // Look for corresponding tool response in subsequent messages
        for (let j = i + 1; j < messages.length; j++) {
          const responseMsg = messages[j];
          if (responseMsg && responseMsg.content) {
            try {
              const parsedResponse = JSON.parse(responseMsg.content);
              if (parsedResponse && typeof parsedResponse === 'object') {
                toolResponse = parsedResponse;
                break;
              }
            } catch (e) {
              // Not a JSON response, continue looking
            }
          }
        }
        break;
      }
    }
  }

  if (toolCallData) {
    logger.appendToFile(`DEBUG: Found tool call: ${toolCallData.name} with args: ${JSON.stringify(toolCallData.args)}`);

    // Map tool call to action format
    let actionData = null;

    switch (toolCallData.name) {
      case 'clickByCoordinates':
        actionData = {
          tool: "click",
          args: {
            coordinates: {
              x: toolCallData.args.x,
              y: toolCallData.args.y
            }
          }
        };

        // Get element data from tool response (captured at click time)
        if (toolResponse && toolResponse.element) {
          (actionData.args as any).element = toolResponse.element;
        }

        break;
      case 'type':
        actionData = {
          tool: "type_text",
          args: {
            text: toolCallData.args.text
          }
        };
        break;
      case 'navigate':
        actionData = {
          tool: "navigate",
          args: {
            url: toolCallData.args.url
          }
        };
        break;
      case 'waitBySeconds':
        actionData = {
          tool: "wait",
          args: {
            seconds: toolCallData.args.seconds
          }
        };
        break;
      case 'reload':
        actionData = {
          tool: "reload",
          args: {}
        };
        break;
      case 'goBack':
        actionData = {
          tool: "go_back",
          args: {}
        };
        break;
      case 'goForward':
        actionData = {
          tool: "go_forward",
          args: {}
        };
        break;
      case 'scrollToNextChunk':
        actionData = {
          tool: "scroll",
          args: {
            direction: "down"
          }
        };
        break;
      case 'scrollToPrevChunk':
        actionData = {
          tool: "scroll",
          args: {
            direction: "up"
          }
        };
        break;
      case 'clearInput':
        actionData = {
          tool: "clear",
          args: {}
        };
        break;
      case 'scrollBy':
        actionData = {
          tool: "scroll",
          args: {
            x: toolCallData.args.dx,
            y: toolCallData.args.dy
          }
        };
        break;
      // Add other tool mappings as needed
    }

    if (actionData) {
      // Add verification explanation as description if available
      if (verificationExplanation) {
        (actionData as any).description = verificationExplanation;
      }

      // Store the successful action
      storeSuccessfulAction(sessionId, actionData);
    }
  }
}