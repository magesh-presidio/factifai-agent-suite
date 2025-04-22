import { Annotation } from "@langchain/langgraph";

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
  stepError: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  currentScreenshot: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  messages: Annotation<any[]>({
    default: () => [],
    reducer: (curr, a) => [...curr, ...a],
  }),
  navigationResult: Annotation<any>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  clickResult: Annotation<any>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  actionType: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  actionParams: Annotation<any>({
    default: () => ({}),
    reducer: (_, v) => v,
  }),
  actionMessage: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  verificationMessage: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  verificationResult: Annotation<any>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  shouldRetry: Annotation<boolean>({
    default: () => false,
    reducer: (_, v) => v,
  }),
});

export type GraphStateType = (typeof State)["State"];
