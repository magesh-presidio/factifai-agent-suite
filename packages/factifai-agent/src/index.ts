import dotenv from "dotenv";
import { browserAutomationGraph } from "./core/graph/graph";
import boxen from "boxen";
import chalk from "chalk";
import { ConfigManager } from "./common/utils/config-manager";
import { logger } from "./common/utils/logger";

// Initialize configuration manager
ConfigManager.initialize();
ConfigManager.applyToEnvironment();

// Load environment variables from .env file (lower priority than config)
dotenv.config();

/**
 * Displays the FACTIFAI logo in a minimal, pretty box
 */
export const displayFactifaiLogo = (): void => {
  const logo = `█▀▀ ▄▀█ █▀▀ ▀█▀ █ █▀▀ ▄▀█ █
█▀  █▀█ █▄▄  █  █ █▀  █▀█ █`;

  // Create a minimal box with the logo
  const boxedLogo = boxen(chalk.blue(logo), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: "round",
    borderColor: "blue",
    float: "left",
  });

  // Display the boxed logo
  console.log(boxedLogo);
};

export const executeBrowserTask = async (
  instruction: string,
  sessionId: string
) => {
  sessionId = sessionId || `factifai-session-${Date.now()}`;
  
  // Configure logger to use the session directory for logs
  logger.setSessionId(sessionId);

  const runConfig = {
    recursionLimit: 100,
    configurable: { thread_id: sessionId },
  };

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
      },
      runConfig
    );

    if (result.lastError) {
      console.error("Execution failed:", result.lastError);
      return {
        success: false,
        error: result.lastError,
        testSteps: result.testSteps,
        testSummary: result.testSummary,
      };
    }

    return {
      success: true,
      testSteps: result.testSteps,
      testSummary: result.testSummary,
    };
  } catch (error) {
    console.error("Execution error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      testSteps: [],
      testSummary: null,
    };
  }
};

export * from "./core/graph/graph";
