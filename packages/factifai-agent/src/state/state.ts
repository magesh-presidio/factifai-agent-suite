import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

export const State = Annotation.Root({
  sessionId: Annotation<string>(),
  testCase: Annotation<string>(),
  testSteps: Annotation<
    Array<{
      id: number;
      instruction: string;
      status: "not_started" | "in_progress" | "passed" | "failed";
      type:
        | "navigation"
        | "click"
        | "input"
        | "verification"
        | "wait"
        | "other";
    }>
  >({
    default: () => [],
    reducer: (_, v) => v,
  }),
  currentStepIndex: Annotation<number>({
    default: () => -1,
    reducer: (_, v) => v,
  }),
  conversationHistory: Annotation<BaseMessage[]>({
    default: () => [],
    reducer: messagesStateReducer,
  }),
});

export type GraphStateType = (typeof State)["State"];
