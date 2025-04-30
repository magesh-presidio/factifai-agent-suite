import { HumanMessage, BaseMessageChunk } from "@langchain/core/messages";
import { logger } from "./logger";

export const formatImageForLLM = (base64: string): string => {
  return base64.startsWith("data:image/")
    ? base64
    : `data:image/jpeg;base64,${base64}`;
};

export const removeImageUrlsFromMessage = (message: HumanMessage) => {
  // If the message content is a string, return as is
  if (typeof message.content === "string") {
    return message;
  }

  // If the message content is an array, filter out image_url items
  if (Array.isArray(message.content)) {
    const filteredContent = message.content.filter(
      (item) => item.type !== "image_url"
    );

    // If we filtered everything out, return a simple text message
    if (filteredContent.length === 0) {
      return new HumanMessage(
        "[Content contained only images, which have been removed]"
      );
    }

    // Create a new message with the filtered content
    return new HumanMessage({ content: filteredContent });
  }

  // If we get here, there's an unexpected content format
  return message;
};
