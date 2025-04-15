import * as dotenv from "dotenv";
import * as path from "path";
import { Example } from "../src/samples/example";

// Load environment variables
dotenv.config();

async function main() {
  // Create a test runner (optionally can pass AWS config)
  const runner = new Example();

  // Path to the test file
  const testFilePath = path.join(__dirname, "example-test.json");

  // Run tests from file
  try {
    console.log(`Starting test run from ${testFilePath}`);
    const report = await runner.run();

    console.log("\n=== Test Report ===\n");
    console.log(report);
    console.log("\n=== End of Report ===\n");
  } catch (error) {
    console.error("Test execution failed:", error);
  }
}

// Run the example
main().catch(console.error);
