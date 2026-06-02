import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Lovable AI Gateway provider (uses LOVABLE_API_KEY, auto-provisionado por Lovable Cloud).
export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
