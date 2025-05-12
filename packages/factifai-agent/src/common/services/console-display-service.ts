import chalk from "chalk";
import stringWidth from "string-width";

/**
 * A service for managing console output with track action display always at the bottom
 */
export class ConsoleDisplayService {
  private static instance: ConsoleDisplayService;
  private trackActionContent: string[] = [];
  private trackActionActive: boolean = false;
  private lastTrackActionLines: number = 0;
  private isUpdating: boolean = false;
  private readonly originalConsoleLog: any;
  private readonly originalConsoleWarn: any;
  private readonly originalConsoleError: any;
  private terminalWidth: number = process.stdout.columns || 80;
  private isResizing: boolean = false;
  private resizeTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    // Store original console methods
    this.originalConsoleLog = console.log;
    this.originalConsoleWarn = console.warn;
    this.originalConsoleError = console.error;

    // Listen for terminal resize events
    process.stdout.on("resize", () => {
      this.isResizing = true;

      // Clear any previous resize timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      // Set a timeout to handle the resize
      this.resizeTimeout = setTimeout(() => {
        // Update terminal width
        this.terminalWidth = process.stdout.columns || 80;

        // If track action is active, completely redraw
        if (this.trackActionActive) {
          // First clear
          this.clearTrackActionDisplay();

          // Then redraw
          this.redrawTrackActionDisplay();
        }

        // Mark resize as done
        this.isResizing = false;
      }, 100); // Small delay to ensure terminal is fully resized
    });

    // Override console methods to work with our display
    this.setupConsoleOverrides();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ConsoleDisplayService {
    if (!this.instance) {
      this.instance = new ConsoleDisplayService();
    }
    return this.instance;
  }

  /**
   * Calculate how many terminal lines a string will take due to wrapping
   */
  private calculateLines(str: string): number {
    // Strip ANSI color codes for width calculation
    const plainText = str.replace(/\u001b\[\d+m/g, "");

    // Handle case where string-width is not available
    const width =
      typeof stringWidth === "function"
        ? stringWidth(plainText)
        : plainText.length;

    // Calculate lines needed (at least 1, even for empty strings)
    return Math.max(1, Math.ceil(width / Math.max(1, this.terminalWidth)));
  }

  /**
   * Calculate total lines required for all content
   */
  private calculateTotalLines(content: string[]): number {
    return content.reduce(
      (total, line) => total + this.calculateLines(line),
      0
    );
  }

  /**
   * Override console methods to ensure track action display stays at bottom
   */
  private setupConsoleOverrides(): void {
    const service = this;

    // Override console.log
    console.log = function (...args: any[]): void {
      // Skip special handling during resize operations
      if (service.isResizing) {
        service.originalConsoleLog.apply(console, args);
        return;
      }

      // If track action is active, clear it first
      if (service.trackActionActive) {
        service.clearTrackActionDisplay();
      }

      // Call original console.log
      service.originalConsoleLog.apply(console, args);

      // Redraw track action if it was active
      if (service.trackActionActive) {
        service.redrawTrackActionDisplay();
      }
    };

    // Override console.warn
    console.warn = function (...args: any[]): void {
      // Skip special handling during resize operations
      if (service.isResizing) {
        service.originalConsoleWarn.apply(console, args);
        return;
      }

      // If track action is active, clear it first
      if (service.trackActionActive) {
        service.clearTrackActionDisplay();
      }

      // Call original console.warn
      service.originalConsoleWarn.apply(console, args);

      // Redraw track action if it was active
      if (service.trackActionActive) {
        service.redrawTrackActionDisplay();
      }
    };

    // Override console.error
    console.error = function (...args: any[]): void {
      // Skip special handling during resize operations
      if (service.isResizing) {
        service.originalConsoleError.apply(console, args);
        return;
      }

      // If track action is active, clear it first
      if (service.trackActionActive) {
        service.clearTrackActionDisplay();
      }

      // Call original console.error
      service.originalConsoleError.apply(console, args);

      // Redraw track action if it was active
      if (service.trackActionActive) {
        service.redrawTrackActionDisplay();
      }
    };
  }

  /**
   * Standard log function
   */
  public log(
    message: string,
    type: "info" | "warn" | "error" | "success" = "info"
  ): void {
    switch (type) {
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        break;
      case "success":
      case "info":
      default:
        console.log(message);
        break;
    }
  }

  /**
   * Safely move cursor up with a maximum limit
   */
  private safeCursorUp(lines: number): void {
    // Ensure we don't try to move up more lines than reasonable
    // We use a safety limit to prevent issues
    const safeLines = Math.min(lines, 1000);

    if (safeLines > 0) {
      process.stdout.write(`\x1b[${safeLines}A`);
    }
  }

  /**
   * Clear the track action display area
   */
  private clearTrackActionDisplay(): void {
    if (
      this.trackActionActive &&
      this.lastTrackActionLines > 0 &&
      !this.isResizing
    ) {
      try {
        // Move cursor up to the start of the track action display
        this.safeCursorUp(this.lastTrackActionLines);

        // Clear from cursor to end of screen
        process.stdout.write("\x1b[0J");
      } catch (error) {
        // If something goes wrong, log it but don't crash
        this.originalConsoleLog.call(
          console,
          chalk.red(
            `Display service error: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    }
  }

  /**
   * Redraw the track action display
   */
  private redrawTrackActionDisplay(): void {
    if (this.trackActionActive) {
      try {
        // Count the actual lines after wrapping that will be printed
        let totalLinesUsed = 0;

        // Print all lines of the track action content
        for (const line of this.trackActionContent) {
          this.originalConsoleLog.call(console, line);

          // Calculate lines this content took due to wrapping
          const linesUsed = this.calculateLines(line);
          totalLinesUsed += linesUsed;
        }

        // Update the line count
        this.lastTrackActionLines = totalLinesUsed;
      } catch (error) {
        // If something goes wrong, log it but don't crash
        this.originalConsoleLog.call(
          console,
          chalk.red(
            `Display service error: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
        // Reset line count to prevent display issues
        this.lastTrackActionLines = 0;
      }
    }
  }

  /**
   * Update the track action display with new content
   * @param content Array of lines to display in the track action area
   */
  public updateTrackActionDisplay(content: string[]): void {
    // Don't update if we're already updating or resizing to prevent race conditions
    if (this.isUpdating || this.isResizing) {
      setTimeout(() => this.updateTrackActionDisplay(content), 10);
      return;
    }

    this.isUpdating = true;

    try {
      // Initialize the display if it's not active yet
      if (!this.trackActionActive) {
        this.trackActionActive = true;
        this.lastTrackActionLines = 0;
      }

      // Truncate any lines that would cause excessive wrapping to prevent display issues
      const maxLineLength = this.terminalWidth * 4; // Allow reasonable wrapping but prevent excess
      const processedContent = content.map((line) => {
        const plainLine = line.replace(/\u001b\[\d+m/g, ""); // Remove ANSI codes for length check
        if (plainLine.length > maxLineLength) {
          return line.slice(0, maxLineLength) + "...";
        }
        return line;
      });

      // Update the content
      this.trackActionContent = [...processedContent];

      // Skip redraw if we're resizing
      if (!this.isResizing) {
        // Clear and redraw
        this.clearTrackActionDisplay();
        this.redrawTrackActionDisplay();
      }
    } catch (error) {
      // Log error without using our overridden methods
      this.originalConsoleError.call(
        console,
        `Display service error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Clean up the track action display and restore original console methods
   */
  public cleanup(): void {
    if (this.trackActionActive) {
      this.clearTrackActionDisplay();
      this.trackActionActive = false;
      this.lastTrackActionLines = 0;
      this.trackActionContent = [];
    }

    // Restore original console methods
    console.log = this.originalConsoleLog;
    console.warn = this.originalConsoleWarn;
    console.error = this.originalConsoleError;
  }
}

// Export a configured logger that uses the ConsoleDisplayService
export const enhancedLogger = {
  service: ConsoleDisplayService.getInstance(),

  info(message: string): void {
    this.service.log(message, "info");
  },

  warn(message: string): void {
    this.service.log(message, "warn");
  },

  error(message: string): void {
    this.service.log(message, "error");
  },

  success(message: string): void {
    this.service.log(message, "success");
  },

  trackAction(content: string[]): void {
    this.service.updateTrackActionDisplay(content);
  },

  /**
   * Clean up the track action display
   */
  cleanup(): void {
    this.service.cleanup();
  },
};
