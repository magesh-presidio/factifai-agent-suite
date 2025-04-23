import { END, START, StateGraph } from "@langchain/langgraph";
import { State } from "../state/state";
import { parseTestStepsNode } from "../nodes/nodes";
import { MemorySaver } from "@langchain/langgraph";

const memoryCheckpointer = new MemorySaver();

export const factifaiGraph = new StateGraph(State)
  .addNode("parseTestSteps", parseTestStepsNode)
  .addEdge(START, "parseTestSteps")
  .addEdge("parseTestSteps", END)
  .compile({
    checkpointer: memoryCheckpointer,
  });
