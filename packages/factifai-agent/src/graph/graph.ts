import { END, START, StateGraph } from "@langchain/langgraph";
import { State } from "../state/state";
import { parseTestStepsNode, testOrchestratorNode } from "../nodes/nodes";
import { shouldContinueTestingEdge } from "../edges/edges";
import { MemorySaver } from "@langchain/langgraph";

const memoryCheckpointer = new MemorySaver();

export const factifaiGraph = new StateGraph(State)
  .addNode("parseTestSteps", parseTestStepsNode)
  .addNode("testOrchestrator", testOrchestratorNode)
  .addEdge(START, "parseTestSteps")
  .addEdge("parseTestSteps", "testOrchestrator")
  .addConditionalEdges("testOrchestrator", shouldContinueTestingEdge, {
    continue: "testOrchestrator", // Loop back if there are more steps
    complete: END, // End if all steps are processed
  })
  .compile({
    checkpointer: memoryCheckpointer,
  });
