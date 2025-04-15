import * as dotenv from "dotenv";
import * as path from "path";
import { Example } from "../src/samples/example";


async function main() {
  // Create a test runner (optionally can pass AWS config)
  const runner = new Example();

  // Run tests from file
  try {
    console.log(`Starting example...`);
    const report = await runner.run();
  } catch (error) {
    console.error("Example execution failed:", error);
  }
}

// Run the example
main().catch(console.error);
