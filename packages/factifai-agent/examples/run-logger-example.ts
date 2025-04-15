import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

async function runLoggerExample() {
  try {
    console.log('Starting logger example...');
    
    const examplePath = path.resolve(__dirname, '../src/samples/logger-example.ts');
    
    // Use ts-node to run the TypeScript file directly
    const { stdout, stderr } = await execPromise(`npx ts-node ${examplePath}`);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('Logger example execution completed.');
  } catch (error) {
    console.error('Error running logger example:', error);
  }
}

runLoggerExample();
