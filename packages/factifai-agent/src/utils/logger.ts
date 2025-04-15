import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  logToFile: boolean;
  logFilePath: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Get the absolute path to the project root directory
const projectRoot = path.resolve(__dirname, '../../');

// Default configuration
const defaultConfig: LoggerConfig = {
  logToFile: true,
  logFilePath: path.join(projectRoot, 'logs', 'factifai.log'),
  logLevel: 'info'
};

/**
 * Logger implementation with file writing capabilities
 */
export const logger = {
  config: { ...defaultConfig },
  
  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    // Create log directory if it doesn't exist
    this.ensureLogDirectory();
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
        console.error(`Failed to create log directory: ${err instanceof Error ? err.message : String(err)}`);
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
      console.error(`Cannot write to log file because directory could not be created: ${path.dirname(this.config.logFilePath)}`);
      return;
    }
    
    try {
      fs.appendFileSync(this.config.logFilePath, message + '\n');
      // For debugging - uncomment if needed
      // console.log(`Log written to: ${this.config.logFilePath}`);
    } catch (error) {
      console.error(`Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  
  /**
   * Format a log entry with timestamp and metadata
   */
  formatLogEntry(level: string, message: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    let formattedArgs = '';
    
    if (args.length > 0) {
      try {
        formattedArgs = ' ' + JSON.stringify(args);
      } catch (e) {
        formattedArgs = ' [Non-serializable args]';
      }
    }
    
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  },
  
  /**
   * Log an info message
   */
  info(message: string, ...args: any[]): void {
    if (['debug', 'info', 'warn', 'error'].includes(this.config.logLevel)) {
      console.log(`[INFO] ${message}`, ...args);
      this.appendToFile(this.formatLogEntry('INFO', message, args));
    }
  },
  
  /**
   * Log an error message
   */
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
    this.appendToFile(this.formatLogEntry('ERROR', message, args));
  },
  
  /**
   * Log a warning message
   */
  warn(message: string, ...args: any[]): void {
    if (['debug', 'info', 'warn', 'error'].includes(this.config.logLevel)) {
      console.warn(`[WARN] ${message}`, ...args);
      this.appendToFile(this.formatLogEntry('WARN', message, args));
    }
  },
  
  /**
   * Log a debug message
   */
  debug(message: string, ...args: any[]): void {
    if (['debug'].includes(this.config.logLevel)) {
      console.debug(`[DEBUG] ${message}`, ...args);
      this.appendToFile(this.formatLogEntry('DEBUG', message, args));
    }
  }
};

// Initialize the log directory when module is loaded
logger.ensureLogDirectory();
