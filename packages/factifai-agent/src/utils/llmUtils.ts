export const formatImageForLLM = (base64: string): string => {
  return base64.startsWith("data:image/")
    ? base64
    : `data:image/jpeg;base64,${base64}`;
};
