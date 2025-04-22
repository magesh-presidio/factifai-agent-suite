import { END, START, StateGraph } from "@langchain/langgraph";
import { State } from "../state/state";
import {
  extractNode,
  launchNode,
  parseTestStepsNode,
  testCoordinatorNode,
  verifyActionNode,
} from "../nodes/nodes";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NavigationTools } from "../tools/NavigationTools";
import {
  determineNextActionEdge,
  routeNode,
  shouldRetryActionEdge,
} from "../nodes/routeNodes";

export const factifaiGraph = new StateGraph(State)
  // Parse the test steps
  .addNode("parseTestSteps", parseTestStepsNode)
  // Test coordinator to determine the next action
  .addNode("testCoordinator", testCoordinatorNode)
  // Navigation node
  .addNode("launch", launchNode)
  // Tool node for executing tools
  .addNode("tools", new ToolNode(NavigationTools.getTools()))
  // Extract node to process tool results
  .addNode("extract", extractNode)
  // Verify action node to check if actions were successful
  .addNode("verifyAction", verifyActionNode)
  // Start by parsing test steps
  .addEdge(START, "parseTestSteps")
  // Then go to test coordinator to plan first step
  .addEdge("parseTestSteps", "testCoordinator")
  // Determine next action based on step type
  .addConditionalEdges("testCoordinator", determineNextActionEdge, {
    navigate: "launch",
    unsupported: "verifyAction", // Skip to verification for unsupported actions
  })
  // For navigation, handle the tool call/response flow
  .addConditionalEdges("launch", routeNode, {
    tools: "tools",
    extract: "extract",
  })
  .addEdge("tools", "launch")
  .addEdge("extract", "verifyAction")
  // After verification, either retry or move to next step
  .addConditionalEdges("verifyAction", shouldRetryActionEdge, {
    retry: "testCoordinator",
    next: END,
  })
  .compile();
