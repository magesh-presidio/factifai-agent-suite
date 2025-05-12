import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import figures from "figures";
import boxen, { Options as BoxenOptions } from "boxen";
import { table } from "table";
import prettyBytes from "pretty-bytes";
import prettyMs from "pretty-ms";

// Define a type-safe strip-ansi function
const stripAnsi = (text: string): string => {
  // Simple regex to strip ANSI color codes
  return text.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
};

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  logToFile: boolean;
  logFilePath: string;
  logLevel: "debug" | "info" | "warn" | "error";
  useColors: boolean;
  showTimestamp: boolean;
  timestampFormat: "iso" | "locale" | "relative" | "time12";
  logPrefix?: string;
  sessionId?: string;
}

// Get the absolute path to the project root directory
const projectRoot = path.resolve(__dirname, "../../");

// Default configuration
const defaultConfig: LoggerConfig = {
  logToFile: true,
  logFilePath: path.join(projectRoot, "logs", "factifai.log"),
  logLevel: "info",
  useColors: true,
  showTimestamp: true,
  timestampFormat: "time12",
  sessionId: "",
};

// Define spinners and their states
type SpinnerInstance = ReturnType<typeof ora>;
interface SpinnerRegistry {
  [key: string]: SpinnerInstance;
}

/**
 * Enhanced logger implementation with pretty formatting and interactive elements
 */
export const logger = {
  config: { ...defaultConfig },
  spinners: {} as SpinnerRegistry,

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    // Create log directory if it doesn't exist
    this.ensureLogDirectory();
  },
  
  /**
   * Set the session ID and update log file path
   * This method should be called when a new test session starts
   */
  setSessionId(sessionId: string): void {
    if (!sessionId) {
      console.warn(chalk.yellow(`${figures.warning} Empty sessionId provided, using default log path`));
      return;
    }
    
    // Update the sessionId in the configuration
    this.config.sessionId = sessionId;
    
    // Update the log file path to use the session directory structure
    this.config.logFilePath = path.join(process.cwd(), sessionId, "factifai.log");
    
    // Create the new log directory structure
    this.ensureLogDirectory();
    
    this.info(`Log file path updated to session: ${sessionId}`);
  },

  /**
   * Ensure the log directory exists
   */
  ensureLogDirectory(): boolean {
    if (this.config.logToFile) {
      const dir = path.dirname(this.config.logFilePath);
      try {
        fs.mkdirSync(dir, { recursive: true });
        return true;
      } catch (err) {
        console.error(
          chalk.red(
            `${figures.cross} Failed to create log directory: ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        );
        return false;
      }
    }
    return false;
  },

  /**
   * Write a message to the log file
   */
  appendToFile(message: string): void {
    if (!this.config.logToFile) return;

    // Always ensure directory exists before writing (in case it was deleted)
    const dirExists = this.ensureLogDirectory();
    if (!dirExists) {
      console.error(
        chalk.red(
          `${
            figures.cross
          } Cannot write to log file because directory could not be created: ${path.dirname(
            this.config.logFilePath
          )}`
        )
      );
      return;
    }

    try {
      // Strip ANSI color codes when writing to file
      fs.appendFileSync(this.config.logFilePath, stripAnsi(message) + "\n");
    } catch (error) {
      console.error(
        chalk.red(
          `${figures.cross} Failed to write to log file: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  },

  /**
   * Format a log entry with timestamp and metadata
   */
  formatLogEntry(level: string, message: string, args: any[]): string {
    let timestamp = "";

    if (this.config.showTimestamp) {
      const now = new Date();
      switch (this.config.timestampFormat) {
        case "iso":
          timestamp = now.toISOString();
          break;
        case "locale":
          timestamp = now.toLocaleString();
          break;
        case "relative":
          // Show time since process started
          timestamp = prettyMs(process.uptime() * 1000);
        case "time12":
          timestamp = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          });
          break;
      }
    }

    let formattedArgs = "";

    if (args.length > 0) {
      try {
        // Format objects and arrays nicely
        formattedArgs = args
          .map((arg) => {
            if (typeof arg === "object" && arg !== null) {
              return "\n" + JSON.stringify(arg, null, 2);
            }
            return String(arg);
          })
          .join(" ");
      } catch (e) {
        formattedArgs = " [Non-serializable args]";
      }
    }

    const prefix = this.config.logPrefix ? `[${this.config.logPrefix}] ` : "";
    const timestampStr = timestamp ? `[${timestamp}] ` : "";

    // Return plain text version for file logging
    return `${timestampStr}[${level}] ${prefix}${message}${formattedArgs}`;
  },
  
  /**
   * Format a log entry with timestamp and metadata with colors
   */
  formatColorizedLogEntry(level: string, message: string, args: any[]): { metaInfo: string, mainContent: string } {
    let timestamp = "";

    if (this.config.showTimestamp) {
      const now = new Date();
      switch (this.config.timestampFormat) {
        case "iso":
          timestamp = now.toISOString();
          break;
        case "locale":
          timestamp = now.toLocaleString();
          break;
        case "relative":
          // Show time since process started
          timestamp = prettyMs(process.uptime() * 1000);
        case "time12":
          timestamp = now.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          });
          break;
      }
    }

    let formattedArgs = "";

    if (args.length > 0) {
      try {
        // Format objects and arrays nicely
        formattedArgs = args
          .map((arg) => {
            if (typeof arg === "object" && arg !== null) {
              return "\n" + JSON.stringify(arg, null, 2);
            }
            return String(arg);
          })
          .join(" ");
      } catch (e) {
        formattedArgs = " [Non-serializable args]";
      }
    }

    const prefix = this.config.logPrefix ? `[${this.config.logPrefix}] ` : "";
    const timestampStr = timestamp ? `[${timestamp}] ` : "";
    
    // Return the meta information (timestamp and level) as one part and main content as another
    return {
      metaInfo: chalk.gray(`${timestampStr}[${level}] ${prefix}`),
      mainContent: `${message}${formattedArgs}`
    };
  },

  /**
   * Format and colorize log level
   */
  formatLevel(level: string): string {
    if (!this.config.useColors) return `[${level}]`;

    switch (level) {
      case "INFO":
        return chalk.blue(`[${level}]`);
      case "DEBUG":
        return chalk.cyan(`[${level}]`);
      case "WARN":
        return chalk.yellow(`[${level}]`);
      case "ERROR":
        return chalk.red(`[${level}]`);
      case "SUCCESS":
        return chalk.green(`[${level}]`);
      default:
        return `[${level}]`;
    }
  },

  /**
   * Check if the given log level should be displayed
   */
  shouldLog(level: string): boolean {
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    const configLevel = levels[this.config.logLevel] || 1;
    const messageLevel = levels[level.toLowerCase()] || 1;

    return messageLevel >= configLevel;
  },

  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      const formattedEntry = this.formatLogEntry("INFO", message, args);
      
      if (this.config.useColors) {
        const { metaInfo, mainContent } = this.formatColorizedLogEntry("INFO", message, args);
        console.log(chalk.blue(`${figures.info} `) + metaInfo + mainContent);
      } else {
        console.log(formattedEntry);
      }
      
      this.appendToFile(formattedEntry);
    }
  },

  /**
   * Log a success message
   */
  success(message: string, ...args: any[]): void {
    if (this.shouldLog("info")) {
      const formattedEntry = this.formatLogEntry("SUCCESS", message, args);
      
      if (this.config.useColors) {
        const { metaInfo, mainContent } = this.formatColorizedLogEntry("SUCCESS", message, args);
        console.log(chalk.green(`${figures.tick} `) + metaInfo + mainContent);
      } else {
        console.log(formattedEntry);
      }

      this.appendToFile(formattedEntry);
    }
  },

  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    const formattedEntry = this.formatLogEntry("ERROR", message, args);
    
    if (this.config.useColors) {
      const { metaInfo, mainContent } = this.formatColorizedLogEntry("ERROR", message, args);
      console.error(chalk.red(`${figures.cross} `) + metaInfo + mainContent);
    } else {
      console.error(formattedEntry);
    }

    this.appendToFile(formattedEntry);
  },

  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn")) {
      const formattedEntry = this.formatLogEntry("WARN", message, args);
      
      if (this.config.useColors) {
        const { metaInfo, mainContent } = this.formatColorizedLogEntry("WARN", message, args);
        console.warn(chalk.yellow(`${figures.warning} `) + metaInfo + mainContent);
      } else {
        console.warn(formattedEntry);
      }

      this.appendToFile(formattedEntry);
    }
  },

  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug")) {
      const formattedEntry = this.formatLogEntry("DEBUG", message, args);
      
      if (this.config.useColors) {
        const { metaInfo, mainContent } = this.formatColorizedLogEntry("DEBUG", message, args);
        console.debug(chalk.cyan(`${figures.bullet} `) + metaInfo + mainContent);
      } else {
        console.debug(formattedEntry);
      }

      this.appendToFile(formattedEntry);
    }
  },

  /**
   * Create a boxed message
   */
  box(message: string, options?: BoxenOptions): void {
    if (this.shouldLog("info")) {
      const defaultOptions: BoxenOptions = {
        padding: 1,
        borderColor: "blue",
        borderStyle: "round",
      };

      const boxedMessage = boxen(message, { ...defaultOptions, ...options });
      console.log(boxedMessage);

      // Log to file without the box
      this.appendToFile(message);
    }
  },

  /**
   * Create a table from data
   */
  table(data: any[][], options?: any): void {
    if (this.shouldLog("info")) {
      console.log(table(data, options));

      // Log to file in a simpler format
      const tableStr = data.map((row) => row.join("\t")).join("\n");
      this.appendToFile(tableStr);
    }
  },

  /**
   * Create and start a spinner
   */
  spinner(text: string, id?: string): SpinnerInstance {
    const spinnerId = id || `spinner-${Date.now()}`;
    const spinner = ora({
      text,
      color: "blue",
    }).start();

    this.spinners[spinnerId] = spinner;
    return spinner;
  },

  /**
   * Update an existing spinner
   */
  updateSpinner(id: string, text: string): SpinnerInstance | null {
    const spinner = this.spinners[id];
    if (spinner) {
      spinner.text = text;
      return spinner;
    }
    return null;
  },

  /**
   * Stop a spinner with success
   */
  spinnerSuccess(id: string, text?: string): void {
    const spinner = this.spinners[id];
    if (spinner) {
      spinner.succeed(text);
      delete this.spinners[id];

      // Log to file
      if (text) {
        this.appendToFile(this.formatLogEntry("SUCCESS", text, []));
      }
    }
  },

  /**
   * Stop a spinner with error
   */
  spinnerError(id: string, text?: string): void {
    const spinner = this.spinners[id];
    if (spinner) {
      spinner.fail(text);
      delete this.spinners[id];

      // Log to file
      if (text) {
        this.appendToFile(this.formatLogEntry("ERROR", text, []));
      }
    }
  },

  /**
   * Format file size in a human-readable way
   */
  formatBytes(bytes: number): string {
    return prettyBytes(bytes);
  },

  /**
   * Format duration in a human-readable way
   */
  formatDuration(milliseconds: number): string {
    return prettyMs(milliseconds);
  },

  /**
   * Log the start of a task and return a function to log its completion with elapsed time
   */
  task(taskName: string): () => void {
    const startTime = Date.now();
    const spinnerId = `task-${startTime}`;

    this.spinner(taskName, spinnerId);

    return () => {
      const duration = Date.now() - startTime;
      this.spinnerSuccess(
        spinnerId,
        `${taskName} (completed in ${this.formatDuration(duration)})`
      );
    };
  },
};

// Initialize the log directory when module is loaded
logger.ensureLogDirectory();
