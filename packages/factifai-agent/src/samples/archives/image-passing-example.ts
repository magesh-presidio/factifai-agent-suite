import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { NavigationTools } from "../../tools/NavigationTools";
import { openAiModel } from "../../llm/models";
import { z } from "zod";

// ——————————————————————————————————————————————
// 1. Graph State
// ——————————————————————————————————————————————
const WebsiteAnalyzerState = Annotation.Root({
  url: Annotation<string>({ reducer: (_, v) => v }),
  sessionId: Annotation<string>({ reducer: (_, v) => v }),
  messages: Annotation<any[]>({
    default: () => [],
    reducer: (curr, a) => [...curr, ...a],
  }),
  screenshot: Annotation<string | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  analysis: Annotation<{
    textContent: string;
    visualDescription: string;
    navigationElements: string[];
  } | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
});

type WebsiteAnalyzerStateType = (typeof WebsiteAnalyzerState)["State"];

// ——————————————————————————————————————————————
// 2. Helper: normalize a raw Base64 string
// ——————————————————————————————————————————————
function formatImageForLLM(base64: string): string {
  return base64.startsWith("data:image/")
    ? base64
    : `data:image/jpeg;base64,${base64}`;
}

// ——————————————————————————————————————————————
// 3. Navigation Node: visits URL & captures screenshot
// ——————————————————————————————————————————————
const navigateNode = async (state: WebsiteAnalyzerStateType) => {
  const { url, sessionId } = state;
  const navTool = NavigationTools.getTools().find((t) => t.name === "navigate");
  if (!navTool) throw new Error("Navigate tool not found");

  const raw = await navTool.invoke({ sessionId, url });
  const parsed = JSON.parse(raw);
  if (!parsed.success) {
    return {
      messages: [
        new HumanMessage(`Navigation failed: ${parsed.error || "unknown"}`),
      ],
    };
  }

  const screenshot = parsed.screenshot
    ? formatImageForLLM(parsed.screenshot as string)
    : null;

  return {
    screenshot,
    messages: [
      new HumanMessage(`Navigated to ${url} and captured screenshot.`),
    ],
  };
};

// ——————————————————————————————————————————————
// 4. Analysis Node: sends a true multimodal message
// ——————————————————————————————————————————————
const analyzeScreenshotNode = async (state: WebsiteAnalyzerStateType) => {
  const { url, screenshot } = state;
  if (!screenshot) {
    return {
      messages: [new HumanMessage("No screenshot to analyze.")],
      analysis: {
        textContent: "",
        visualDescription: "",
        navigationElements: [],
      },
    };
  }

  // 1. Build the multimodal human message
  const humanMsg = new HumanMessage({
    content: [
      { type: "text", text: `Please analyze this screenshot of ${url}:` },
      { type: "image_url", image_url: { url: screenshot } },
    ],
  });

  // 2. Strict system prompt
  const systemMsg = new SystemMessage(
    "You are a precise website analyzer. Describe ONLY what you literally see; " +
      "if something is unclear or absent, say 'not visible.' Do NOT guess."
  );

  // 3. Vision‑capable Bedrock model with structured output
  const model = openAiModel().withStructuredOutput(
    z.object({
      textContent: z.string().describe("Exact text visible in the screenshot"),
      visualDescription: z
        .string()
        .describe("Layout, colors, typography, and design elements"),
      navigationElements: z
        .array(z.string())
        .describe("List of all clickable/navigation elements"),
    })
  );

  const result = await model.invoke([systemMsg, humanMsg]);

  return {
    messages: [new HumanMessage("Analysis completed successfully.")],
    analysis: result,
  };
};

// ——————————————————————————————————————————————
// 5. Build & export the Graph
// ——————————————————————————————————————————————
export const createWebsiteAnalyzer = () => {
  return new StateGraph(WebsiteAnalyzerState)
    .addNode("navigate", navigateNode)
    .addNode("analyze", analyzeScreenshotNode)
    .addEdge(START, "navigate")
    .addEdge("navigate", "analyze")
    .addEdge("analyze", END)
    .compile();
};

// ——————————————————————————————————————————————
// 6. Convenience runner
// ——————————————————————————————————————————————
export const analyzeWebsite = async (sessionId: string, url: string) => {
  const analyzer = createWebsiteAnalyzer();
  const result = await analyzer.invoke({ sessionId, url });

  if (!result.analysis) {
    return { success: false, error: "No analysis produced." };
  }
  return { success: true, analysis: result.analysis };
};

// ——————————————————————————————————————————————
// 7. Example Usage
// ——————————————————————————————————————————————
async function runExample() {
  const sessionId = "your-session-id";
  const { success, analysis, error } = await analyzeWebsite(
    sessionId,
    "https://azizstark.com"
  );

  if (!success) {
    console.error("📌 Analysis failed:", error);
    return;
  }

  if (!analysis) {
    console.error("📌 No analysis produced.");
    return;
  }
  console.log("📋 Text Content:", analysis.textContent);
  console.log("🎨 Visual Description:", analysis.visualDescription);
  console.log("🔗 Navigation Elements:", analysis.navigationElements);
}

runExample();
