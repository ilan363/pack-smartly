import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

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

type RawPackItem = {
  category?: string;
  name?: string;
  quantity?: number;
  weight?: number;
};

const RawSuggestionSchema = z.object({
  destination: z.string().optional(),
  days: z.coerce.number().int().min(1).max(90).optional(),
  weather: z.string().optional(),
  occasion: z.string().optional(),
  items: z
    .array(
      z.object({
        category: z.string().optional(),
        name: z.string().optional(),
        quantity: z.coerce.number().int().min(1).max(20).optional(),
        weight: z.coerce.number().min(0.01).max(8).optional(),
      }),
    )
    .optional(),
});

const MODEL_FALLBACKS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
] as const;

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function extractTripContext(prompt: string) {
  const normalized = normalizeText(prompt);
  const numericDays = normalized.match(/(\d{1,2})\s*(?:dias|dia|noches|noche)\b/);
  const wordDays = normalized.match(
    /\b(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince)\s*(?:dias|dia|noches|noche)\b/,
  );
  const days = numericDays
    ? Number(numericDays[1])
    : wordDays
      ? NUMBER_WORDS[wordDays[1]]
      : 3;

  const destinationMatch = normalized.match(
    /(?:viaje a|viajo a|voy a|me voy a|destino a|para|hacia|en)\s+([a-zñ ]+?)(?=\s+(?:por|durante|a un|a una|para un|para una|con|del|de|y|,|\.|$)|$)/,
  );
  const rawDestination = destinationMatch?.[1]
    ?.replace(/\b(?:un|una|el|la|los|las)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const destination = rawDestination && /\b(boda|casamiento|matrimonio)\b/.test(rawDestination)
    ? rawDestination.includes("playa")
      ? "playa"
      : undefined
    : rawDestination;

  const occasion = /casamiento|boda|matrimonio/.test(normalized)
    ? "Casamiento"
    : /playa|mar|costa/.test(normalized)
      ? "Playa"
      : /trabajo|negocio|reunion|conferencia/.test(normalized)
        ? "Trabajo"
        : /trekking|senderismo|montana|montaña|acampar/.test(prompt.toLowerCase())
          ? "Trekking"
          : /nieve|ski|esqui|ushuaia|bariloche/.test(normalized)
            ? "Frío / nieve"
            : "Viaje urbano";

  return {
    destination: destination ? titleCase(destination) : "Destino indicado",
    days: Math.max(1, Math.min(days, 90)),
    occasion,
    warm: /brasil|rio|salvador|playa|caribe|cancun|punta cana|cartagena|costa/.test(normalized),
    cold: /ushuaia|nieve|ski|esqui|patagonia|bariloche|calafate|islandia/.test(normalized),
    formal: /casamiento|boda|matrimonio|gala|evento formal/.test(normalized),
  };
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ClimateZone = "tropical" | "mediterranean" | "temperate" | "cold" | "desert" | "unknown";

const DESTINATION_CLIMATE: { match: RegExp; zone: ClimateZone; hemisphere: "N" | "S" }[] = [
  { match: /brasil|rio|salvador|fortaleza|recife|caribe|cancun|cuba|punta cana|cartagena|miami|hawaii|bali|tailandia|phuket|maldivas/, zone: "tropical", hemisphere: "N" },
  { match: /espana|españa|madrid|barcelona|valencia|sevilla|italia|roma|grecia|portugal|lisboa|marsella/, zone: "mediterranean", hemisphere: "N" },
  { match: /ushuaia|patagonia|bariloche|calafate|islandia|noruega|alaska|finlandia|laponia/, zone: "cold", hemisphere: "N" },
  { match: /paris|londres|berlin|amsterdam|nueva york|new york|chicago|toronto|moscu/, zone: "temperate", hemisphere: "N" },
  { match: /buenos aires|santiago|montevideo|cordoba|mendoza|rosario|lima/, zone: "temperate", hemisphere: "S" },
  { match: /dubai|egipto|cairo|marruecos|sahara|arizona|las vegas/, zone: "desert", hemisphere: "N" },
];

function detectClimate(destination: string): { zone: ClimateZone; hemisphere: "N" | "S" } {
  const n = normalizeText(destination);
  for (const c of DESTINATION_CLIMATE) if (c.match.test(n)) return { zone: c.zone, hemisphere: c.hemisphere };
  return { zone: "unknown", hemisphere: "N" };
}

function monthSeason(month: number, hemisphere: "N" | "S"): "verano" | "invierno" | "primavera" | "otoño" {
  const map = ["invierno", "invierno", "primavera", "primavera", "primavera", "verano", "verano", "verano", "otoño", "otoño", "otoño", "invierno"] as const;
  const s = map[month];
  if (hemisphere === "N") return s;
  const flip: Record<string, "verano" | "invierno" | "primavera" | "otoño"> = { verano: "invierno", invierno: "verano", primavera: "otoño", otoño: "primavera" };
  return flip[s];
}

function inferWeather(prompt: string, destination: string, warm: boolean, cold: boolean, days = 3) {
  const promptLower = prompt.toLowerCase();
  if (/calor|calido|cálido|playa|verano/.test(promptLower) && !cold) {
    return `Cálido durante los ${days} días: prendas livianas, hidratación y protección solar.`;
  }
  if (/frio|frío|nieve|invierno|ski|esqui/.test(promptLower) || cold) {
    return `Frío intenso a lo largo de los ${days} días: abrigo térmico, capas y guantes.`;
  }

  const { zone, hemisphere } = detectClimate(destination);
  const month = new Date().getUTCMonth();
  const season = monthSeason(month, hemisphere);

  const RANGES: Record<ClimateZone, Record<string, string>> = {
    tropical: {
      verano: "Caluroso y húmedo (28–34°C), lluvias breves posibles",
      invierno: "Cálido y seco (22–29°C), noches frescas",
      primavera: "Cálido (25–31°C), humedad moderada",
      otoño: "Cálido con chubascos (24–30°C)",
    },
    mediterranean: {
      verano: "Caluroso y seco (26–34°C), noches templadas",
      invierno: "Templado fresco (6–14°C), lluvias dispersas",
      primavera: "Agradable (14–22°C), ideal para capas livianas",
      otoño: "Templado (15–24°C), tardes cálidas y noches frescas",
    },
    temperate: {
      verano: "Templado cálido (20–28°C)",
      invierno: "Frío (-2 a 8°C), abrigo necesario",
      primavera: "Variable (10–20°C), llevar capas",
      otoño: "Fresco (8–18°C), posibles lluvias",
    },
    cold: {
      verano: "Fresco (5–14°C), viento y lluvia probable",
      invierno: "Frío extremo (-10 a 2°C), nieve frecuente",
      primavera: "Frío (0–8°C), aún con nieve",
      otoño: "Frío (2–10°C), viento intenso",
    },
    desert: {
      verano: "Muy caluroso de día (35–45°C), noches frescas",
      invierno: "Templado de día (18–25°C), noches frías",
      primavera: "Cálido seco (25–33°C)",
      otoño: "Cálido seco (24–32°C)",
    },
    unknown: {
      verano: warm ? "Cálido (24–30°C)" : "Templado cálido (20–26°C)",
      invierno: cold ? "Frío (0–8°C)" : "Templado fresco (8–15°C)",
      primavera: "Templado variable (14–22°C)",
      otoño: "Templado variable (12–20°C)",
    },
  };

  return `${RANGES[zone][season]} — pronóstico aproximado para tu estadía de ${days} día${days === 1 ? "" : "s"} (${season}).`;
}

function normalizeCategory(category: string | undefined, name: string): Category {
  if (CATEGORIES.includes(category as Category)) return category as Category;
  const text = normalizeText(`${category ?? ""} ${name}`);
  if (/remera|camisa|blusa|top|chomba|sueter|buzo/.test(text)) return "Remeras";
  if (/pantalon|jean|short|bermuda|pollera|falda/.test(text)) return "Pantalones";
  if (/campera|abrigo|saco|tapado|piloto|impermeable/.test(text)) return "Abrigos";
  if (/zapatilla|zapato|sandalia|ojota|bota/.test(text)) return "Zapatillas";
  if (/cargador|adaptador|celular|auricular|electron/.test(text)) return "Electrónica";
  if (/cepillo|shampoo|higiene|perfume|desodorante|protector/.test(text)) return "Higiene";
  if (/documento|pasaporte|anteojo|cinturon|reloj|accesorio/.test(text)) return "Accesorios";
  return "Otros";
}

function normalizeWeight(category: Category, quantity: number, rawWeight: number) {
  const maxPerUnit: Record<Category, number> = {
    Remeras: 0.45,
    Pantalones: 0.75,
    Abrigos: 1.4,
    Zapatillas: 1.2,
    Accesorios: 0.5,
    Higiene: 0.7,
    Electrónica: 0.8,
    Otros: 0.9,
  };
  const perUnit = quantity > 1 && rawWeight > maxPerUnit[category]
    ? rawWeight / quantity
    : rawWeight;
  return Math.max(0.02, Math.min(perUnit, 8));
}

function normalizeItem(item: RawPackItem): PackItem | null {
  const name = item.name?.trim();
  if (!name) return null;
  const quantity = Math.max(1, Math.min(Number(item.quantity ?? 1), 20));
  const category = normalizeCategory(item.category, name);
  const weight = normalizeWeight(category, quantity, Number(item.weight ?? 0.2));
  return {
    name,
    category,
    quantity,
    weight: Number(weight.toFixed(2)),
  };
}

function stripJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("La IA no devolvió JSON válido");
  return candidate.slice(start, end + 1);
}

function requiredItems(context: ReturnType<typeof extractTripContext>, destination: string): PackItem[] {
  const shirts = Math.min(context.days, 7);
  const items: PackItem[] = [
    { category: "Remeras", name: "Remeras o tops cómodos", quantity: shirts, weight: 0.18 },
    { category: "Pantalones", name: "Pantalón o jean versátil", quantity: Math.max(1, Math.ceil(context.days / 3)), weight: 0.55 },
    { category: "Otros", name: "Ropa interior", quantity: context.days, weight: 0.05 },
    { category: "Otros", name: "Medias", quantity: context.days, weight: 0.04 },
    { category: "Higiene", name: "Neceser de higiene personal", quantity: 1, weight: 0.45 },
    { category: "Electrónica", name: "Cargador de celular", quantity: 1, weight: 0.12 },
    { category: "Accesorios", name: "Documento, pasaporte y reservas", quantity: 1, weight: 0.08 },
  ];

  if (context.formal) {
    items.push(
      { category: "Otros", name: "Conjunto formal para el casamiento", quantity: 1, weight: 0.9 },
      { category: "Zapatillas", name: "Zapatos formales", quantity: 1, weight: 0.8 },
      { category: "Accesorios", name: "Accesorios formales", quantity: 1, weight: 0.15 },
    );
  }
  if (context.warm || /playa|brasil|caribe|costa/i.test(destination)) {
    items.push(
      { category: "Otros", name: "Traje de baño", quantity: 1, weight: 0.18 },
      { category: "Higiene", name: "Protector solar", quantity: 1, weight: 0.25 },
      { category: "Zapatillas", name: "Sandalias u ojotas", quantity: 1, weight: 0.35 },
    );
  }
  if (context.cold) {
    items.push(
      { category: "Abrigos", name: "Campera de abrigo", quantity: 1, weight: 1.1 },
      { category: "Abrigos", name: "Buzo o sweater térmico", quantity: 1, weight: 0.55 },
      { category: "Accesorios", name: "Gorro y guantes", quantity: 1, weight: 0.18 },
    );
  } else {
    items.push({ category: "Abrigos", name: "Campera liviana", quantity: 1, weight: 0.45 });
  }

  return items;
}

function normalizeSuggestion(raw: unknown, prompt: string): PackSuggestion {
  const context = extractTripContext(prompt);
  const parsed = RawSuggestionSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};
  const destination = context.destination !== "Destino indicado" ? context.destination : data.destination?.trim() || context.destination;
  const days = context.days || data.days || 3;
  const occasion = context.occasion !== "Viaje urbano" ? context.occasion : data.occasion?.trim() || context.occasion;
  const weather = data.weather?.trim() || inferWeather(prompt, destination, context.warm, context.cold);
  const aiItems = (data.items ?? []).map(normalizeItem).filter((item): item is PackItem => Boolean(item));
  const blockedSnow = !context.cold && !/nieve|ski|esqui|ushuaia|patagonia/i.test(prompt);
  const filteredItems = blockedSnow
    ? aiItems.filter((item) => !/nieve|ski|esqui|termic|guantes|gorro polar|botas de nieve/i.test(item.name))
    : aiItems;
  const merged = [...filteredItems];

  for (const required of requiredItems(context, destination)) {
    const exists = merged.some((item) => normalizeText(item.name).includes(normalizeText(required.name).slice(0, 10)));
    if (!exists) merged.push(required);
  }

  return {
    destination,
    days,
    weather,
    occasion,
    items: merged.slice(0, 22),
  };
}

async function generatePackSuggestion(prompt: string, key: string): Promise<PackSuggestion> {
  const gateway = createLovableAiGatewayProvider(key);
  const context = extractTripContext(prompt);
  let lastError: unknown;

  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = gateway(modelName);
      const { text } = await generateText({
        model,
        system: `Sos un asistente experto en equipaje. Respondé SOLO JSON válido, sin markdown.
Formato exacto: {"destination":"Ciudad o país","days":3,"weather":"resumen breve","occasion":"motivo","items":[{"category":"Remeras|Pantalones|Abrigos|Zapatillas|Accesorios|Higiene|Electrónica|Otros","name":"item","quantity":1,"weight":0.2}]}.
Reglas críticas: respetá destino y días del usuario; no cambies España por Ushuaia; si hay casamiento/boda incluí conjunto y zapatos formales; si es playa incluí traje de baño/protector; si no hay nieve no sugieras ropa de nieve; cantidades realistas para la duración.`,
        prompt: `Solicitud del usuario: ${prompt}\nContexto detectado: destino=${context.destination}, días=${context.days}, ocasión=${context.occasion}.`,
      });
      return normalizeSuggestion(JSON.parse(stripJson(text)), prompt);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (/429|rate limit/i.test(message) || /402|credit/i.test(message)) throw error;
      console.warn(`Pack AI model ${modelName} failed, trying fallback`, error);
    }
  }

  console.warn("Pack AI unavailable, using deterministic fallback", lastError);
  return normalizeSuggestion({}, prompt);
}

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

          const output = await generatePackSuggestion(prompt, key);

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
