import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { NavigationTools } from "../../src/tools/NavigationTools";
import { bedrockModel } from "../../src/models/models";

// ======================================================
// 1. Define State Schema
// ======================================================
const WebsiteAnalyzerState = Annotation.Root({
  // Input parameters
  url: Annotation<string>({
    reducer: (_, val) => val,
  }),
  sessionId: Annotation<string>({
    reducer: (_, val) => val,
  }),

  // Processing state
  messages: Annotation<any[]>({
    default: () => [],
    reducer: (curr, a) => [...curr, ...a],
  }),
  screenshot: Annotation<string | null>({
    default: () => null,
    reducer: (_, val) => val,
  }),

  // Analysis results
  analysis: Annotation<{
    textContent: string;
    visualDescription: string;
    navigationElements: string[];
    potentialIssues: string[];
  } | null>({
    default: () => null,
    reducer: (_, val) => val,
  }),
});

type State = (typeof WebsiteAnalyzerState)["State"];

// ======================================================
// 2. Helper Functions
// ======================================================
function ensureImageFormat(base64: string): string {
  // Make sure the base64 image string has the proper MIME type prefix
  return base64.startsWith("data:image/")
    ? base64
    : `data:image/jpeg;base64,${base64}`;
}

// ======================================================
// 3. Graph Nodes
// ======================================================

// Navigate to URL and capture screenshot
const navigateNode = async (state: State) => {
  const { url, sessionId } = state;
  console.log(`📸 Navigating to ${url}...`);

  try {
    // Get the navigation tool
    const navigateTool = NavigationTools.getTools().find(
      (t) => t.name === "navigate"
    );
    if (!navigateTool) throw new Error("Navigate tool not found");

    // Invoke the tool to navigate and capture screenshot
    const result = await navigateTool.invoke({ sessionId, url });
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      console.error(
        `❌ Navigation failed: ${parsedResult.error || "Unknown error"}`
      );
      return {
        messages: [
          new HumanMessage(
            `Failed to navigate to ${url}: ${
              parsedResult.error || "Unknown error"
            }`
          ),
        ],
      };
    }

    // Process the screenshot
    const screenshot = parsedResult.screenshot
      ? ensureImageFormat(parsedResult.screenshot)
      : null;

    if (!screenshot) {
      console.warn("⚠️ Navigation successful but no screenshot was captured");
    } else {
      console.log(
        `✅ Screenshot captured (${Math.round(screenshot.length / 1024)} KB)`
      );
    }

    return {
      screenshot,
      messages: [new HumanMessage(`Successfully navigated to ${url}.`)],
    };
  } catch (error) {
    console.error("❌ Error in navigation node:", error);
    return {
      messages: [
        new HumanMessage(
          `Error processing ${url}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        ),
      ],
    };
  }
};

// Analyze the screenshot with the LLM
const analyzeNode = async (state: State) => {
  const { url, screenshot } = state;

  if (!screenshot) {
    console.error("❌ No screenshot available to analyze");
    return {
      analysis: {
        textContent: "No screenshot available",
        visualDescription: "Analysis failed - no screenshot was captured",
        navigationElements: [],
        potentialIssues: ["Screenshot capture failed"],
      },
      messages: [
        new HumanMessage("Analysis couldn't proceed: no screenshot available"),
      ],
    };
  }

  try {
    console.log("🔍 Analyzing screenshot with LLM...");

    // Create multimodal message with the screenshot
    const multimodalMessage = new HumanMessage({
      content: [
        {
          type: "text",
          text: `Please analyze this screenshot of the website: ${url}`,
        },
        {
          type: "image_url",
          image_url: { url: screenshot },
        },
      ],
    });

    // Define system prompt to guide the analysis
    const systemPrompt = new SystemMessage(
      "You are a precise website analyzer. Describe ONLY what you can clearly see in the screenshot. " +
        "Extract exact text content, describe the visual layout, and identify navigation elements. " +
        "If something is unclear or not visible, indicate this explicitly rather than guessing."
    );

    // Define the structured output schema
    const outputSchema = z.object({
      textContent: z
        .string()
        .describe(
          "All text content visible in the screenshot, exactly as shown"
        ),
      visualDescription: z
        .string()
        .describe(
          "Detailed description of the website's layout, colors, design elements"
        ),
      navigationElements: z
        .array(z.string())
        .describe(
          "List of all visible navigation elements (menus, buttons, links)"
        ),
      potentialIssues: z
        .array(z.string())
        .describe("Potential UX/accessibility issues visible in the design"),
    });

    // Get the model with structured output
    const model = bedrockModel().withStructuredOutput(outputSchema);

    // Execute the analysis
    const analysis = await model.invoke([systemPrompt, multimodalMessage]);

    console.log("✅ Analysis completed successfully");

    return {
      analysis,
      messages: [
        new HumanMessage("Screenshot analysis completed successfully"),
      ],
    };
  } catch (error) {
    console.error("❌ Error in analysis node:", error);
    return {
      analysis: {
        textContent: "Analysis failed due to an error",
        visualDescription: "Error occurred during analysis",
        navigationElements: [],
        potentialIssues: [
          "Analysis error: " +
            (error instanceof Error ? error.message : "Unknown error"),
        ],
      },
      messages: [
        new HumanMessage(
          `Screenshot analysis failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        ),
      ],
    };
  }
};

// ======================================================
// 4. Build the Website Analyzer Graph
// ======================================================
export function createWebsiteAnalyzer() {
  return new StateGraph(WebsiteAnalyzerState)
    .addNode("navigate", navigateNode)
    .addNode("analyze", analyzeNode)
    .addEdge(START, "navigate")
    .addEdge("navigate", "analyze")
    .addEdge("analyze", END)
    .compile();
}

// ======================================================
// 5. Convenient Runner Function
// ======================================================
export async function analyzeWebsite(sessionId: string, url: string) {
  console.log(`🌐 Starting analysis of ${url}`);

  try {
    const analyzer = createWebsiteAnalyzer();
    const result = await analyzer.invoke({ sessionId, url });

    if (!result.analysis) {
      console.error("❌ Analysis failed to produce results");
      return {
        success: false,
        error: "Analysis did not produce any results",
      };
    }

    console.log("✅ Website analysis completed successfully");
    return {
      success: true,
      analysis: result.analysis,
    };
  } catch (error) {
    console.error("❌ Error running website analyzer:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during analysis",
    };
  }
}

// ======================================================
// 6. Example Usage
// ======================================================
async function demoAnalyzer() {
  // This would normally come from a browser service
  const browserSessionId = "demo-session-123";

  // Define websites to analyze
  const websites = ["https://azizstark.com", "https://news.ycombinator.com"];

  // Analyze each website
  for (const url of websites) {
    console.log(`\n\n${"=".repeat(50)}`);
    console.log(`🔍 ANALYZING: ${url}`);
    console.log(`${"=".repeat(50)}\n`);

    try {
      const result = await analyzeWebsite(browserSessionId, url);

      if (result.success && result.analysis) {
        console.log("\n📝 TEXT CONTENT:");
        console.log(result.analysis.textContent || "None extracted");

        console.log("\n🎨 VISUAL DESCRIPTION:");
        console.log(
          result.analysis.visualDescription || "No description provided"
        );

        console.log("\n🔗 NAVIGATION ELEMENTS:");
        if (
          Array.isArray(result.analysis.navigationElements) &&
          result.analysis.navigationElements.length > 0
        ) {
          result.analysis.navigationElements.forEach((element, i) => {
            console.log(`  ${i + 1}. ${element}`);
          });
        } else {
          console.log("  No navigation elements detected");
        }

        console.log("\n⚠️ POTENTIAL ISSUES:");
        if (
          Array.isArray(result.analysis.potentialIssues) &&
          result.analysis.potentialIssues.length > 0
        ) {
          result.analysis.potentialIssues.forEach((issue, i) => {
            console.log(`  ${i + 1}. ${issue}`);
          });
        } else {
          console.log("  No issues detected");
        }
      } else {
        console.error(`❌ Analysis failed: ${result.error}`);
      }
    } catch (error) {
      console.error(
        `❌ Error analyzing ${url}:`,
        error instanceof Error ? error.message : error
      );
    }
  }
}

// Uncomment to run the demo
demoAnalyzer().catch((err) => console.error("Demo failed:", err));
