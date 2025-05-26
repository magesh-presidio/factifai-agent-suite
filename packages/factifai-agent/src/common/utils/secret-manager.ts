import path from "path";
import os from "os";
import fs from "fs";

export class SecretManager {
  private static configDir: string;
  private static _secretsPath: string;
  private static secrets: Record<string, string> = {};
  private static isInitialized = false;

  /**
   * Get the path to the secrets file
   */
  public static get secretsPath(): string {
    this.ensureInitialized();
    return this._secretsPath;
  }

  /**
   * Ensure the secret manager is initialized
   * This is a helper method to reduce code duplication
   */
  private static ensureInitialized(): void {
    if (!this.isInitialized) this.initialize();
  }

  /**
   * Initialize the secret manager
   * This sets up the secrets directory and loads existing secrets
   */
  public static initialize(): void {
    if (this.isInitialized) return;

    // Set up secrets directory
    this.configDir = path.join(os.homedir(), '.factifai');
    this._secretsPath = path.join(this.configDir, 'secret.json');

    // Create secrets directory if it doesn't exist
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Load existing secrets or create new ones
    this.loadSecrets();
    this.isInitialized = true;
  }

  /**
   * Load secrets from disk
   * If no secrets file exists, creates an empty one
   */
  private static loadSecrets(): void {
    try {
      if (fs.existsSync(this._secretsPath)) {
        const fileContent = fs.readFileSync(this._secretsPath, 'utf8');
        this.secrets = JSON.parse(fileContent);
      } else {
        // Create default empty secrets
        this.secrets = {};
        this.saveSecrets();
      }
    } catch (error) {
      console.error('Error loading secrets:', error);
      // Fall back to empty secrets if there's an error
      this.secrets = {};
    }
  }

  /**
   * Save secrets to disk
   */
  private static saveSecrets(): void {
    try {
      fs.writeFileSync(this._secretsPath, JSON.stringify(this.secrets, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving secrets:', error);
    }
  }

  /**
   * Set a secret value
   * @param key Secret key
   * @param value Secret value
   * @returns true if successful, false otherwise
   */
  public static set(key: string, value: string): boolean {
    this.ensureInitialized();

    try {
      this.secrets[key] = value;
      this.saveSecrets();
      return true;
    } catch (error) {
      console.error(`Error setting secret value ${key}:`, error);
      return false;
    }
  }

  /**
   * Get a secret value
   * @param key Secret key
   * @param defaultValue Default value to return if key doesn't exist
   * @returns The secret value or defaultValue if not found
   */
  public static get(key: string, defaultValue?: string): string | undefined {
    this.ensureInitialized();
    return this.secrets[key] !== undefined ? this.secrets[key] : defaultValue;
  }

  /**
   * Get all secret values
   * @returns All secret key-value pairs
   */
  public static getAll(): Record<string, string> {
    this.ensureInitialized();
    return { ...this.secrets };
  }

  /**
   * Check if a secret key exists
   * @param key Secret key
   * @returns true if the key exists, false otherwise
   */
  public static has(key: string): boolean {
    this.ensureInitialized();
    return this.secrets[key] !== undefined;
  }

  /**
   * Delete a secret
   * @param key Secret key to delete
   * @returns true if the secret was deleted, false if it didn't exist or deletion failed
   */
  public static delete(key: string): boolean {
    this.ensureInitialized();
    
    if (this.secrets[key] === undefined) {
      return false;
    }
    
    try {
      delete this.secrets[key];
      this.saveSecrets();
      return true;
    } catch (error) {
      console.error(`Error deleting secret ${key}:`, error);
      return false;
    }
  }

  /**
   * Apply secrets to environment variables
   * This allows secret values to be used in the application via process.env
   */
  public static applyToEnvironment(): void {
    this.ensureInitialized();

    Object.entries(this.secrets).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }
}
