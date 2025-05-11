import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Configuration manager for the factifai-agent CLI
 * Handles persistent storage of configuration settings
 */
export class ConfigManager {
  private static configDir: string;
  private static _configPath: string;
  private static config: Record<string, string> = {};
  private static isInitialized = false;

  /**
   * Get the path to the configuration file
   */
  public static get configPath(): string {
    if (!this.isInitialized) this.initialize();
    return this._configPath;
  }

  /**
   * Initialize the configuration manager
   * This sets up the config directory and loads existing config
   */
  public static initialize(): void {
    if (this.isInitialized) return;

    // Set up config directory
    this.configDir = path.join(os.homedir(), '.factifai');
    this._configPath = path.join(this.configDir, 'config.json');

    // Create config directory if it doesn't exist
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Load existing config or create new one
    this.loadConfig();
    this.isInitialized = true;
  }

  /**
   * Load configuration from disk
   * If no config file exists, creates an empty one
   */
  private static loadConfig(): void {
    try {
      if (fs.existsSync(this._configPath)) {
        const fileContent = fs.readFileSync(this._configPath, 'utf8');
        this.config = JSON.parse(fileContent);
      } else {
        // Create default config
        this.config = {};
        this.saveConfig();
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Fall back to empty config if there's an error
      this.config = {};
    }
  }

  /**
   * Save configuration to disk
   */
  private static saveConfig(): void {
    try {
      fs.writeFileSync(this._configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }

  /**
   * Set a configuration value
   * @param key Configuration key
   * @param value Configuration value
   * @returns true if successful, false otherwise
   */
  public static set(key: string, value: string): boolean {
    if (!this.isInitialized) this.initialize();
    
    try {
      this.config[key] = value;
      this.saveConfig();
      return true;
    } catch (error) {
      console.error(`Error setting configuration value ${key}:`, error);
      return false;
    }
  }

  /**
   * Get a configuration value
   * @param key Configuration key
   * @param defaultValue Default value to return if key doesn't exist
   * @returns The configuration value or defaultValue if not found
   */
  public static get(key: string, defaultValue?: string): string | undefined {
    if (!this.isInitialized) this.initialize();
    
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get all configuration values
   * @returns All configuration key-value pairs
   */
  public static getAll(): Record<string, string> {
    if (!this.isInitialized) this.initialize();
    
    return { ...this.config };
  }
  
  /**
   * Check if a configuration key exists
   * @param key Configuration key
   * @returns true if the key exists, false otherwise
   */
  public static has(key: string): boolean {
    if (!this.isInitialized) this.initialize();
    
    return this.config[key] !== undefined;
  }
  
  /**
   * Apply configuration to environment variables
   * This allows config values to be used in the application via process.env
   */
  public static applyToEnvironment(): void {
    if (!this.isInitialized) this.initialize();
    
    Object.entries(this.config).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }
}
