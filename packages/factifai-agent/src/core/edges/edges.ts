import { GraphStateType } from "../graph/graph";

export const shouldContinueEdge = (state: GraphStateType) => {
  if (state.isComplete === false) {
    return "tools";
  }

  return "end";
};

export const shouldGenerateReport = (state: GraphStateType) => {
  if (state.isComplete === true) {
    return "report";
  }

  return "end";
};
