import { END, START, StateGraph } from "@langchain/langgraph";
import { State } from "../state/state";
import {
  clickNode,
  extractNode,
  launchNode,
  parseTestStepsNode,
  testCoordinatorNode,
  verifyActionNode,
} from "../nodes/nodes";
import { RunnableLambda } from "@langchain/core/runnables";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NavigationTools } from "../tools/NavigationTools";
import {
  determineNextActionEdge,
  routeNode,
  shouldRetryActionEdge,
} from "../nodes/routeNodes";
import { InteractionTools } from "../tools/InteractionTools";
import { GraphStateType } from "../state/state";

export const factifaiGraph = new StateGraph(State)
  // Parse the test steps
  .addNode("parseTestSteps", parseTestStepsNode)
  // Test coordinator to determine the next action
  .addNode("testCoordinator", testCoordinatorNode)
  // Navigation node
  .addNode("launch", launchNode)
  // Click node for handling click actions
  .addNode("click", clickNode)
  // Tool node for executing tools
  .addNode(
    "tools",
    new ToolNode([
      ...NavigationTools.getTools(),
      ...InteractionTools.getTools(),
    ])
  )
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
    click: "click",
    unsupported: "verifyAction",
  })
  // For navigation, handle the tool call/response flow
  .addEdge("launch", "tools")
  .addEdge("click", "tools")
  .addEdge("tools", "extract")

  .addEdge("extract", "verifyAction")
  // After verification, either retry or move to next step
  .addConditionalEdges(
    "verifyAction",
    ({ shouldRetry, currentStepIndex }) => {
      if (shouldRetry) return "retry";
      if (currentStepIndex >= 0) return "continue"; // More steps to process
      return "end"; // No more steps
    },
    {
      retry: "testCoordinator",
      continue: "testCoordinator", // Go back to coordinator for next step
      end: END,
    }
  )
  .compile();
