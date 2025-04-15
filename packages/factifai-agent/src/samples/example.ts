// import { BedRockAgentFactory } from "./BedRockAgentFactory";
import "dotenv/config";
import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { NavigationTools } from "../tools/NavigationTools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { InteractionTools } from "../tools/InteractionTools";

export class Example {
  async run(): Promise<string> {
    try {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

      const model = new BedrockChat({
        model: "us.anthropic.claude-3-7-sonnet-20250219-v1:0", // Or another Bedrock model
        region: "us-west-2", // Your AWS region
        credentials: {
          // Your AWS credentials (can be omitted if using environment variables)
          accessKeyId,
          secretAccessKey,
        },
        temperature: 0.2,
        maxTokens: 5000,
        streaming: true,
      });

      const tools = [
        ...NavigationTools.getTools(),
        ...InteractionTools.getTools(),
      ];

      const browserAgent = createReactAgent({
        llm: model,
        tools,
        prompt:
          "You are FactifAI, an AI web testing agent that automates browser interactions.",
      });

      const inputs = {
        messages: [
          {
            role: "user",
            content:
              "go to flipkart.com and click on the mobiles section using precise coordinates that you estimate",
          },
        ],
      };

      const stream = await browserAgent.stream(inputs, {
        streamMode: "updates",
      });

      for await (const { messages } of stream) {
        messages ?? console.log(messages);
      }

      return "test";
    } catch (error) {
      throw error;
    }
  }
}
