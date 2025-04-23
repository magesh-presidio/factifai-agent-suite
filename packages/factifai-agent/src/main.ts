import { factifaiGraph } from "./graph/graph";

// Example of how to invoke the graph with thread_id
const runTest = async (testCase: string, sessionId: string) => {
  // Create a unique thread ID for this test run
  const threadId = `test-session-${Date.now()}`;

  const result = await factifaiGraph.invoke(
    {
      testCase,
      sessionId,
    },
    {
      configurable: {
        thread_id: threadId,
      },
    }
  );

  console.log("Session ID:", sessionId);
  console.log("== TESTS COMPLETED ==");
  return result;
};

// Usage
runTest(
  "Navigate to flipkart.com and add a iphone to cart",
  "browser-session-" + Date.now()
);
