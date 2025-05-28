import * as fs from "fs";
import * as path from "path";

/**
 * Constants for directory names
 */
export const PARENT_DIR_NAME = "factifai";
export const REPORTS_DIR_NAME = "reports";
export const SCREENSHOTS_DIR_NAME = "screenshots";

/**
 * Creates the parent directory structure and returns the full path to a session directory
 * @param sessionId The session ID
 * @returns The full path to the session directory within the parent directory
 */
export function getSessionPath(sessionId: string): string {
  // Create parent directory if it doesn't exist
  const parentDir = path.join(process.cwd(), PARENT_DIR_NAME);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }
  
  // Create session directory within parent directory
  const sessionDir = path.join(parentDir, sessionId);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  return sessionDir;
}

/**
 * Creates a subdirectory within a session directory and returns the full path
 * @param sessionId The session ID
 * @param subDirName The name of the subdirectory
 * @returns The full path to the subdirectory
 */
export function getSessionSubdirPath(sessionId: string, subDirName: string): string {
  const sessionDir = getSessionPath(sessionId);
  const subDir = path.join(sessionDir, subDirName);
  
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
  
  return subDir;
}
