#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { executeBrowserTask, displayFactifaiLogo } from './index';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a flag to track if the app is in the process of shutting down
let shuttingDown = false;

// Define cleanup function for graceful shutdown
async function cleanup() {
  // Prevent cleanup from running multiple times
  if (shuttingDown) {
    return;
  }
  
  shuttingDown = true;
  console.log('\nReceived termination signal. Cleaning up...');
  
  try {
    // Get instance of BrowserService to close browsers
    const { BrowserService } = await import('@factifai/playwright-core');
    const browserService = BrowserService.getInstance();
    
    // Close all active browser sessions
    console.log('Closing browser sessions...');
    await browserService.closeAll();
    console.log('All browser sessions closed.');
    
    // Add a small delay to allow other async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  // Force exit after cleanup
  console.log('Exiting application...');
  process.exit(0);
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Only exit if not already shutting down
  if (!shuttingDown) {
    cleanup();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Only exit if not already shutting down
  if (!shuttingDown) {
    cleanup();
  }
});

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Define CLI
const cli = yargs(hideBin(process.argv))
  .scriptName('factifai-agent')
  .usage('$0 <cmd> [args]')
  .example('$0 run "Navigate to example.com"', 'Run with direct instruction')
  .example('$0 run --file ./tests/my-test.txt', 'Run from a file')
  .command('run [instruction]', 'Run a browser automation task (use direct instruction or --file)', (yargs) => {
    return yargs
      .positional('instruction', {
        describe: 'The test instruction to execute',
        type: 'string',
        demandOption: false
      })
      .option('session', {
        alias: 's',
        type: 'string',
        describe: 'Session ID to use',
        default: `browser-session-${Date.now()}`
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        describe: 'Path to a file containing test instructions'
      })
      .example('$0 run "Check if google.com loads"', 'Run with inline instruction')
      .example('$0 run --file ./examples/sample-test.txt', 'Run test from file')
      .example('$0 run -f ./tests/checkout.txt -s my-session', 'Run from file with custom session')
      .check((argv) => {
        // Ensure either instruction or file is provided
        if (!argv.instruction && !argv.file) {
          throw new Error('You must provide either an instruction or a file path');
        }
        return true;
      });
  }, async (argv) => {
    // Display logo
    displayFactifaiLogo();
    
    let instruction: string;
    
    // If file option is provided, read the instruction from the file
    if (argv.file) {
      try {
        const fs = require('fs');
        instruction = fs.readFileSync(argv.file, 'utf8');
        console.log(`Running task with instructions from file: ${argv.file}`);
      } catch (error) {
        console.error(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    } else {
      // Otherwise use the provided instruction
      instruction = argv.instruction as string;
      console.log(`Running task with instruction provided on command line`);
    }
    
    console.log(`Session ID: ${argv.session}`);
    
    try {
      const result = await executeBrowserTask(instruction, argv.session as string);
      
      if (result.success) {
        console.log('\n✅ Task completed successfully!');
        if (result.testSummary) {
          console.log('\nTest Summary:');
          console.log(result.testSummary);
        }
      } else {
        console.error('\n❌ Task failed:', result.error);
      }
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('Error executing task:', error);
      process.exit(1);
    }
  })
  .command('session [id]', 'Manage browser sessions and session history', (yargs) => {
    return yargs
      .positional('id', {
        describe: 'Session ID to use',
        type: 'string'
      })
      .option('list', {
        alias: 'l',
        type: 'boolean',
        describe: 'List all active sessions',
        default: false
      });
  }, (argv) => {
    // Display logo
    displayFactifaiLogo();
    
    if (argv.list) {
      console.log('Listing active sessions:');
      // Here you would implement logic to list active sessions
      console.log('(Session management functionality to be implemented)');
    } else {
      console.log(`Using session ID: ${argv.id || `browser-session-${Date.now()}`}`);
      // Additional session management logic
    }
  })
  .command('config', 'Configure settings and API keys', (yargs) => {
    return yargs
      .option('show', {
        type: 'boolean',
        describe: 'Show current configuration',
        default: false
      })
      .option('set', {
        type: 'string',
        describe: 'Set a configuration value (key=value)'
      });
  }, (argv) => {
    // Display logo
    displayFactifaiLogo();
    
    if (argv.show) {
      console.log('Current configuration:');
      // Logic to display current configuration
      console.log('(Configuration display functionality to be implemented)');
    } else if (argv.set) {
      const [key, value] = (argv.set as string).split('=');
      console.log(`Setting ${key} to ${value}`);
      // Logic to set configuration
      console.log('(Configuration setting functionality to be implemented)');
    } else {
      console.log('Configuration options:');
      console.log('- Use --show to display current configuration');
      console.log('- Use --set key=value to set a configuration value');
    }
  })
  .demandCommand(1, 'You must provide a valid command')
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue('For more information, visit https://factifai.com\nFile format: Use .txt or .md format for test instructions in files.');

// Parse arguments
cli.parse();
