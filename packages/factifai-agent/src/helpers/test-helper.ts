import { GraphStateType } from "../state/state";

const updateTestStepStatus = (
  testSteps: GraphStateType["testSteps"],
  stepIndex: number,
  status: "not_started" | "in_progress" | "passed" | "failed"
) => {
  return testSteps.map((step, index) => {
    if (index === stepIndex) {
      return { ...step, status };
    }
    return step;
  });
};
