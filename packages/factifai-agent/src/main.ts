import { factifaiGraph } from "./graph/graph";

(async () => {
  const sessionId = "browser-session-" + Date.now(); // Generate a unique session ID

  const result = await factifaiGraph.invoke({
    testCase: `* go to flipkart.com and click on the mobiles section and then click on the cart section`,
    sessionId: sessionId,
  });

  console.log(`Session ID: ${sessionId}`);
  console.log("== TESTS COMPLETED ==");
})();
