import dotenv from "dotenv";
import { browserAutomationGraph } from "./core/graph/graph";
import boxen from "boxen";
import chalk from "chalk";
import { ConfigManager } from "./common/utils/config-manager";
import { logger } from "./common/utils/logger";
import { BrowserService } from "@presidio-dev/playwright-core";

// Using 'any' for Page type to avoid version conflicts between different playwright installations
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;

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
  sessionId: string,
  options: {
    noReport?: boolean;
    reportFormat?: string;
    skipAnalysis?: boolean;
    skipPlaywright?: boolean;
    existingPage?: Page;  // Inject existing page for workflow orchestration
    scriptFormat?: 'spec' | 'module';  // Script output format: 'spec' (default) or 'module' for reusable functions
  } = {}
) => {
  sessionId = sessionId || `factifai-session-${Date.now()}`;

  // Configure logger to use the session directory for logs
  logger.setSessionId(sessionId);

  // If an existing page is provided, inject it into BrowserService
  if (options.existingPage) {
    const browserService = BrowserService.getInstance();
    await browserService.setExternalPage(sessionId, options.existingPage);
  }

  const runConfig = {
    recursionLimit: 100,
    configurable: { thread_id: sessionId },
  };

  try {
    const result = await browserAutomationGraph.invoke(
      {
        instruction,
        sessionId,
        noReport: options.noReport || false,
        reportFormat: options.reportFormat || "both",
        skipAnalysis: options.skipAnalysis || false,
        skipPlaywright: options.skipPlaywright || false,
        scriptFormat: options.scriptFormat || "spec",
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
export { BrowserService } from "@presidio-dev/playwright-core";
export type { Page } from "playwright";
