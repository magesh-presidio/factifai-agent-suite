import { GraphStateType } from "../main";

export const shouldContinueEdge = (state: GraphStateType) => {
  // Check if we have a message with tool calls
  const lastMessage = state.messages[state.messages.length - 1];

  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    lastMessage.tool_calls?.length > 0
  ) {
    return "tools";
  }

  if (state.isComplete || state.lastError) {
    return "end";
  }

  return "continue";
};
