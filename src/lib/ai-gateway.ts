import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const createOpenRouterProvider = (openRouterApiKey: string) =>
  createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${openRouterApiKey}`,
    },
  });
