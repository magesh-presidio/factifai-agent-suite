#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { executeBrowserTask, displayFactifaiLogo } from "./index";
import dotenv from "dotenv";
import { ConfigManager } from "./common/utils/config-manager";

// Initialize configuration
ConfigManager.initialize();
ConfigManager.applyToEnvironment();

// Load environment variables from .env file (lower priority than config)
dotenv.config();

/**
 * Validates that the required environment variables are set based on the selected model provider
 * @returns Object with validation result and error message if validation fails
 */
function validateEnvironmentVariables(): { valid: boolean; message?: string } {
  const modelProvider = process.env.MODEL_PROVIDER?.toLowerCase();

  if (modelProvider === "openai") {
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return {
        valid: false,
        message:
          "OPENAI_API_KEY is required when using the OpenAI model. Please set this environment variable.",
      };
    }
  } else if (modelProvider === "bedrock") {
    // Check AWS credentials
    const missingCredentials = [];

    if (!process.env.AWS_ACCESS_KEY_ID) {
      missingCredentials.push("AWS_ACCESS_KEY_ID");
    }

    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      missingCredentials.push("AWS_SECRET_ACCESS_KEY");
    }

    if (!process.env.AWS_DEFAULT_REGION) {
      missingCredentials.push("AWS_DEFAULT_REGION");
    }

    if (missingCredentials.length > 0) {
      return {
        valid: false,
        message: `The following AWS credentials are required when using the Bedrock model: ${missingCredentials.join(
          ", "
        )}. Please set these environment variables.`,
      };
    }
  }

  // All required environment variables are set
  return { valid: true };
}

// Create a flag to track if the app is in the process of shutting down
let shuttingDown = false;

// Define cleanup function for graceful shutdown
async function cleanup() {
  // Prevent cleanup from running multiple times
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log("\nReceived termination signal. Cleaning up...");

  try {
    // Get instance of BrowserService to close browsers
    const { BrowserService } = await import("@presidio-dev/playwright-core");
    const browserService = BrowserService.getInstance();

    // Close all active browser sessions
    console.log("Closing browser sessions...");
    await browserService.closeAll();
    console.log("All browser sessions closed.");

    // Add a small delay to allow other async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (error) {
    console.error("Error during cleanup:", error);
  }

  // Force exit after cleanup
  console.log("Exiting application...");
  process.exit(0);
}

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Only exit if not already shutting down
  if (!shuttingDown) {
    cleanup();
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Only exit if not already shutting down
  if (!shuttingDown) {
    cleanup();
  }
});

// Register signal handlers
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// Define CLI
const cli = yargs(hideBin(process.argv))
  .scriptName("factifai-agent")
  .usage("$0 <cmd> [args]")
  .option("model", {
    alias: "m",
    type: "string",
    describe: "Model provider to use (openai or bedrock)",
    choices: ["openai", "bedrock"],
  })
  .example('$0 run "Navigate to duckduckgo.com"', "Run with direct instruction")
  .example("$0 run --file ./tests/my-test.txt", "Run from a file")
  .example(
    '$0 run --model openai "Navigate to duckduckgo.com"',
    "Run with OpenAI model"
  )
  .command(
    "run [instruction]",
    "Run a browser automation task (use direct instruction or --file)",
    (yargs) => {
      return yargs
        .positional("instruction", {
          describe: "The test instruction to execute",
          type: "string",
          demandOption: false,
        })
        .option("session", {
          alias: "s",
          type: "string",
          describe: "Session ID to use",
          default: `factifai-session-${Date.now()}`,
        })
        .option("file", {
          alias: "f",
          type: "string",
          describe: "Path to a file containing test instructions",
        })
        .example(
          '$0 run "Check if google.com loads"',
          "Run with inline instruction"
        )
        .example(
          "$0 run --file ./examples/sample-test.txt",
          "Run test from file"
        )
        .example(
          "$0 run -f ./tests/checkout.txt -s my-session",
          "Run from file with custom session"
        )
        .check((argv) => {
          // Ensure either instruction or file is provided
          if (!argv.instruction && !argv.file) {
            throw new Error(
              "You must provide either an instruction or a file path"
            );
          }
          return true;
        });
    },
    async (argv) => {
      // Display logo
      displayFactifaiLogo();

      let instruction: string;

      // If file option is provided, read the instruction from the file
      if (argv.file) {
        try {
          const fs = require("fs");
          instruction = fs.readFileSync(argv.file, "utf8");
          console.log(`Running task with instructions from file: ${argv.file}`);
        } catch (error) {
          console.error(
            `Error reading file: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          process.exit(1);
        }
      } else {
        // Otherwise use the provided instruction
        instruction = argv.instruction as string;
        console.log(`Running task with instruction provided on command line`);
      }

      // Set the model provider from CLI option
      if (argv.model) {
        process.env.MODEL_PROVIDER = argv.model as string;
        console.log(`Using model provider: ${argv.model}`);
      }

      console.log(`Session ID: ${argv.session}`);

      // Check if model provider is specified
      if (!process.env.MODEL_PROVIDER && !argv.model) {
        console.error(
          "Error: No model provider specified. Please use --model option or set MODEL_PROVIDER environment variable."
        );
        process.exit(1);
      }

      // Validate required environment variables based on the selected model provider
      const validationResult = validateEnvironmentVariables();
      if (!validationResult.valid) {
        console.error("\n❌ Configuration Error:");
        console.error(validationResult.message);
        console.error(
          "\nPlease check your environment variables or use the appropriate CLI options."
        );
        process.exit(1);
      }

      // Print current provider and model information
      console.log("\n📋 Execution Configuration:");
      console.log(`- Provider: ${process.env.MODEL_PROVIDER}`);
      if (process.env.MODEL_PROVIDER === "openai") {
        console.log(`- Model: ${process.env.OPENAI_MODEL || "gpt-4.1"}`);
      } else if (process.env.MODEL_PROVIDER === "bedrock") {
        console.log(
          `- Model: ${
            process.env.BEDROCK_MODEL ||
            "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
          }`
        );
      }
      console.log(""); // Empty line for better readability

      try {
        const result = await executeBrowserTask(
          instruction,
          argv.session as string
        );

        if (result.success) {
          console.log("\n✅ Task completed successfully!");
        } else {
          console.error("\n❌ Task failed:", result.error);
        }

        process.exit(result.success ? 0 : 1);
      } catch (error) {
        // Check for specific environment variable errors
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("OPENAI_API_KEY is required") ||
          errorMessage.includes("AWS credentials are required") ||
          errorMessage.includes("No model provider specified")
        ) {
          console.error("\n❌ Configuration Error:");
          console.error(errorMessage);
          console.error(
            "\nPlease check your environment variables or use the appropriate CLI options."
          );
        } else {
          console.error("Error executing task:", error);
        }

        process.exit(1);
      }
    }
  )
  .command(
    "config",
    "Configure settings and API keys",
    (yargs) => {
      return yargs
        .option("show", {
          type: "boolean",
          describe: "Show current configuration",
          default: false,
        })
        .option("set", {
          type: "string",
          describe: "Set a configuration value (key=value)",
        })
        .option("model", {
          type: "string",
          describe: "Set the default model provider",
          choices: ["openai", "bedrock"],
        });
    },
    (argv) => {
      if (argv.show) {
        // Get all configs from the persistent store
        const config = ConfigManager.getAll();

        console.log("Current configuration:");
        console.log(
          `- MODEL_PROVIDER: ${
            process.env.MODEL_PROVIDER ||
            config.MODEL_PROVIDER ||
            "Not set - you must specify a model provider"
          }`
        );

        // Show OpenAI configuration
        console.log("\nOpenAI Configuration:");
        console.log(
          `- OPENAI_MODEL: ${
            process.env.OPENAI_MODEL || config.OPENAI_MODEL || "gpt-4.1"
          }`
        );
        const openaiKeyStatus = process.env.OPENAI_API_KEY
          ? "******** (Set in environment)"
          : config.OPENAI_API_KEY
          ? "******** (Set in config)"
          : "Not set" +
            (process.env.MODEL_PROVIDER === "openai" ? " - Required!" : "");
        console.log(`- OPENAI_API_KEY: ${openaiKeyStatus}`);

        // Show Bedrock configuration
        console.log("\nAWS Bedrock Configuration:");
        console.log(
          `- BEDROCK_MODEL: ${
            process.env.BEDROCK_MODEL ||
            config.BEDROCK_MODEL ||
            "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
          }`
        );

        const regionStatus = process.env.AWS_DEFAULT_REGION
          ? process.env.AWS_DEFAULT_REGION + " (set in environment)"
          : config.AWS_DEFAULT_REGION
          ? config.AWS_DEFAULT_REGION + " (set in config)"
          : "Not set" +
            (process.env.MODEL_PROVIDER === "bedrock" ? " - Required!" : "");
        console.log(`- AWS_DEFAULT_REGION: ${regionStatus}`);

        const accessKeyStatus = process.env.AWS_ACCESS_KEY_ID
          ? "******** (Set in environment)"
          : config.AWS_ACCESS_KEY_ID
          ? "******** (Set in config)"
          : "Not set" +
            (process.env.MODEL_PROVIDER === "bedrock" ? " - Required!" : "");
        console.log(`- AWS_ACCESS_KEY_ID: ${accessKeyStatus}`);

        const secretKeyStatus = process.env.AWS_SECRET_ACCESS_KEY
          ? "******** (Set in environment)"
          : config.AWS_SECRET_ACCESS_KEY
          ? "******** (Set in config)"
          : "Not set" +
            (process.env.MODEL_PROVIDER === "bedrock" ? " - Required!" : "");
        console.log(`- AWS_SECRET_ACCESS_KEY: ${secretKeyStatus}`);

        console.log(`\nConfiguration location: ${ConfigManager.configPath}`);
      } else if (argv.set) {
        const [key, value] = (argv.set as string).split("=");

        if (!key || !value) {
          console.error("Invalid format. Use --set KEY=VALUE");
          return;
        }

        console.log(`Setting ${key} to ${value}`);

        // Set in persistent config
        const success = ConfigManager.set(key, value);

        if (success) {
          // Also set in current environment
          process.env[key] = value;
          console.log(`✅ Configuration value ${key} has been set to ${value}`);
          console.log(`   This setting will persist for future runs.`);

          // Add additional instructions based on what was set
          if (key === "MODEL_PROVIDER") {
            console.log(`\nYou've set the model provider to: ${value}`);

            // Validate required environment variables for the selected model provider
            const validationResult = validateEnvironmentVariables();
            if (!validationResult.valid) {
              console.warn("\n⚠️ Warning:");
              console.warn(validationResult.message);
              console.warn(
                "You may need to set additional credentials for this model provider."
              );

              if (value === "openai") {
                console.log("\nYou can set your OpenAI API key with:");
                console.log(
                  "  factifai-agent config --set OPENAI_API_KEY=your-api-key"
                );
              } else if (value === "bedrock") {
                console.log("\nYou can set your AWS credentials with:");
                console.log(
                  "  factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key"
                );
                console.log(
                  "  factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-key"
                );
                console.log(
                  "  factifai-agent config --set AWS_DEFAULT_REGION=your-region"
                );
              }
            }
          }
        } else {
          console.error(`❌ Failed to set configuration value ${key}.`);
        }
      } else if (argv.model) {
        // Set the model provider in persistent config
        const modelValue = argv.model as string;
        const success = ConfigManager.set("MODEL_PROVIDER", modelValue);

        if (success) {
          // Also set in current process
          process.env.MODEL_PROVIDER = modelValue;
          console.log(`✅ Default model provider set to: ${modelValue}`);
          console.log(`   This setting will persist for future runs.`);

          // Validate required environment variables for the selected model provider
          const validationResult = validateEnvironmentVariables();
          if (!validationResult.valid) {
            console.warn("\n⚠️ Warning:");
            console.warn(validationResult.message);
            console.warn(
              "You may need to set additional credentials for this model provider."
            );

            if (modelValue === "openai") {
              console.log("\nYou can set your OpenAI API key with:");
              console.log(
                "  factifai-agent config --set OPENAI_API_KEY=your-api-key"
              );
            } else if (modelValue === "bedrock") {
              console.log("\nYou can set your AWS credentials with:");
              console.log(
                "  factifai-agent config --set AWS_ACCESS_KEY_ID=your-access-key"
              );
              console.log(
                "  factifai-agent config --set AWS_SECRET_ACCESS_KEY=your-secret-key"
              );
              console.log(
                "  factifai-agent config --set AWS_DEFAULT_REGION=your-region"
              );
            }
          } else {
            console.log(
              "All required environment variables for this model provider are set."
            );
          }
        } else {
          console.error(`❌ Failed to set model provider to ${modelValue}.`);
        }
      } else {
        console.log("Configuration options:");
        console.log("- Use --show to display current configuration");
        console.log("- Use --set key=value to set a configuration value");
      }
    }
  )
  .command(
    "models",
    "List and manage available models",
    (yargs) => {
      return yargs.option("list", {
        alias: "l",
        type: "boolean",
        describe: "List all available models",
        default: true,
      });
    },
    (argv) => {
      console.log("Available model providers:");

      // Check if OpenAI credentials are set
      const openaiReady = !!process.env.OPENAI_API_KEY;

      // OpenAI model information
      console.log("\n1. openai - OpenAI models");
      console.log(
        `   - Current model: ${process.env.OPENAI_MODEL || "gpt-4.1"}`
      );
      console.log(
        `   - API Key: ${
          process.env.OPENAI_API_KEY ? "******** (Set)" : "Not set"
        }`
      );
      console.log("   - Required env variables: OPENAI_API_KEY");
      console.log(
        `   - Status: ${
          openaiReady ? "✅ Ready to use" : "❌ Missing required credentials"
        }`
      );

      // Check if Bedrock credentials are set
      const bedrockReady = !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_DEFAULT_REGION
      );

      // Bedrock model information
      console.log("\n2. bedrock - AWS Bedrock models");
      console.log(
        `   - Current model: ${
          process.env.BEDROCK_MODEL ||
          "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
        }`
      );
      console.log(
        `   - AWS Region: ${process.env.AWS_DEFAULT_REGION || "Not set"}`
      );
      console.log(
        `   - AWS Credentials: ${
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? "Set"
            : "Not set"
        }`
      );
      console.log(
        "   - Required env variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION"
      );
      console.log(
        `   - Status: ${
          bedrockReady ? "✅ Ready to use" : "❌ Missing required credentials"
        }`
      );

      console.log(
        "\nCurrent provider:",
        process.env.MODEL_PROVIDER ||
          "Not set - you must specify a model provider"
      );
      console.log("\nTo change the model provider:");
      console.log('  factifai-agent --model openai run "your instruction"');
      console.log("  factifai-agent config --model bedrock");
    }
  )
  .demandCommand(1, "You must provide a valid command")
  .help()
  .alias("h", "help")
  .version()
  .alias("v", "version")
  .epilogue(
    "For more information, visit https://factifai.io\nFile format: Use .txt or .md format for test instructions in files."
  );

// Parse arguments
cli.parse();
