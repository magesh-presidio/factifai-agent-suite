import { ChatOpenAI } from "@langchain/openai";
import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

// Define model provider types
export type ModelProvider = "openai" | "bedrock";

// Get the model provider from environment
export const getModelProvider = (): ModelProvider | undefined => {
  const provider = process.env.MODEL_PROVIDER?.toLowerCase();
  return provider === "openai" || provider === "bedrock"
    ? (provider as ModelProvider)
    : undefined;
};

export const OpenAIModel = (streaming?: boolean, maxTokens = 12000) => {
  // Check if OpenAI API key is provided when using OpenAI model
  if (process.env.MODEL_PROVIDER === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when using the OpenAI model. Please set this environment variable.");
  }

  return new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL || "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
    streaming: streaming,
    maxTokens,
    supportsStrictToolCalling: true,
  });
};

export const BedrockModel = (streaming?: boolean, maxTokens = 12000) => {
  // Check if AWS credentials are provided when using Bedrock model
  if (process.env.MODEL_PROVIDER === "bedrock") {
    const missingCredentials = [];
    
    if (!process.env.AWS_ACCESS_KEY_ID) {
      missingCredentials.push("AWS_ACCESS_KEY_ID");
    }
    
    if (!process.env.AWS_SECRET_ACCESS_KEY) {
      missingCredentials.push("AWS_SECRET_ACCESS_KEY");
    }
    
    if (!process.env.AWS_DEFAULT_REGION) {
      missingCredentials.push("AWS_DEFAULT_REGION");
    }
    
    if (missingCredentials.length > 0) {
      throw new Error(
        `The following AWS credentials are required when using the Bedrock model: ${missingCredentials.join(", ")}. Please set these environment variables.`
      );
    }
  }

  return new BedrockChat({
    model:
      process.env.BEDROCK_MODEL ||
      "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
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
};

// Model factory that returns the appropriate model based on the provider
export const getModel = (
  streaming?: boolean,
  maxTokens = 12000
): BaseChatModel => {
  // Use provided provider or get from environment
  const modelProvider = getModelProvider();

  if (!modelProvider) {
    throw new Error(
      "No model provider specified. Please set MODEL_PROVIDER environment variable or specify --model option."
    );
  }

  switch (modelProvider) {
    case "openai":
      return OpenAIModel(streaming, maxTokens);
    case "bedrock":
      return BedrockModel(streaming, maxTokens);
    default:
      throw new Error(`Unsupported model provider: ${modelProvider}`);
  }
};
