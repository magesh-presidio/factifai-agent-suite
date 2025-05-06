import { ChatOpenAI } from "@langchain/openai";
import { BedrockChat } from "@langchain/community/chat_models/bedrock";

export const OpenAIModel = (streaming?: boolean, maxTokens = 12000) =>
  new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
    streaming: streaming,
    maxRetries: 0,
    maxTokens,
  });

export const BedrockModel = (streaming?: boolean, maxTokens = 12000) =>
  new BedrockChat({
    model: process.env.BEDROCK_MODEL, // Updated to newer model
    region: process.env.AWS_DEFAULT_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    modelKwargs: {
      anthropic_version: "bedrock-2023-05-31",
    },
    streaming,
    maxTokens,
  });
