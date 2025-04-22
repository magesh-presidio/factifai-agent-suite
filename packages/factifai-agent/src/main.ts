import { factifaiGraph } from "./graph/graph";

(async () => {
  const sessionId = "browser-session-" + Date.now(); // Generate a unique session ID

  const result = await factifaiGraph.invoke({
    testCase: `* go to flipkart.com`,
    sessionId: sessionId,
  });

  console.log(`Session ID: ${sessionId}`);
  console.log("Navigation successful:", result.navigationResult?.success);
})();
