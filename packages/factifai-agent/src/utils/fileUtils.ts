import * as fs from 'fs/promises';
import { logger } from './logger';

export async function readTestFile(filePath: string): Promise<string[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parsedContent = JSON.parse(fileContent);
    
    if (!parsedContent.testcases || !Array.isArray(parsedContent.testcases)) {
      throw new Error('Invalid test file format. Expected {"testcases": ["instruction1", "instruction2", ...]}');
    }
    
    return parsedContent.testcases;
  } catch (error) {
    logger.error(`Error reading test file ${filePath}:`, error);
    throw error;
  }
}
