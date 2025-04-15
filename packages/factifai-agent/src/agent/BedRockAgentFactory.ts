import "dotenv/config";
import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { NavigationTools } from "../tools/NavigationTools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { InteractionTools } from "../tools/InteractionTools";
import { ScreenshotTools } from "../tools/ScreenshotTools";
import { systemPrompt } from "../prompts/SystemPrompt";
import { AgentConfig } from "../types";

export class BedRockAgentFactory {
  static async createAgent(config?: AgentConfig) {
    // Use config if provided, otherwise use environment variables
    const region = config?.awsRegion || process.env.AWS_REGION || "us-west-2";
    const accessKeyId =
      config?.awsAccessKeyId || process.env.AWS_ACCESS_KEY_ID || "";
    const secretAccessKey =
      config?.awsSecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || "";

    // Initialize Bedrock Claude model
    const model = new BedrockChat({
      model: "us.anthropic.claude-3-7-sonnet-20250219-v1:0", // Updated to newer model
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      maxTokens: 5000, // Increased from 4096
      temperature: 0.2, // Slight increase from 0
      streaming: true, // Enable streaming
    });

    // Combine all tools
    const tools = [
      ...NavigationTools.getTools(),
      ...InteractionTools.getTools(),
      ...ScreenshotTools.getTools(),
    ];

    // Create the agent using the new langgraph approach
    const reactAgent = createReactAgent({
      llm: model,
      tools,
      prompt: systemPrompt, // Use your existing system prompt
    });

    // Create a compatibility wrapper with the expected interface
    const compatAgent = {
      invoke: async (params: any) => {
        try {
          // Extract parameters
          const { input, sessionId, previousResults, results, screenshots } =
            params;

          // Build system message with context
          let contextMessage = `${systemPrompt}\n\nSession ID: ${
            sessionId || "none"
          }`;

          if (previousResults) {
            contextMessage += `\n\nPrevious results: ${JSON.stringify(
              previousResults
            )}`;
          }

          if (results) {
            contextMessage += `\n\nCurrent results: ${JSON.stringify(results)}`;
          }

          if (screenshots) {
            contextMessage += `\n\nAvailable screenshots: ${JSON.stringify(
              screenshots
            )}`;
          }

          // Prepare messages for the agent
          const messages = [
            { role: "system", content: contextMessage },
            { role: "user", content: input },
          ];

          // Use the new streaming API
          const stream = await reactAgent.stream(
            {
              messages: messages,
            },
            {
              streamMode: "updates",
            }
          );

          // Collect all messages from the stream
          const allMessages = [];
          let finalContent = "";
          let screenshot = undefined;

          for await (const { messages } of stream) {
            if (messages && messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              if (lastMessage.role === "assistant") {
                allMessages.push(lastMessage.content);
                finalContent = lastMessage.content;

                // Check if any tool call was for screenshot
                if (
                  lastMessage.tool_calls &&
                  lastMessage.tool_calls.length > 0
                ) {
                  const screenshotCall = lastMessage.tool_calls.find((call: any) =>
                    call.name?.includes("screenshot")
                  );
                  if (screenshotCall && screenshotCall.output) {
                    try {
                      const result = JSON.parse(screenshotCall.output);
                      if (result.path) {
                        screenshot = result.path;
                      }
                    } catch (e) {
                      // Ignore parsing errors
                    }
                  }
                }
              }
            }
          }

          // Format the response to match expected format
          return {
            output: finalContent,
            screenshot: screenshot,
            success: true,
            error: undefined,
          };
        } catch (error) {
          return {
            output: "",
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    };

    return compatAgent;
  }
}
