import { GraphStateType } from "../state/state";

export const routeNode = ({ messages }: GraphStateType) => {
  const lastMessage = messages[messages.length - 1];
  const hasToolCalls = !!lastMessage?.tool_calls?.length;
  const route = hasToolCalls ? "tools" : "extract";

  console.log(
    `[ROUTE] From launch → ${route} (Tool calls: ${
      hasToolCalls ? "Yes" : "No"
    })`
  );
  return route;
};

export const shouldAnalyzeScreenshot = ({
  currentScreenshot,
  navigationResult,
}: GraphStateType) => {
  const hasScreenshot = !!currentScreenshot;
  const navSuccess = !!navigationResult?.success;
  const route = hasScreenshot && navSuccess ? "analyze" : "end";

  console.log(
    `[ROUTE] Screenshot analysis → ${route} (Screenshot: ${
      hasScreenshot ? "Yes" : "No"
    }, Navigation success: ${navSuccess ? "Yes" : "No"})`
  );
  return route;
};

export const determineNextActionEdge = ({
  actionType,
  testSteps,
  currentStepIndex,
}: GraphStateType) => {
  const route = actionType === "navigate" ? "navigate" : "unsupported";
  const currentStep =
    currentStepIndex >= 0 && testSteps && testSteps.length > currentStepIndex
      ? testSteps[currentStepIndex]
      : null;

  console.log(
    `[ROUTE] From coordinator → ${route} (Action type: ${
      actionType || "None"
    }, Current step: ${currentStep ? currentStep.instruction : "None"})`
  );
  return route;
};

// Decision function to determine if we should retry the current step
export const shouldRetryActionEdge = ({
  shouldRetry,
  currentStepIndex,
  testSteps,
}: GraphStateType) => {
  const needsRetry = shouldRetry && currentStepIndex >= 0;
  const route = needsRetry ? "retry" : "next";
  const currentStep =
    currentStepIndex >= 0 && testSteps && testSteps.length > currentStepIndex
      ? testSteps[currentStepIndex]
      : null;

  console.log(
    `[ROUTE] Verification → ${route} (Retry needed: ${
      needsRetry ? "Yes" : "No"
    }, Current step: ${
      currentStep ? currentStep.instruction : "None"
    }, Step index: ${currentStepIndex})`
  );
  return route;
};
