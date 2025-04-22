import { GraphStateType } from "../state/state";

export const shouldContinueTestingEdge = (state: GraphStateType) => {
  const { testSteps, currentStepIndex } = state;

  // If there are more steps to process, continue
  if (currentStepIndex < testSteps.length) {
    return "continue";
  } else {
    console.log("All test steps completed!");
    return "complete";
  }
};
