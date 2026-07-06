import { z } from "zod";

import type { ForecastDay } from "@/lib/chat-store";
import { formatWeatherDate } from "@/lib/weather/codes";
import { fetchTripForecast, summarizeForecast } from "@/lib/weather/trip-forecast";

const env = import.meta.env;

type AiModel = unknown;
type GenerateTextFn = (options: {
  model: AiModel;
  system: string;
  prompt: string;
}) => Promise<{ text: string }>;
type ProviderAttempt = { provider: string; model: AiModel };

// Cadena de proveedores: si Lovable se queda sin créditos, cae a OpenRouter
// (modelos :free) y luego a Groq (Llama gratis). Si ninguno está disponible,
// se usa el fallback determinista local.
async function buildProviderChain(): Promise<ProviderAttempt[]> {
  const chain: ProviderAttempt[] = [];

  const hasAnyKey = Boolean(
    env.VITE_LOVABLE_API_KEY || env.VITE_OPENROUTER_API_KEY || env.VITE_GROQ_API_KEY,
  );
  if (!hasAnyKey) return chain;

  let providers: typeof import("@/lib/ai-gateway");
  try {
    providers = await import("@/lib/ai-gateway");
  } catch (error) {
    console.warn("[pack] No se pudieron cargar los proveedores IA; usando fallback local", error);
    return chain;
  }

  const lovableKey = env.VITE_LOVABLE_API_KEY;
  if (lovableKey) {
    const gw = providers.createLovableAiGatewayProvider(lovableKey);
    for (const m of [
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-flash",
      "openai/gpt-5-mini",
    ]) {
      chain.push({ provider: `lovable:${m}`, model: gw(m) });
    }
  }

  const openrouterKey = env.VITE_OPENROUTER_API_KEY;
  if (openrouterKey) {
    const or = providers.createOpenRouterProvider(openrouterKey);
    for (const m of [
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-exp:free",
      "deepseek/deepseek-chat-v3.1:free",
    ]) {
      chain.push({ provider: `openrouter:${m}`, model: or(m) });
    }
  }

  const groqKey = env.VITE_GROQ_API_KEY;
  if (groqKey) {
    const gq = providers.createGroqProvider(groqKey);
    for (const m of ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]) {
      chain.push({ provider: `groq:${m}`, model: gq(m) });
    }
  }

  return chain;
}

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

export type PackSuggestion = {
  destination: string;
  days: number;
  weather: string;
  occasion: string;
  suitcaseCapacityKg?: number;
  items: PackItem[];
  forecast: ForecastDay[];
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
  suitcaseCapacityKg: z.coerce.number().int().min(5).max(60).optional(),
  items: z
    .array(
      z.object({
        category: z.string().optional(),
        name: z.string().optional(),
        quantity: z.coerce.number().int().min(1).max(50).optional(),
        weight: z.coerce.number().min(0.01).max(8).optional(),
      }),
    )
    .optional(),
});


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
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  sesenta: 60,
  noventa: 90,
};

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function parseWordOrNumber(token: string): number | null {
  if (NUMBER_WORDS[token] != null) return NUMBER_WORDS[token];
  const n = Number(token);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDurationFromText(text: string): number | null {
  const n = normalizeText(text);

  const months = n.match(
    /\b(\d+|un|una|dos|tres|cuatro|cinco|seis|doce|veinte|treinta|cuarenta|sesenta|noventa)\s*mes(?:es)?\b/,
  );
  if (months) {
    const v = parseWordOrNumber(months[1]);
    if (v) return Math.min(120, v * 30);
  }

  const weeks = n.match(
    /\b(\d+|un|una|dos|tres|cuatro|cinco|seis|ocho|doce|quince|veinte)\s*semana(?:s)?\b/,
  );
  if (weeks) {
    const v = parseWordOrNumber(weeks[1]);
    if (v) return Math.min(120, v * 7);
  }

  return null;
}

function monthFromDate(date?: string): number | null {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getMonth();
}

function isColdSeasonMonth(month: number | null, hemisphere: "N" | "S") {
  if (month == null) return false;
  const coldNorth = month === 11 || month === 0 || month === 1 || month === 2;
  return hemisphere === "N" ? coldNorth : !coldNorth;
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Corrige errores frecuentes de la IA en español rioplatense (ej. "medios" → "Medias"). */
function fixSpanishClothingName(name: string): string {
  const normalized = normalizeText(name);
  if (/^medios?$|^par de medios|^medios de/.test(normalized)) return "Medias";
  if (/calcetin/.test(normalized)) return "Medias";
  return name.replace(/\bmedios\b/gi, "Medias");
}

type ExtraSpec = { match: RegExp; item: PackItem };
const NOTE_EXTRAS: ExtraSpec[] = [
  { match: /anteojos?\s*de\s*sol|gafas\s*de\s*sol|lentes\s*de\s*sol/, item: { category: "Accesorios", name: "Anteojos de sol", quantity: 1, weight: 0.08 } },
  { match: /anteojos?\s*(?:de\s*lectura|recetados?|graduados?)|lentes\s*recetad/, item: { category: "Accesorios", name: "Anteojos recetados", quantity: 1, weight: 0.08 } },
  { match: /\bmate\b|bombilla|yerba/, item: { category: "Otros", name: "Mate y yerba", quantity: 1, weight: 0.5 } },
  { match: /libro|lectura/, item: { category: "Otros", name: "Libro", quantity: 1, weight: 0.3 } },
  { match: /laptop|notebook/, item: { category: "Electrónica", name: "Laptop", quantity: 1, weight: 1.4 } },
  { match: /auricular|headphone|airpods/, item: { category: "Electrónica", name: "Auriculares", quantity: 1, weight: 0.15 } },
  { match: /camara|cámara/, item: { category: "Electrónica", name: "Cámara", quantity: 1, weight: 0.55 } },
  { match: /paraguas/, item: { category: "Accesorios", name: "Paraguas plegable", quantity: 1, weight: 0.35 } },
  { match: /medicac|remedio|pastilla/, item: { category: "Higiene", name: "Medicación personal", quantity: 1, weight: 0.15 } },
  { match: /toalla/, item: { category: "Otros", name: "Toalla", quantity: 1, weight: 0.4 } },
  { match: /gorra|sombrero/, item: { category: "Accesorios", name: "Gorra o sombrero", quantity: 1, weight: 0.12 } },
  { match: /zapatill/, item: { category: "Zapatillas", name: "Zapatillas extra", quantity: 1, weight: 1.0 } },
  { match: /vestido|falda\s+larga/, item: { category: "Otros", name: "Vestido o falda", quantity: 1, weight: 0.35 } },
  { match: /remera\s+deportiva|musculosa|remera\s+running/, item: { category: "Remeras", name: "Remera deportiva", quantity: 1, weight: 0.15 } },
  { match: /pijama/, item: { category: "Otros", name: "Pijama", quantity: 1, weight: 0.3 } },
  { match: /buzo|hoodie|sweater|sueter/, item: { category: "Abrigos", name: "Buzo o sweater", quantity: 1, weight: 0.55 } },
];

function extractExtras(text: string): PackItem[] {
  if (!text) return [];
  const n = normalizeText(text);
  const out: PackItem[] = [];
  for (const e of NOTE_EXTRAS) {
    if (e.match.test(n) && !out.some((o) => o.name === e.item.name)) out.push(e.item);
  }
  return out;
}

export type TripInput = {
  destination: string;
  days: number;
  dateFrom?: string;
  dateTo?: string;
  occasion?: string;
};

function computeDaysFromDates(dateFrom?: string, dateTo?: string): number | null {
  if (!dateFrom || !dateTo) return null;
  const start = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** Normaliza notas en lista (viñetas o líneas) a un bloque que la IA y extractExtras pueden usar. */
function parseStructuredNotes(prompt: string): string {
  const block = prompt.match(/notas?\s*:\s*([\s\S]+)$/i)?.[1]?.trim() ?? "";
  if (!block) return "";

  const lines = block
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.join(". ") : block;
}

function extractTripContext(prompt: string, trip?: TripInput) {
  const normalized = normalizeText(prompt);

  // Datos estructurados que envía la UI: "Destino: X", "Días: 8", "Notas: ..."
  const structDestination = prompt.match(/destino\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const structDaysRaw = prompt.match(/d[ií]as?\s*:\s*(\d+)/i)?.[1];
  const structDateFrom = prompt.match(/desde\s*:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const structDateTo = prompt.match(/hasta\s*:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const structOccasion = prompt.match(/ocasi[oó]n\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const structNotes = parseStructuredNotes(prompt);

  const daysFromDates = computeDaysFromDates(
    trip?.dateFrom ?? structDateFrom,
    trip?.dateTo ?? structDateTo,
  );

  const numericDays = normalized.match(
    /\bdias\s*:\s*(\d+)\b|\b(\d{1,2})\s*(?:dias|dia|noches|noche)\b/,
  );
  const wordDays = normalized.match(
    /\b(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince)\s*(?:dias|dia|noches|noche)\b/,
  );

  const durationFromText = parseDurationFromText(
    `${structNotes} ${structOccasion ?? ""} ${prompt}`,
  );

  let parsedDays = 3;
  if (structDaysRaw) {
    parsedDays = Number(structDaysRaw);
  } else if (daysFromDates) {
    parsedDays = daysFromDates;
  } else if (durationFromText) {
    parsedDays = durationFromText;
  } else if (numericDays) {
    parsedDays = Number(numericDays[1] ?? numericDays[2]);
  } else if (wordDays) {
    parsedDays = NUMBER_WORDS[wordDays[1]];
  }

  const days =
    trip?.days != null && trip.days > 0
      ? trip.days
      : Math.max(1, Math.min(parsedDays, 120));

  const destinationMatch = normalized.match(
    /(?:viaje a|viajo a|voy a|me voy a|destino a|para|hacia|en)\s+([a-zñ ]+?)(?=\s+(?:por|durante|a un|a una|para un|para una|con|del|de|y|,|\.|$)|$)/,
  );
  const rawDestination = (structDestination ?? destinationMatch?.[1] ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(?:un|una|el|la|los|las)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const destinationFromPrompt = rawDestination
    ? titleCase(rawDestination)
    : structDestination
      ? titleCase(structDestination)
      : "Destino indicado";

  const destination =
    trip?.destination?.trim() ? titleCase(trip.destination.trim()) : destinationFromPrompt;

  const occasion = trip?.occasion?.trim()
    ? titleCase(trip.occasion.trim())
    : structOccasion
      ? titleCase(structOccasion.toLowerCase())
      : /casamiento|boda|matrimonio/.test(normalized)
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

  const extras = extractExtras(`${structNotes} ${prompt}`);

  const destBlob = normalizeText(`${destination} ${structDestination ?? ""} ${prompt}`);
  const usaWarm =
    /miami|orlando|florida|hawaii|honolulu|los angeles|san diego|phoenix|las vegas|houston|dallas|san antonio|san juan pr/.test(
      destBlob,
    );
  const usaCold =
    /new york|nyc|boston|chicago|seattle|denver|minneapolis|alaska|washington dc|philadelphia|detroit|filadelfia/.test(
      destBlob,
    );
  const isUsa =
    /estados unidos|estados unidos|usa\b|united states|eeuu|ee uu|u s a|america del norte/.test(destBlob) ||
    usaWarm ||
    usaCold;
  const tripMonth = monthFromDate(trip?.dateFrom ?? structDateFrom);
  const usaSeasonCold = isUsa && !usaWarm && isColdSeasonMonth(tripMonth, "N");

  return {
    destination,
    days,
    dateFrom: trip?.dateFrom ?? structDateFrom,
    dateTo: trip?.dateTo ?? structDateTo,
    occasion,
    warm:
      /brasil|rio|salvador|playa|caribe|cancun|punta cana|cartagena|costa|miami|hawaii|florida|tailandia|bali/.test(
        destBlob,
      ) || usaWarm,
    cold:
      /ushuaia|nieve|ski|esqui|patagonia|bariloche|calafate|islandia|alaska|montana|colorado ski/.test(destBlob) ||
      usaCold ||
      usaSeasonCold,
    formal: /casamiento|boda|matrimonio|gala|evento formal/.test(normalized),
    notes: structNotes,
    extras,
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

function buildForecast(
  destination: string,
  days: number,
  warm: boolean,
  cold: boolean,
  dateFrom?: string,
): ForecastDay[] {
  const promptCold = cold;
  const { zone, hemisphere } = detectClimate(destination);
  const month = new Date().getUTCMonth();
  const season = monthSeason(month, hemisphere);

  type Range = { min: [number, number]; max: [number, number]; conds: { c: string; i: ForecastDay["icon"]; w: number }[] };
  const BY_ZONE: Record<ClimateZone, Record<string, Range>> = {
    tropical: {
      verano: { min: [23, 26], max: [30, 34], conds: [{ c: "Soleado y húmedo", i: "sun", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 3 }, { c: "Lluvias breves", i: "rain", w: 2 }, { c: "Tormenta tropical", i: "storm", w: 1 }] },
      invierno: { min: [18, 22], max: [25, 30], conds: [{ c: "Soleado", i: "sun", w: 4 }, { c: "Parcialmente nublado", i: "partly", w: 3 }, { c: "Llovizna", i: "rain", w: 1 }] },
      primavera: { min: [20, 24], max: [27, 32], conds: [{ c: "Soleado", i: "sun", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 3 }, { c: "Chubascos", i: "rain", w: 2 }] },
      otoño: { min: [19, 23], max: [26, 31], conds: [{ c: "Nublado", i: "cloud", w: 3 }, { c: "Lluvias", i: "rain", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
    },
    mediterranean: {
      verano: { min: [19, 23], max: [28, 34], conds: [{ c: "Soleado", i: "sun", w: 5 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
      invierno: { min: [4, 9], max: [9, 15], conds: [{ c: "Nublado", i: "cloud", w: 3 }, { c: "Lluvia", i: "rain", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
      primavera: { min: [10, 15], max: [17, 23], conds: [{ c: "Soleado", i: "sun", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 3 }, { c: "Lluvias dispersas", i: "rain", w: 2 }] },
      otoño: { min: [11, 16], max: [18, 24], conds: [{ c: "Parcialmente nublado", i: "partly", w: 3 }, { c: "Lluvias", i: "rain", w: 2 }, { c: "Soleado", i: "sun", w: 2 }] },
    },
    temperate: {
      verano: { min: [15, 19], max: [22, 28], conds: [{ c: "Soleado", i: "sun", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 3 }, { c: "Chubascos", i: "rain", w: 1 }] },
      invierno: { min: [-3, 3], max: [3, 9], conds: [{ c: "Nublado", i: "cloud", w: 3 }, { c: "Lluvia", i: "rain", w: 2 }, { c: "Nieve", i: "snow", w: 2 }] },
      primavera: { min: [6, 12], max: [13, 21], conds: [{ c: "Variable", i: "partly", w: 3 }, { c: "Lluvia", i: "rain", w: 2 }, { c: "Soleado", i: "sun", w: 2 }] },
      otoño: { min: [5, 10], max: [11, 18], conds: [{ c: "Nublado", i: "cloud", w: 3 }, { c: "Lluvia", i: "rain", w: 2 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
    },
    cold: {
      verano: { min: [2, 6], max: [8, 14], conds: [{ c: "Nublado y ventoso", i: "cloud", w: 3 }, { c: "Lluvia", i: "rain", w: 2 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
      invierno: { min: [-12, -5], max: [-5, 2], conds: [{ c: "Nieve", i: "snow", w: 5 }, { c: "Nublado", i: "cloud", w: 2 }] },
      primavera: { min: [-3, 2], max: [3, 9], conds: [{ c: "Nieve", i: "snow", w: 3 }, { c: "Nublado", i: "cloud", w: 3 }, { c: "Lluvia fría", i: "rain", w: 1 }] },
      otoño: { min: [0, 5], max: [5, 11], conds: [{ c: "Viento intenso", i: "cloud", w: 3 }, { c: "Lluvia", i: "rain", w: 2 }, { c: "Nieve temprana", i: "snow", w: 1 }] },
    },
    desert: {
      verano: { min: [22, 27], max: [36, 45], conds: [{ c: "Soleado extremo", i: "sun", w: 6 }] },
      invierno: { min: [6, 12], max: [18, 25], conds: [{ c: "Soleado", i: "sun", w: 4 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
      primavera: { min: [12, 17], max: [25, 33], conds: [{ c: "Soleado", i: "sun", w: 5 }, { c: "Viento con polvo", i: "cloud", w: 1 }] },
      otoño: { min: [13, 18], max: [24, 32], conds: [{ c: "Soleado", i: "sun", w: 5 }, { c: "Parcialmente nublado", i: "partly", w: 1 }] },
    },
    unknown: {
      verano: { min: warm ? [20, 24] : [16, 20], max: warm ? [28, 32] : [22, 27], conds: [{ c: "Soleado", i: "sun", w: 3 }, { c: "Parcialmente nublado", i: "partly", w: 2 }] },
      invierno: { min: promptCold ? [-3, 2] : [4, 9], max: promptCold ? [3, 8] : [10, 15], conds: [{ c: "Nublado", i: "cloud", w: 2 }, { c: "Parcialmente nublado", i: "partly", w: 2 }, { c: "Lluvia", i: "rain", w: 1 }] },
      primavera: { min: [10, 14], max: [16, 22], conds: [{ c: "Variable", i: "partly", w: 3 }, { c: "Lluvia", i: "rain", w: 1 }] },
      otoño: { min: [8, 13], max: [14, 20], conds: [{ c: "Nublado", i: "cloud", w: 2 }, { c: "Parcialmente nublado", i: "partly", w: 2 }, { c: "Lluvia", i: "rain", w: 1 }] },
    },
  };

  const range = BY_ZONE[zone][season];
  const totalW = range.conds.reduce((a, c) => a + c.w, 0);
  // Deterministic pseudo-random per destination so the same trip stays stable
  const seedBase = Array.from(destination).reduce((a, c) => a + c.charCodeAt(0), 0) + month;
  const rand = (i: number) => {
    const x = Math.sin(seedBase * 9301 + i * 49297) * 233280;
    return x - Math.floor(x);
  };
  const tripStart = dateFrom ? new Date(`${dateFrom}T12:00:00`) : new Date();
  if (Number.isNaN(tripStart.getTime())) {
    tripStart.setTime(Date.now());
  }

  const out: ForecastDay[] = [];
  for (let i = 0; i < Math.min(days, 14); i++) {
    const r1 = rand(i + 1);
    const r2 = rand(i + 50);
    const r3 = rand(i + 99);
    const tempMin = Math.round(range.min[0] + (range.min[1] - range.min[0]) * r1);
    const tempMax = Math.round(range.max[0] + (range.max[1] - range.max[0]) * r2);
    let acc = r3 * totalW;
    let picked = range.conds[0];
    for (const c of range.conds) {
      acc -= c.w;
      if (acc <= 0) { picked = c; break; }
    }
    const date = new Date(tripStart);
    date.setDate(tripStart.getDate() + i);
    const iso = date.toISOString().slice(0, 10);
    out.push({
      day: i + 1,
      date: iso,
      label: formatWeatherDate(iso),
      tempMin,
      tempMax: Math.max(tempMax, tempMin + 2),
      conditions: picked.c,
      icon: picked.i,
    });
  }
  return out;
}

async function enrichWithForecast(
  suggestion: PackSuggestion,
  context: ReturnType<typeof extractTripContext>,
): Promise<PackSuggestion> {
  const real = await fetchTripForecast({
    destination: suggestion.destination,
    days: suggestion.days,
    dateFrom: context.dateFrom,
    dateTo: context.dateTo,
  });
  const forecast =
    real ??
    buildForecast(
      suggestion.destination,
      suggestion.days,
      context.warm,
      context.cold,
      context.dateFrom,
    );
  const weather = real?.length
    ? summarizeForecast(forecast, suggestion.days)
    : suggestion.weather;
  return { ...suggestion, forecast, weather };
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
  if (/^medios?$|^media$|^medias$|calcetin/.test(text)) return "Otros";
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
  const rawName = item.name?.trim();
  if (!rawName) return null;
  const name = fixSpanishClothingName(rawName);
  const quantity = Math.max(1, Math.min(Number(item.quantity ?? 1), 10));
  const category = normalizeCategory(item.category, name);
  const weight = normalizeWeight(category, quantity, Number(item.weight ?? 0.2));
  return {
    name: normalizeText(name) === "medias" ? "Medias" : name,
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

type ClothingBudget = {
  shirts: number;
  pants: number;
  shorts: number;
  underwear: number;
  socks: number;
  outerwear: number;
};

type ClothingSlot =
  | "shirts"
  | "pants"
  | "shorts"
  | "underwear"
  | "socks"
  | "outerwear"
  | "swimwear"
  | "formal"
  | "footwear"
  | "other_clothing";

function computeClothingBudget(
  context: ReturnType<typeof extractTripContext>,
  destination: string,
): ClothingBudget {
  const days = context.days;
  const destNorm = normalizeText(`${destination} ${context.notes ?? ""}`);
  const notesNorm = normalizeText(`${context.notes ?? ""} ${context.occasion ?? ""}`);
  const occasionNorm = normalizeText(context.occasion);

  const longStay = days > 21;
  const extendedStay = days > 45;
  const assumesLaundry =
    longStay && !/sin lavander|no lavar|no laundry|sin lavarrop/.test(notesNorm);

  // Cantidades según duración (viajes largos = menos prendas por día, se asume lavandería).
  let shirts: number;
  if (days <= 5) {
    shirts = Math.max(2, Math.ceil(days * 0.65) + 1);
  } else if (days <= 14) {
    shirts = Math.max(3, Math.ceil(days / 2));
  } else if (days <= 30) {
    shirts = assumesLaundry ? 4 + Math.ceil(days / 9) : Math.ceil(days / 3);
  } else {
    shirts = assumesLaundry ? 5 + Math.floor(days / 10) : Math.ceil(days / 4);
  }

  let pants: number;
  if (days <= 7) {
    pants = Math.max(1, Math.ceil(days / 5));
  } else if (days <= 21) {
    pants = Math.max(2, Math.ceil(days / 6));
  } else {
    pants = assumesLaundry ? 2 + Math.floor(days / 16) : Math.ceil(days / 8);
  }

  let underwear: number;
  let socks: number;
  if (assumesLaundry) {
    underwear = 4 + Math.ceil(days / 8);
    socks = 4 + Math.ceil(days / 7);
  } else {
    underwear = Math.ceil(days * 0.85);
    socks = Math.ceil(days * 0.75);
  }

  const shirtCap = extendedStay ? 14 : longStay ? 11 : days <= 7 ? 6 : 9;
  const pantsCap = extendedStay ? 7 : longStay ? 5 : 4;
  shirts = clampInt(shirts, 2, shirtCap);
  pants = clampInt(pants, 1, pantsCap);
  underwear = clampInt(underwear, 3, extendedStay ? 14 : longStay ? 12 : 10);
  socks = clampInt(socks, 3, extendedStay ? 14 : longStay ? 12 : 10);

  let shorts = 0;
  let outerwear = context.cold ? 2 : 1;

  const beach =
    context.warm ||
    /playa|mar|costa|caribe|cancun|punta cana|miami|hawaii|florida|bali|phuket/.test(destNorm) ||
    occasionNorm.includes("playa");

  if (beach) {
    shorts = clampInt(days <= 10 ? 1 + Math.floor(days / 6) : 2 + Math.floor(days / 12), 1, extendedStay ? 5 : 3);
    pants = clampInt(pants - (days <= 14 ? 1 : 0), 1, pantsCap);
    shirts = clampInt(shirts - (days <= 10 ? 1 : 0), 2, shirtCap);
  }

  if (context.cold) {
    outerwear = longStay ? 3 : 2;
    shirts = clampInt(shirts + 1, 2, shirtCap + 1);
    socks = clampInt(socks + 1, 3, extendedStay ? 15 : 12);
  }

  if (/estados unidos|usa\b|united states|eeuu|ee uu|new york|los angeles|miami|chicago|boston/.test(destNorm)) {
    if (context.cold) {
      pants = clampInt(pants + 1, 1, pantsCap + 1);
    }
    if (beach && !context.cold) {
      shorts = clampInt(shorts + 1, 1, extendedStay ? 6 : 4);
    }
  }

  if (context.formal || /casamiento|boda|matrimonio|gala|formal/.test(occasionNorm)) {
    shirts = clampInt(shirts + (longStay ? 2 : 1), 2, shirtCap + 2);
    pants = clampInt(pants + 1, 1, pantsCap + 1);
  }

  if (/trabajo|negocio|conferencia|reunion|oficina|work|business/.test(occasionNorm)) {
    shirts = clampInt(shirts + 1, 2, shirtCap + 1);
    pants = clampInt(pants + (longStay ? 2 : 1), 1, pantsCap + 2);
  }

  if (/trekking|senderismo|montana|acampar|campamento|hiking/.test(occasionNorm)) {
    socks = clampInt(socks + 2, 3, extendedStay ? 16 : 13);
    shirts = clampInt(shirts + 1, 2, shirtCap + 1);
  }

  if (/lavander|lavarrop|laundry|wash and wear/.test(notesNorm)) {
    shirts = clampInt(3 + Math.ceil(days / 10), 2, shirtCap);
    pants = clampInt(1 + Math.ceil(days / 14), 1, pantsCap);
    underwear = clampInt(3 + Math.ceil(days / 9), 3, extendedStay ? 12 : 10);
    socks = clampInt(3 + Math.ceil(days / 8), 3, extendedStay ? 12 : 10);
  }

  if (/equipaje de mano|carry on|carry-on|valija chica|valija peque|poco espacio|minimal|liviano|solo mochila/.test(notesNorm)) {
    shirts = clampInt(shirts - 2, 2, shirtCap);
    pants = clampInt(pants - 1, 1, pantsCap);
    underwear = clampInt(underwear - 2, 2, extendedStay ? 10 : 8);
    socks = clampInt(socks - 2, 2, extendedStay ? 10 : 8);
    shorts = Math.max(0, shorts - 1);
  }

  return { shirts, pants, shorts, underwear, socks, outerwear };
}

function clothingSlot(item: PackItem): ClothingSlot | null {
  const t = normalizeText(`${item.category} ${item.name}`);

  if (
    /documento|pasaporte|reserva|cargador|adaptador|cepillo|shampoo|neceser|medic|mate|libro|laptop|auricular|camara|paraguas|protector solar|desodorante|perfume/.test(
      t,
    )
  ) {
    return null;
  }

  if (/traje de bano|traje de baño|malla|bikini/.test(t)) return "swimwear";
  if (/conjunto formal|smoking|corbata|moño|traje sastre/.test(t)) return "formal";
  if (/vestido|falda larga/.test(t)) return "formal";
  if (/zapat|sandalia|ojota|bota/.test(t)) return "footwear";
  if (/short|bermuda/.test(t)) return "shorts";
  if (/ropa interior|calzon|bombacha|boxer|braga/.test(t)) return "underwear";
  if (/^medios?$|^media$|^medias$|calcetin|calcetines|par de medios/.test(t)) return "socks";
  if (/remera deportiva|musculosa|remera running/.test(t)) return "other_clothing";
  if (/pijama/.test(t)) return "other_clothing";
  if (item.category === "Abrigos" || /campera|abrigo|tapado|piloto|impermeable|buzo|sweater|sueter|chaqueta/.test(t)) {
    return "outerwear";
  }
  if (item.category === "Remeras" || /remera|camisa|blusa|top|chomba|polo/.test(t)) return "shirts";
  if (item.category === "Pantalones" || /pantalon|jean|jogger|legging|falda|pollera/.test(t)) return "pants";
  if (item.category === "Otros" && /ropa|prenda|conjunto/.test(t)) return "other_clothing";

  return null;
}

const CANONICAL_CLOTHING: Record<
  "shirts" | "pants" | "shorts" | "underwear" | "socks",
  Pick<PackItem, "category" | "name" | "weight">
> = {
  shirts: { category: "Remeras", name: "Remeras o tops cómodos", weight: 0.18 },
  pants: { category: "Pantalones", name: "Pantalón o jean versátil", weight: 0.55 },
  shorts: { category: "Pantalones", name: "Short o bermuda", weight: 0.25 },
  underwear: { category: "Otros", name: "Ropa interior", weight: 0.05 },
  socks: { category: "Otros", name: "Medias", weight: 0.04 },
};

function mergeClothingGroup(
  group: PackItem[],
  slot: keyof typeof CANONICAL_CLOTHING,
  limit: number,
): PackItem | null {
  if (limit <= 0) return null;

  const totalQty = group.reduce((sum, it) => sum + it.quantity, 0);
  if (totalQty <= 0) return null;
  const finalQty = Math.min(totalQty, limit);

  const canonical = CANONICAL_CLOTHING[slot];
  const primary = group.find((it) => normalizeText(it.name).includes(normalizeText(canonical.name).slice(0, 8))) ?? group[0];
  const weight = primary?.weight ?? canonical.weight;

  return {
    category: canonical.category,
    name: canonical.name,
    quantity: finalQty,
    weight: Number(weight.toFixed(2)),
  };
}

function enforceClothingBudget(
  items: PackItem[],
  context: ReturnType<typeof extractTripContext>,
  destination: string,
): PackItem[] {
  const budget = computeClothingBudget(context, destination);
  const slotLimits: Record<ClothingSlot, number> = {
    shirts: budget.shirts,
    pants: budget.pants,
    shorts: budget.shorts,
    underwear: budget.underwear,
    socks: budget.socks,
    outerwear: budget.outerwear,
    swimwear: 2,
    formal: context.formal ? 3 : 2,
    footwear: 3,
    other_clothing: 4,
  };

  const nonClothing: PackItem[] = [];
  const bySlot = new Map<ClothingSlot, PackItem[]>();

  for (const item of items) {
    const slot = clothingSlot(item);
    if (!slot) {
      nonClothing.push(item);
      continue;
    }
    const list = bySlot.get(slot) ?? [];
    list.push(item);
    bySlot.set(slot, list);
  }

  const result = [...nonClothing];
  const managedSlots: Array<keyof typeof CANONICAL_CLOTHING> = [
    "shirts",
    "pants",
    "shorts",
    "underwear",
    "socks",
  ];

  for (const slot of managedSlots) {
    const merged = mergeClothingGroup(bySlot.get(slot) ?? [], slot, slotLimits[slot]);
    if (merged) result.push(merged);
    bySlot.delete(slot);
  }

  for (const [slot, group] of bySlot) {
    const limit = slotLimits[slot];
    let remaining = limit;
    for (const item of group) {
      if (remaining <= 0) break;
      const qty = Math.min(item.quantity, remaining);
      if (qty <= 0) continue;
      result.push({ ...item, quantity: qty });
      remaining -= qty;
    }
  }

  return result;
}

function requiredItems(context: ReturnType<typeof extractTripContext>, destination: string): PackItem[] {
  const budget = computeClothingBudget(context, destination);

  const items: PackItem[] = [
    { category: "Remeras", name: "Remeras o tops cómodos", quantity: budget.shirts, weight: 0.18 },
    { category: "Pantalones", name: "Pantalón o jean versátil", quantity: budget.pants, weight: 0.55 },
    { category: "Otros", name: "Ropa interior", quantity: budget.underwear, weight: 0.05 },
    { category: "Otros", name: "Medias", quantity: budget.socks, weight: 0.04 },
    { category: "Higiene", name: "Neceser de higiene personal", quantity: 1, weight: 0.45 },
    { category: "Electrónica", name: "Cargador de celular", quantity: 1, weight: 0.12 },
    { category: "Accesorios", name: "Documento, pasaporte y reservas", quantity: 1, weight: 0.08 },
  ];

  if (budget.shorts > 0) {
    items.push({
      category: "Pantalones",
      name: "Short o bermuda",
      quantity: budget.shorts,
      weight: 0.25,
    });
  }

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

  // Extras pedidos en las notas del usuario (anteojos, libro, mate, etc.)
  for (const extra of context.extras) {
    const exists = items.some((i) => normalizeText(i.name) === normalizeText(extra.name));
    if (!exists) items.push(extra);
  }

  return items;
}

function clampCapacityKg(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < 5 || rounded > 60) return undefined;
  return rounded;
}

function perUnitVolumeLiters(item: Pick<PackItem, "category" | "name" | "weight">): number {
  // Very rough heuristic, good enough to prioritize "bulky" items.
  const t = normalizeText(`${item.category} ${item.name}`);
  if (/campera|abrigo|tapado|piloto|impermeable/.test(t)) return 12;
  if (/buzo|sweater|sueter|hoodie/.test(t)) return 8;
  if (/pantalon|jean|cargo/.test(t)) return 5;
  if (/zapatilla|zapato|bota|sandalia|ojota/.test(t)) return 10;
  if (/traje de bano|traje de baño|malla|bikini/.test(t)) return 2;
  if (/toalla/.test(t)) return 6;
  if (/neceser|higiene|shampoo|perfume|cosmet/.test(t)) return 4;
  if (/laptop|notebook/.test(t)) return 7;
  if (/cargador|adaptador|auricular/.test(t)) return 1.2;
  if (/remera|camisa|blusa|top|chomba/.test(t)) return 2.2;
  if (/ropa interior|calzon|bombacha|boxer|braga/.test(t)) return 0.5;
  if (/media|medias|medios|calcetin|calcetines/.test(t)) return 0.4;
  return Math.max(0.8, Math.min(9, item.weight * 5)); // fallback: correlate with weight
}

function budgetItemLimit(capacityKg: number, days: number) {
  // Cap by weight capacity, with a small bump for longer trips.
  const base = capacityKg <= 12 ? 15 : capacityKg <= 20 ? 18 : capacityKg <= 30 ? 22 : capacityKg <= 45 ? 28 : 34;
  const bump = Math.min(6, Math.floor((Math.max(1, days) - 3) / 4));
  return Math.min(45, base + bump);
}

function weightOf(items: PackItem[]) {
  return items.reduce((acc, it) => acc + it.weight * it.quantity, 0);
}

function adjustRequiredToFitWeight(required: PackItem[], capacityKg: number) {
  const weightBudget = capacityKg * 0.95; // leave a bit of headroom
  const fixed = required.filter((it) => !/remera|tops|pantalon|jean|jean versátil|ropa interior|medias|medios/.test(normalizeText(`${it.category} ${it.name}`)));
  const adjustable = required.filter((it) =>
    /remera|tops|pantalon|jean|ropa interior|medias|medios/.test(normalizeText(`${it.category} ${it.name}`)),
  );

  const fixedWeight = weightOf(fixed);
  const adjustableWeight = weightOf(adjustable);
  const total = fixedWeight + adjustableWeight;
  if (total <= weightBudget) return required;
  if (adjustable.length === 0) return required;

  // Scale down adjustable quantities proportionally, but never below 1.
  const targetAdjustableWeight = Math.max(0, weightBudget - fixedWeight);
  const ratio = adjustableWeight > 0 ? targetAdjustableWeight / adjustableWeight : 0;

  const adjusted = required.map((it) => {
    const isAdjustable = adjustable.some((a) => a.name === it.name && a.category === it.category);
    if (!isAdjustable) return it;
    const newQty = Math.max(1, Math.floor(it.quantity * ratio));
    return { ...it, quantity: newQty };
  });

  // If rounding still overshoots budget, decrement until it fits (or we hit min quantities).
  let current = weightOf(adjusted);
  if (current <= weightBudget) return adjusted;

  const decOrder = [...adjusted]
    .filter((it) => /remera|tops|pantalon|jean|ropa interior|medias|medios/.test(normalizeText(`${it.category} ${it.name}`)) && it.quantity > 1)
    .sort((a, b) => b.weight - a.weight); // reduce heavier units first

  while (current > weightBudget) {
    const next = decOrder.find((it) => it.quantity > 1);
    if (!next) break;
    next.quantity -= 1;
    current -= next.weight;
  }

  return adjusted;
}

function applyCapacityBudget(input: {
  items: PackItem[];
  required: PackItem[];
  capacityKg: number;
  days: number;
  prompt: string;
}) {
  const requiredKeys = new Set(input.required.map((it) => normalizeText(`${it.category}|${it.name}`)));
  const isRequired = (it: PackItem) => requiredKeys.has(normalizeText(`${it.category}|${it.name}`));

  const capKg = input.capacityKg;
  const maxItems = budgetItemLimit(capKg, input.days);
  const weightBudget = capKg * 0.95; // headroom

  const requiredAdjusted = adjustRequiredToFitWeight(input.required, capKg);
  const requiredWeight = weightOf(requiredAdjusted);

  const score = (it: PackItem) => {
    const t = normalizeText(`${it.category} ${it.name} ${input.prompt}`);
    let s = 0;
    if (isRequired(it)) s += 1000;
    if (/documento|pasaporte|reserva|tarjeta|dinero|llaves/.test(t)) s += 60;
    if (/cargador|adaptador|medic|receta|lentes|anteojo/.test(t)) s += 40;
    if (/protector solar/.test(t)) s += 25;
    if (/traje de bano|traje de baño|malla|bikini/.test(t)) s += 25;
    if (/campera|abrigo|termic|guantes|gorro/.test(t)) s += 25;
    if (it.category === "Higiene") s += 20;
    if (it.category === "Zapatillas") s += 15;
    // penalize bulky optional items a bit
    s -= perUnitVolumeLiters(it) * 0.8;
    return s;
  };

  const sorted = [...input.items].sort((a, b) => score(b) - score(a));
  const picked: PackItem[] = [...requiredAdjusted];
  let currentWeight = requiredWeight;

  for (const it of sorted) {
    // required items already included/adjusted
    const alreadyIncluded = picked.some(
      (p) => p.category === it.category && normalizeText(p.name) === normalizeText(it.name),
    );
    if (alreadyIncluded) continue;
    if (picked.length >= maxItems) continue;
    const addWeight = it.weight * it.quantity;
    if (currentWeight + addWeight > weightBudget && !isRequired(it)) continue;
    picked.push(it);
    currentWeight += addWeight;
  }

  // If required items are already overweight, we still return them (can't satisfy capacity perfectly).
  return picked.slice(0, Math.max(maxItems, requiredAdjusted.length));
}

function normalizeSuggestion(
  raw: unknown,
  prompt: string,
  suitcaseCapacityKg?: number,
  trip?: TripInput,
): PackSuggestion {
  const context = extractTripContext(prompt, trip);
  const parsed = RawSuggestionSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : {};
  const destination = context.destination;
  const days = context.days;
  const occasion = context.occasion;
  const weather =
    data.weather?.trim() || inferWeather(prompt, destination, context.warm, context.cold, days);
  const aiItems = (data.items ?? [])
    .map(normalizeItem)
    .filter((item): item is PackItem => Boolean(item));
  const blockedSnow = !context.cold && !/nieve|ski|esqui|ushuaia|patagonia/i.test(prompt);
  const filteredItems = blockedSnow
    ? aiItems.filter((item) => !/nieve|ski|esqui|termic|guantes|gorro polar|botas de nieve/i.test(item.name))
    : aiItems;

  const required = requiredItems(context, destination);
  const merged = enforceClothingBudget([...filteredItems, ...required], context, destination);

  const capacity =
    clampCapacityKg(suitcaseCapacityKg) ??
    clampCapacityKg((data as { suitcaseCapacityKg?: unknown }).suitcaseCapacityKg);

  const items = capacity
    ? applyCapacityBudget({
        items: merged,
        required,
        capacityKg: capacity,
        days,
        prompt,
      })
    : merged.slice(0, 22);

  return {
    destination,
    days,
    weather,
    occasion,
    suitcaseCapacityKg: capacity,
    items,
    forecast: [],
  };
}

export async function generatePackSuggestion(input: {
  prompt: string;
  suitcaseCapacityKg?: number;
  trip?: TripInput;
}): Promise<{ suggestion: PackSuggestion; providerUsed: string }> {
  const context = extractTripContext(input.prompt, input.trip);
  const capacity = clampCapacityKg(input.suitcaseCapacityKg);
  const chain = await buildProviderChain();
  let lastError: unknown;

  let generateText: GenerateTextFn | undefined;
  if (chain.length > 0) {
    try {
      const ai = (await import("ai")) as unknown as { generateText: GenerateTextFn };
      generateText = ai.generateText;
    } catch (error) {
      console.warn("[pack] Falta el paquete de IA en esta instalación; usando fallback local", error);
      lastError = error;
    }
  }
  const runGenerateText = generateText;

  if (runGenerateText) {
    for (const attempt of chain) {
      try {
        const { text } = await runGenerateText({
          model: attempt.model,
          system: `Sos un asistente experto en equipaje. Respondé SOLO JSON válido, sin markdown.
Formato exacto: {"destination":"Ciudad o país","days":3,"weather":"resumen breve","occasion":"motivo","items":[{"category":"Remeras|Pantalones|Abrigos|Zapatillas|Accesorios|Higiene|Electrónica|Otros","name":"item","quantity":1,"weight":0.2}]}.
Reglas críticas:
- USÁ EXACTAMENTE los días, destino y ocasión que indica el usuario (no inventes ni cambies).
- Cantidades de ropa según días y destino (no fijas): viajes cortos ≈ ceil(N/2) remeras; largos (>21 días) asumí lavandería y menos prendas por día (ej. 60 días ≈ 11 remeras, 5 pantalones; 8 días ≈ 4 remeras, 2 pantalones). Ajustá por clima (playa/calor → más shorts; frío → más abrigos) y ocasión.
- Si el usuario puso notas (anteojos, mate, pijama, remera deportiva, etc.), incluí TODAS como ítems aparte con quantity 1.
- Si hay casamiento/boda incluí conjunto y zapatos formales; si es playa incluí traje de baño/protector; si no hay nieve no sugieras ropa de nieve.
- Si el usuario indicó capacidad de valija en kg, mantené la lista compacta y priorizá lo esencial.
- Para calcetines usá siempre "Medias" (nunca "Medios").`,
          prompt: `Solicitud del usuario: ${input.prompt}\nContexto detectado: destino=${context.destination}, días=${context.days}, ocasión=${context.occasion}${capacity ? `, capacidad=${capacity}kg` : ""}${context.notes ? `, notas="${context.notes}"` : ""}.`,
        });
        return {
          suggestion: await enrichWithForecast(
            normalizeSuggestion(
              JSON.parse(stripJson(text)),
              input.prompt,
              capacity,
              input.trip,
            ),
            context,
          ),
          providerUsed: attempt.provider,
        };
      } catch (error) {
        lastError = error;
        // En 429 (rate limit) o 402 (sin créditos) seguimos con el próximo
        // proveedor en lugar de fallar — esa es la razón de ser de la cadena.
        console.warn(`[pack] ${attempt.provider} falló, probando siguiente`, error);
      }
    }
  }

  console.warn("[pack] Sin proveedores IA disponibles, usando fallback determinista", lastError);
  return {
    suggestion: await enrichWithForecast(
      normalizeSuggestion({}, input.prompt, capacity, input.trip),
      context,
    ),
    providerUsed: "fallback-local",
  };
}
