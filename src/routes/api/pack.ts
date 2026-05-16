import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

const SuggestionSchema = z.object({
  destination: z.string().describe("Ciudad y país del destino del viaje"),
  days: z.number().int().min(1).describe("Cantidad de días del viaje"),
  weather: z.string().describe("Resumen del clima esperado, con rango de temperatura"),
  occasion: z.string().describe("Motivo o tipo de viaje (ej: casamiento, trekking, playa, trabajo)"),
  items: z
    .array(
      z.object({
        category: z.enum([
          "Remeras",
          "Pantalones",
          "Abrigos",
          "Zapatillas",
          "Accesorios",
          "Higiene",
          "Electrónica",
          "Otros",
        ]),
        name: z.string().describe("Nombre del item de ropa o accesorio"),
        quantity: z.number().int().min(1),
        weight: z.number().describe("Peso por unidad en kilogramos"),
      }),
    )
    .min(4),
});

export const Route = createFileRoute("/api/pack")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { prompt } = (await request.json()) as { prompt?: string };
          if (!prompt || typeof prompt !== "string") {
            return new Response(JSON.stringify({ error: "prompt requerido" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) {
            return new Response(JSON.stringify({ error: "Falta LOVABLE_API_KEY" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const gateway = createLovableAiGatewayProvider(key);
          const model = gateway("google/gemini-3-flash-preview");

          const { experimental_output: output } = await generateText({
            model,
            experimental_output: Output.object({ schema: SuggestionSchema }),
            system: `Sos un asistente experto en armar valijas para viajes.
Analizá CUIDADOSAMENTE lo que dice el usuario:
- Extraé el destino exacto (ciudad/país) que mencione.
- Extraé la cantidad EXACTA de días que diga (no inventes).
- Extraé el motivo del viaje (casamiento, playa, trabajo, trekking, etc.) y adaptá la ropa: si menciona un evento formal incluí ropa formal apropiada.
- Inferí el clima realista de ese destino en la fecha o estación que mencione (si no la dice, asumí la actual).
- Sugerí cantidades acordes a la duración del viaje (no llevar 7 remeras para 3 días).
- Si el destino es cálido, NO incluyas ropa de nieve. Si es frío, sí.
Devolvé una lista de items realista, balanceada y mínima para ese viaje específico.
Pesos en kilogramos por unidad (ej: 0.2 kg por remera).`,
            prompt,
          });

          return new Response(JSON.stringify(output), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error inesperado";
          const status = /429/.test(message) ? 429 : /402/.test(message) ? 402 : 500;
          return new Response(JSON.stringify({ error: message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
