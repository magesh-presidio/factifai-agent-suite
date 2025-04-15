import { logger } from '../utils/logger';
import * as path from 'path';

/**
 * Example demonstrating the enhanced logger functionality with file logging
 */
async function testLogger() {
  console.log('Testing enhanced logger with file logging...');
  
  // Configure the logger (optional - uses default config if not called)
  const projectRoot = path.resolve(__dirname, '../../');
  const logPath = path.join(projectRoot, 'logs', 'example.log');
  
  logger.configure({
    logToFile: true,
    logFilePath: logPath,
    logLevel: 'debug'
  });
  
  console.log(`Log file will be written to: ${logPath}`);
  
  // Log messages at different levels
  logger.info('This is an info message');
  logger.info('This is an info message with data', { userId: 123, action: 'login' });
  
  logger.warn('This is a warning message');
  logger.warn('This is a warning message with data', { userId: 123, status: 'low disk space' });
  
  logger.error('This is an error message');
  logger.error('This is an error message with error object', new Error('Something went wrong'));
  
  logger.debug('This is a debug message');
  logger.debug('This is a debug message with data', { 
    requestId: 'req-123',
    processingTime: 235,
    details: { 
      path: '/api/data',
      method: 'GET' 
    }
  });
  
  console.log('Log messages have been written to both console and file.');
  console.log(`Check the log file at: ${logger.config.logFilePath}`);
}

// Run the example
testLogger().catch(err => {
  console.error('Error running logger example:', err);
});
