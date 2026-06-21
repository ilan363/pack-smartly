import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

type AiModel = unknown;
type GenerateTextFn = (options: {
  model: AiModel;
  system: string;
  prompt: string;
}) => Promise<{ text: string }>;

type ProviderAttempt = { provider: string; model: AiModel };

/* =========================
   HELPERS IA
========================= */

function stripJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("La IA no devolvió JSON válido");
  }
  return candidate.slice(start, end + 1);
}

/* =========================
   TIPOS
========================= */

const CATEGORIES = [
  "Remeras",
  "Pantalones",
  "Abrigos",
  "Zapatillas",
  "Accesorios",
  "Higiene",
  "Electrónica",
  "Otros",
] as const;

type Category = (typeof CATEGORIES)[number];

type PackItem = {
  category: Category;
  name: string;
  quantity: number;
  weight: number;
};

type PackSuggestion = {
  destination: string;
  days: number;
  weather: string;
  occasion: string;
  items: PackItem[];
};

/* =========================
   NORMALIZADORES
========================= */

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeCategory(name: string): Category {
  const t = normalizeText(name);

  if (/remera|camisa|top|blusa/.test(t)) return "Remeras";
  if (/pantalon|jean|short/.test(t)) return "Pantalones";
  if (/campera|abrigo/.test(t)) return "Abrigos";
  if (/zapatilla|zapato/.test(t)) return "Zapatillas";
  if (/cargador|celular|electron/.test(t)) return "Electrónica";
  if (/higiene|shampoo|cepillo/.test(t)) return "Higiene";
  if (/anteojo|reloj|cinturon/.test(t)) return "Accesorios";

  return "Otros";
}

/* =========================
   CONTEXTO SIMPLE
========================= */

function extractTripContext(prompt: string) {
  const n = normalizeText(prompt);

  const days =
    Number(n.match(/(\d{1,2})\s*dias?/)?.[1]) ||
    3;

  const destination =
    prompt.match(/destino:\s*(.+)/i)?.[1] ||
    "Destino indicado";

  const warm = /playa|brasil|caribe/.test(n);
  const cold = /nieve|ski|ushuaia/.test(n);

  const formal = /boda|casamiento/.test(n);

  const extras: PackItem[] = [];

  if (/mate/.test(n)) {
    extras.push({
      category: "Otros",
      name: "Mate",
      quantity: 1,
      weight: 0.5,
    });
  }

  return {
    days,
    destination,
    warm,
    cold,
    formal,
    extras,
  };
}

/* =========================
   ITEMS BASE
========================= */

function realisticClothing(days: number) {
  return {
    shirts: Math.min(7, Math.max(2, Math.ceil(days / 2))),
    pants: Math.min(4, Math.max(1, Math.ceil(days / 4))),
    underwear: Math.min(10, Math.max(3, days)),
    socks: Math.min(10, Math.max(3, days)),
  };
}

function requiredItems(context: ReturnType<typeof extractTripContext>): PackItem[] {
  const q = realisticClothing(context.days);

  const items: PackItem[] = [
    { category: "Remeras", name: "Remeras", quantity: q.shirts, weight: 0.18 },
    { category: "Pantalones", name: "Pantalones", quantity: q.pants, weight: 0.5 },
    { category: "Otros", name: "Ropa interior", quantity: q.underwear, weight: 0.05 },
    { category: "Otros", name: "Medias", quantity: q.socks, weight: 0.04 },
    { category: "Higiene", name: "Neceser", quantity: 1, weight: 0.4 },
    { category: "Electrónica", name: "Cargador", quantity: 1, weight: 0.2 },
  ];

  if (context.warm) {
    items.push({
      category: "Otros",
      name: "Traje de baño",
      quantity: 1,
      weight: 0.2,
    });
  }

  if (context.cold) {
    items.push({
      category: "Abrigos",
      name: "Campera",
      quantity: 1,
      weight: 1.2,
    });
  }

  if (context.formal) {
    items.push({
      category: "Zapatillas",
      name: "Zapatos formales",
      quantity: 1,
      weight: 0.8,
    });
  }

  return items;
}

/* =========================
   NORMALIZACIÓN FINAL
========================= */

function normalizeSuggestion(raw: any, prompt: string): PackSuggestion {
  const ctx = extractTripContext(prompt);

  const items: PackItem[] = (raw.items ?? [])
    .map((i: any) => {
      if (!i?.name) return null;

      return {
        category: normalizeCategory(i.name),
        name: i.name,
        quantity: Math.max(1, Math.min(i.quantity ?? 1, 10)),
        weight: Number(i.weight ?? 0.2),
      };
    })
    .filter(Boolean);

  const required = requiredItems(ctx);

  const merged = [...required];

  for (const it of items) {
    if (!merged.some((m) => normalizeText(m.name) === normalizeText(it.name))) {
      merged.push(it);
    }
  }

  return {
    destination: titleCase(ctx.destination),
    days: ctx.days,
    weather: ctx.warm
      ? "Clima cálido"
      : ctx.cold
        ? "Clima frío"
        : "Clima templado",
    occasion: "Viaje",
    items: merged,
  };
}

/* =========================
   IA (con fallback seguro)
========================= */

async function buildProviderChain(): Promise<ProviderAttempt[]> {
  const chain: ProviderAttempt[] = [];

  const hasKey =
    process.env.LOVABLE_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.GROQ_API_KEY;

  if (!hasKey) return chain;

  return chain;
}

async function generatePackSuggestion(input: {
  prompt: string;
}) {
  const ctx = extractTripContext(input.prompt);

  try {
    const ai = await import("ai");
    const generateText: GenerateTextFn = ai.generateText;

    const { text } = await generateText({
      model: "mock",
      system: "Respondé SOLO JSON.",
      prompt: input.prompt,
    });

    return normalizeSuggestion(JSON.parse(stripJson(text)), input.prompt);
  } catch {
    // fallback
    return normalizeSuggestion({}, input.prompt);
  }
}

/* =========================
   ROUTE
========================= */

export const Route = createFileRoute("/api/pack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { prompt?: string };

        if (!body.prompt) {
          return new Response(JSON.stringify({ error: "prompt requerido" }), {
            status: 400,
          });
        }

        const suggestion = await generatePackSuggestion({
          prompt: body.prompt,
        });

        return new Response(JSON.stringify(suggestion), {
          status: 200,
        });
      },
    },
  },
});