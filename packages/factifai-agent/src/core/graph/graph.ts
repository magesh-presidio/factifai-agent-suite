import {
  Annotation,
  StateGraph,
  START,
  END,
  MemorySaver,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ALL_TOOLS } from "../../tools";
import { generateReportNode } from "../nodes/reporting/report-generation-node";
import { executeAndVerifyNode } from "../nodes/execution/execution-and-verification-node";
import { trackAndUpdateStepsNode } from "../nodes/tracking/tracking-node";
import { parseTestStepsNode } from "../nodes/parsing/parsing-node";
import { preprocessTestInputNode } from "../nodes/preprocessing/preprocessing-node";
import { shouldContinueEdge, shouldGenerateReport } from "../edges/edges";

export const State = Annotation.Root({
  // Base fields
  instruction: Annotation<string>(),
  processedInstruction: Annotation<string>(),
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
      notes: string;
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
  // Test execution time tracking fields
  testStartTime: Annotation<number | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  testEndTime: Annotation<number | null>({
    default: () => null, 
    reducer: (_, v) => v,
  }),
  testDuration: Annotation<number | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
});

export type GraphStateType = (typeof State)["State"];

const memory = new MemorySaver();

export const browserAutomationGraph = new StateGraph(State)
  .addNode("preprocess", preprocessTestInputNode)
  .addNode("parse", parseTestStepsNode)
  .addNode("execute", executeAndVerifyNode)
  .addNode("track", trackAndUpdateStepsNode)
  .addNode("tools", new ToolNode(ALL_TOOLS))
  .addNode("report", generateReportNode)
  .addEdge(START, "preprocess")
  .addEdge("preprocess", "parse")
  .addEdge("parse", "execute")
  .addConditionalEdges("execute", shouldContinueEdge, {
    tools: "tools",
    end: "track", // call track for final verification
  })
  .addConditionalEdges("track", shouldGenerateReport, {
    report: "report",
    end: END,
  })
  .addEdge("tools", "execute")
  .addEdge("tools", "track") // parallely execute track node along with execute node
  .addEdge("report", END) // After report, end the graph
  .compile({ checkpointer: memory });
