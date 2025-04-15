import "dotenv/config";
import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { NavigationTools } from "../tools/NavigationTools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { InteractionTools } from "../tools/InteractionTools";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";

export class Example {
  async run(): Promise<string> {
    try {
      // Initialize AWS credentials
      const region = process.env.AWS_REGION || "us-west-2";
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

      // Initialize Claude model
      const model = new BedrockChat({
        model: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        region: region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        temperature: 0.2,
        streaming: true,
      });

      // Get tools
      const tools = [
        ...NavigationTools.getTools(),
        ...InteractionTools.getTools(),
      ];

      // Initialize memory
      const memory = new MemorySaver();

      // Create agent with memory
      const browserStateGraph = createReactAgent({
        llm: model,
        tools,
        prompt:
          "You are FactifAI, an AI web testing agent that automates browser interactions.",
        checkpointSaver: memory,
      });

      // Generate session ID
      const sessionId = `test-session-${Date.now()}`;

      // Test instructions
      const testInstructions = [
        "go to flipkart.com",
        "click on the mobiles section by using precise coordinates that you estimate",
        "go to amazon.com",
      ];

      // Process each instruction sequentially
      for (const [index, instruction] of testInstructions.entries()) {
        console.log(
          `\n--- EXECUTING TEST STEP ${index + 1}: ${instruction} ---\n`
        );

        // Use the same thread_id for all steps to maintain context
        const stream = await browserStateGraph.stream(
          {
            messages: [new HumanMessage(instruction)],
          },
          {
            streamMode: "values",
            configurable: { thread_id: sessionId },
          }
        );

        // Process stream
        for await (const { messages } of stream) {
          console.log(messages);
        }

        console.log(`\n--- TEST STEP ${index + 1} COMPLETED ---\n`);
      }

      console.log("All test steps completed successfully");
      return "test";
    } catch (error) {
      console.error("Error running test sequence:", error);
      throw error;
    }
  }
}
