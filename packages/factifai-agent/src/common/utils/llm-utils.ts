import { HumanMessage } from "@langchain/core/messages";

export const removeImageUrlsFromMessage = (message: HumanMessage) => {
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

    return new HumanMessage({ content: filteredContent });
  }

  // If we get here, there's an unexpected content format
  return message;
};
