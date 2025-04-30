import {
  Annotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ALL_TOOLS } from "./tools";
import { executeInstructionNode } from "./nodes/execution";
import { generateReportNode } from "./nodes/report-generation";
import { shouldContinueEdge } from "./edges/edges";
import { validateActionNode } from "./nodes/validation";
import { executeAndVerifyNode } from "./nodes/executeAndVerify";
import { trackAndUpdateStepsNode } from "./nodes/trackActionNode";
import { parseTestNode } from "./nodes/parseTest";

// Enhanced state definition with test steps
export const State = Annotation.Root({
  // Base fields
  instruction: Annotation<string>(),
  sessionId: Annotation<string>(),
  messages: Annotation<any[]>({
    default: () => [],
    reducer: (curr, a) => [...curr, ...a],
  }),

  // Test step tracking fields
  testSteps: Annotation<
    Array<{
      id: number;
      instruction: string;
      status: "not_started" | "in_progress" | "passed" | "failed";
      notes?: string;
    }>
  >({
    default: () => [],
    reducer: (_, v) => v,
  }),
  currentStepIndex: Annotation<number>({
    default: () => -1,
    reducer: (_, v) => v,
  }),
  testSummary: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  isComplete: Annotation<boolean>({
    default: () => false,
    reducer: (_, v) => v,
  }),
  lastError: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  lastAction: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  expectedOutcome: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  currentStep: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  retryCount: Annotation<number>({
    default: () => 0,
    reducer: (_, v) => v,
  }),
  retryAction: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  maxRetries: Annotation<number>({
    default: () => 3,
    reducer: (_, v) => v,
  }),
  lastScreenshot: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
});

export type GraphStateType = (typeof State)["State"];

const memory = new MemorySaver();

export const browserAutomationGraph = new StateGraph(State)
  .addNode("parse", parseTestNode)
  .addNode("execute", executeAndVerifyNode)
  .addNode("track", trackAndUpdateStepsNode)
  .addNode("tools", new ToolNode(ALL_TOOLS))
  .addNode("report", generateReportNode) // Add report generator node
  .addEdge(START, "parse")
  .addEdge("parse", "execute")
  .addConditionalEdges("execute", shouldContinueEdge, {
    tools: "tools",
    continue: "execute",
    end: "report", // Go to report instead of END
  })
  .addEdge("tools", "track")
  .addEdge("tools", "execute")
  .addEdge("report", END) // After report, end the graph
  .compile({ checkpointer: memory });
