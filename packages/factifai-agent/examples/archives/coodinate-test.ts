import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NavigationTools } from "../../src/tools/NavigationTools";
import { InteractionTools } from "../../src/tools/InteractionTools";
import { bedrockModel } from "../../src/llm/models";

/* ---------- 1.  Gather the tools ---------- */
const TOOLS = [
  ...NavigationTools.getTools(),
  ...InteractionTools.getTools(),
  // ...ScreenshotTools.getTools(),            // add if you need them
];

/* ---------- 2.  Define the tiny state ---------- */
const State = Annotation.Root({
  messages: Annotation<any[]>({
    default: () => [],
    value: (prev, curr) => [...prev, ...curr], // append
  }),
  sessionId: Annotation<string>(),
});
type S = (typeof State)["State"];

/* ---------- 3.  LLM node ---------- */
async function llmNode({ messages, sessionId }: S) {
  const model = bedrockModel().bindTools(TOOLS);

  const sys = new SystemMessage(
    `You are a browser‑automation assistant.
Use ONLY the provided tools. Reply with tool calls until the task is done.
When finished, just respond with "DONE".`
  );

  const reply = await model.invoke([sys, ...messages]);
  // Bedrock quirk: strip duplicate tool_use fragments
  if (typeof reply.content !== "string") {
    reply.content = reply.content.filter((c) => c.type !== "tool_use");
  }

  return { messages: [...messages, reply] };
}

/* ---------- 4.  Completion check ---------- */
function shouldContinue({ messages }: S) {
  const last = messages[messages.length - 1];

  // If the assistant returned any tool calls, run them
  if (last?.tool_calls?.length) return "tools";

  // Otherwise assume it's done
  return "end";
}

/* ---------- 5.  Build the graph ---------- */
const simpleBrowserAgent = new StateGraph(State)
  .addNode("llm", llmNode)
  .addNode("tools", new ToolNode(TOOLS))
  .addConditionalEdges("llm", shouldContinue, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "llm")
  .addEdge(START, "llm")
  .compile();

/* ---------- 6.  Helper to run one task ---------- */
export async function runAutomation(sessionId: string, task: string) {
  const finalState = await simpleBrowserAgent.invoke(
    {
      sessionId,
      messages: [new HumanMessage(task)],
    },
    { configurable: { thread_id: sessionId } } // keeps tool context
  );

  console.log("🎉 Automation finished.");
  return finalState;
}

(async () => {
  const sessionId = "demo-session-1"; // keep this stable!
  const task = `
    Navigate to https://www.saucedemo.com
    Summarise what you see on the page with all the details without missing anything.
  `;

  await runAutomation(sessionId, task);
})();
