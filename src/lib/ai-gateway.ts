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

// OpenRouter — tiene modelos :free (Llama 3.3, Gemini Flash exp, etc).
// Configurá OPENROUTER_API_KEY como secret (https://openrouter.ai/keys).
export const createOpenRouterProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://lovable.dev",
      "X-Title": "Travel Wolf",
    },
  });

// Groq — modelos Llama gratis con cuota generosa.
// Configurá GROQ_API_KEY como secret (https://console.groq.com/keys).
export const createGroqProvider = (apiKey: string) =>
  createOpenAICompatible({
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
