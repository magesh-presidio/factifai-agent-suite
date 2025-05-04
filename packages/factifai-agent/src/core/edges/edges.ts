import { END } from "@langchain/langgraph";
import { GraphStateType } from "../graph/graph";

export const shouldContinueEdge = (state: GraphStateType) => {
  if (state.isComplete === false) {
    return "tools";
  }

  console.log("CALLING FINAL TRACK NODE FOR FINAL VERIFIATION")
  return "end";
};

export const shouldGenerateReport = (state: GraphStateType) => {
  if (state.isComplete === true) {
    return "report";
  }

  return "end";
};
