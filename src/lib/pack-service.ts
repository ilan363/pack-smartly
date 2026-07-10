import { z } from "zod";

import type { ForecastDay } from "@/lib/chat-store";
import { estimateUnitWeightKg } from "@/lib/weight-explain";
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

function packItemWeight(name: string, category: Category): number {
  return Number(estimateUnitWeightKg(name, category).toFixed(2));
}

function packItem(name: string, category: Category, quantity: number): PackItem {
  return { name, category, quantity, weight: packItemWeight(name, category) };
}

function withPackWeight(item: Omit<PackItem, "weight">): PackItem {
  return { ...item, weight: packItemWeight(item.name, item.category) };
}

function applyConsistentWeights(items: PackItem[]): PackItem[] {
  return items.map((item) => withPackWeight(item));
}

export type CapacityMode = "fill" | "reserve";

export type PackingCapacity = {
  capacityKg: number;
  packingLimitKg: number;
  reserveKg: number;
  capacityMode: CapacityMode;
};

export type PackSuggestion = {
  destination: string;
  days: number;
  weather: string;
  occasion: string;
  suitcaseCapacityKg?: number;
  capacityMode?: CapacityMode;
  shoppingReserveKg?: number;
  packingLimitKg?: number;
  weightExcessKg?: number;
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

type ExtraSpec = { match: RegExp; item: Omit<PackItem, "weight"> };
const NOTE_EXTRAS: ExtraSpec[] = [
  { match: /anteojos?\s*de\s*sol|gafas\s*de\s*sol|lentes\s*de\s*sol/, item: { category: "Accesorios", name: "Anteojos de sol", quantity: 1 } },
  { match: /anteojos?\s*(?:de\s*lectura|recetados?|graduados?)|lentes\s*recetad/, item: { category: "Accesorios", name: "Anteojos recetados", quantity: 1 } },
  { match: /\bmate\b|bombilla|yerba/, item: { category: "Otros", name: "Mate y yerba", quantity: 1 } },
  { match: /libro|lectura/, item: { category: "Otros", name: "Libro", quantity: 1 } },
  { match: /laptop|notebook/, item: { category: "Electrónica", name: "Laptop", quantity: 1 } },
  { match: /auricular|headphone|airpods/, item: { category: "Electrónica", name: "Auriculares", quantity: 1 } },
  { match: /camara|cámara/, item: { category: "Electrónica", name: "Cámara", quantity: 1 } },
  { match: /paraguas/, item: { category: "Accesorios", name: "Paraguas plegable", quantity: 1 } },
  { match: /medicac|remedio|pastilla/, item: { category: "Higiene", name: "Medicación personal", quantity: 1 } },
  { match: /toalla/, item: { category: "Otros", name: "Toalla", quantity: 1 } },
  { match: /gorra|sombrero/, item: { category: "Accesorios", name: "Gorra o sombrero", quantity: 1 } },
  { match: /zapatill/, item: { category: "Zapatillas", name: "Zapatillas extra", quantity: 1 } },
  { match: /vestido|falda\s+larga/, item: { category: "Otros", name: "Vestido o falda", quantity: 1 } },
  { match: /remera\s+deportiva|musculosa|remera\s+running/, item: { category: "Remeras", name: "Remera deportiva", quantity: 1 } },
  { match: /pijama/, item: { category: "Otros", name: "Pijama", quantity: 1 } },
  { match: /buzo|hoodie|sweater|sueter/, item: { category: "Abrigos", name: "Buzo o sweater", quantity: 1 } },
];

function extractExtras(text: string): PackItem[] {
  if (!text) return [];
  const n = normalizeText(text);
  const out: PackItem[] = [];
  for (const e of NOTE_EXTRAS) {
    if (e.match.test(n) && !out.some((o) => o.name === e.item.name)) out.push(withPackWeight(e.item));
  }
  return out;
}

function parseNoteLines(prompt: string, tripNotes?: string[]): string[] {
  if (tripNotes?.length) {
    return tripNotes.map((n) => n.trim()).filter(Boolean);
  }
  const block = prompt.match(/notas?\s*:\s*([\s\S]+)$/i)?.[1]?.trim() ?? "";
  if (!block) return [];
  return block
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function itemFromUserNote(note: string): PackItem {
  const trimmed = note.trim();
  const n = normalizeText(trimmed);

  for (const e of NOTE_EXTRAS) {
    if (e.match.test(n)) {
      return withPackWeight(e.item);
    }
  }

  const category = normalizeCategory(undefined, trimmed);
  const name = titleCase(trimmed);
  return withPackWeight({ category, name, quantity: 1 });
}

function buildNoteItems(noteLines: string[]): PackItem[] {
  const out: PackItem[] = [];
  for (const line of noteLines) {
    const item = itemFromUserNote(line);
    const key = normalizeText(item.name);
    if (!out.some((o) => normalizeText(o.name) === key)) {
      out.push(item);
    }
  }
  return out;
}

function noteItemMatchesExisting(item: PackItem, existing: PackItem): boolean {
  const key = normalizeText(item.name);
  const other = normalizeText(existing.name);
  return key === other || other.includes(key) || key.includes(other);
}

function ensureUserNotesInItems(items: PackItem[], noteLines: string[]): PackItem[] {
  if (noteLines.length === 0) return items;
  const result = [...items];
  for (const line of noteLines) {
    const noteItem = itemFromUserNote(line);
    const exists = result.some((it) => noteItemMatchesExisting(noteItem, it));
    if (!exists) result.push(noteItem);
  }
  return result;
}

export type TripInput = {
  destination: string;
  days: number;
  dateFrom?: string;
  dateTo?: string;
  occasion?: string;
  /** Notas individuales del formulario del asistente */
  notes?: string[];
  /** Valija compartida entre varias personas */
  sharedSuitcase?: boolean;
  /** Cantidad de personas que comparten la valija (mín. 2 si sharedSuitcase) */
  sharedPeople?: number;
  /** Llenar toda la valija o dejar espacio para compras en destino */
  capacityMode?: CapacityMode;
  /** Kg reservados para compras (solo si capacityMode === "reserve") */
  shoppingReserveKg?: number;
};

export function defaultShoppingReserveKg(capacityKg: number): number {
  const cap = clampCapacityKg(capacityKg) ?? 23;
  const raw = cap * 0.2;
  const rounded = Math.round(raw * 2) / 2;
  return Math.min(cap - 3, Math.max(2, rounded));
}

export function resolvePackingCapacity(input: {
  suitcaseCapacityKg: number;
  capacityMode?: CapacityMode;
  shoppingReserveKg?: number;
}): PackingCapacity | undefined {
  const cap = clampCapacityKg(input.suitcaseCapacityKg);
  if (!cap) return undefined;

  const mode = input.capacityMode ?? "fill";
  if (mode === "fill") {
    return {
      capacityKg: cap,
      packingLimitKg: Number((cap * 0.98).toFixed(2)),
      reserveKg: 0,
      capacityMode: "fill",
    };
  }

  const reserve = Math.min(
    cap - 3,
    Math.max(2, input.shoppingReserveKg ?? defaultShoppingReserveKg(cap)),
  );
  const available = cap - reserve;
  return {
    capacityKg: cap,
    packingLimitKg: Number((available * 0.92).toFixed(2)),
    reserveKg: reserve,
    capacityMode: "reserve",
  };
}

function computeDaysFromDates(dateFrom?: string, dateTo?: string): number | null {
  if (!dateFrom || !dateTo) return null;
  const start = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
}

/** Normaliza notas en lista (viñetas o líneas) a un bloque de texto continuo. */
function parseStructuredNotes(prompt: string, tripNotes?: string[]): string {
  return parseNoteLines(prompt, tripNotes).join(". ");
}

function extractTripContext(prompt: string, trip?: TripInput) {
  const normalized = normalizeText(prompt);

  // Datos estructurados que envía la UI: "Destino: X", "Días: 8", "Notas: ..."
  const structDestination = prompt.match(/destino\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const structDaysRaw = prompt.match(/d[ií]as?\s*:\s*(\d+)/i)?.[1];
  const structDateFrom = prompt.match(/desde\s*:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const structDateTo = prompt.match(/hasta\s*:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const structOccasion = prompt.match(/ocasi[oó]n\s*:\s*([^\n]+)/i)?.[1]?.trim();
  const noteLines = parseNoteLines(prompt, trip?.notes);
  const structNotes = parseStructuredNotes(prompt, trip?.notes);
  const noteItems = buildNoteItems(noteLines);

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

  const extras = [...noteItems, ...extractExtras(structNotes)].filter(
    (item, index, list) =>
      list.findIndex((other) => normalizeText(other.name) === normalizeText(item.name)) === index,
  );

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

  const structShared = prompt.match(/valija compartida\s*:\s*(si|s[ií]|no)/i)?.[1];
  const structPeople = prompt.match(/personas en la valija\s*:\s*(\d+)/i)?.[1];
  const structFill = prompt.match(/llenar valija\s*:\s*(si|s[ií]|no)/i)?.[1];
  const structReserveKg = prompt.match(/dejar\s+([\d.]+)\s*kg\s+libres/i)?.[1];

  const sharedSuitcase =
    trip?.sharedSuitcase ??
    (structShared ? /^(si|s[ií])$/i.test(structShared) : false);

  const sharedPeople = sharedSuitcase
    ? clampInt(
        trip?.sharedPeople ?? (structPeople ? Number(structPeople) : 2),
        2,
        8,
      )
    : 1;

  let capacityMode: CapacityMode = trip?.capacityMode ?? "fill";
  if (!trip?.capacityMode) {
    if (/dejar\s+[\d.]+\s*kg\s+libres|dejar espacio|remanente|compras/i.test(prompt)) {
      capacityMode = "reserve";
    } else if (structFill && /^no$/i.test(structFill)) {
      capacityMode = "reserve";
    }
  }

  const shoppingReserveKg =
    trip?.shoppingReserveKg ??
    (structReserveKg && Number.isFinite(Number(structReserveKg))
      ? Number(structReserveKg)
      : undefined);

  return {
    destination,
    days,
    dateFrom: trip?.dateFrom ?? structDateFrom,
    dateTo: trip?.dateTo ?? structDateTo,
    occasion,
    sharedSuitcase,
    sharedPeople,
    capacityMode,
    shoppingReserveKg,
    warm:
      /brasil|rio|salvador|playa|caribe|cancun|punta cana|cartagena|costa|miami|hawaii|florida|tailandia|bali/.test(
        destBlob,
      ) || usaWarm,
    cold:
      /ushuaia|nieve|ski|esqui|patagonia|bariloche|calafate|islandia|alaska|montana|colorado ski/.test(destBlob) ||
      usaCold ||
      usaSeasonCold,
    formal: /casamiento|boda|matrimonio|gala|evento formal/.test(normalized),
    noteLines,
    notes: structNotes,
    noteItems,
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

function normalizeItem(item: RawPackItem): PackItem | null {
  const rawName = item.name?.trim();
  if (!rawName) return null;
  const name = fixSpanishClothingName(rawName);
  const quantity = Math.max(1, Math.min(Number(item.quantity ?? 1), 10));
  const category = normalizeCategory(item.category, name);
  return withPackWeight({
    name: normalizeText(name) === "medias" ? "Medias" : name,
    category,
    quantity,
  });
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
  | "towels"
  | "other_clothing";

/** Prendas de rotación (remeras, pantalones): se reusan entre lavados. */
function topsForDays(days: number, warm: boolean): number {
  if (days <= 2) return days + 1;
  if (days <= 4) return warm ? days : days + 1;
  if (days <= 7) return warm ? 4 : 5;
  if (days <= 10) return warm ? 5 : 6;
  if (days <= 14) return warm ? 5 : 6;
  if (days <= 21) return warm ? 6 : 7;
  if (days <= 45) return warm ? 7 : 8;
  return warm ? 9 : 10;
}

/** Ropa interior: asumimos lavado a mitad de viaje si supera 6 días. */
function underwearForDays(days: number, laundry: boolean): number {
  if (days <= 3) return days + 1;
  if (laundry) return clampInt(4 + Math.ceil(days / 12), 5, 8);
  if (days <= 6) return days + 1;
  // Mitad del viaje + 1 de repuesto (lavado intermedio implícito)
  return clampInt(Math.ceil(days / 2) + 1, 5, 8);
}

/** Medias: un poco menos que ropa interior (se pueden reutilizar más). */
function socksForDays(days: number, laundry: boolean): number {
  if (days <= 3) return days;
  if (laundry) return clampInt(3 + Math.ceil(days / 10), 4, 7);
  if (days <= 6) return days;
  return clampInt(Math.ceil(days / 2), 4, 7);
}

/** Pantalones: versátiles, se rotan con poca frecuencia. */
function pantsForDays(days: number, laundry: boolean): number {
  if (days <= 4) return 1;
  if (days <= 10) return 2;
  if (days <= 21) return laundry ? 2 : 3;
  return laundry ? 3 : clampInt(2 + Math.floor(days / 14), 3, 5);
}

/** Shorts en destinos cálidos: techo bajo, no escalan linealmente. */
function shortsForBeach(days: number): number {
  if (days <= 4) return 1;
  if (days <= 10) return 2;
  if (days <= 21) return 3;
  return 4;
}

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
  const explicitLaundry = /lavander|lavarrop|laundry|wash and wear/.test(notesNorm);
  const noLaundry = /sin lavander|no lavar|no laundry|sin lavarrop/.test(notesNorm);
  const assumesLaundry =
    !noLaundry && (explicitLaundry || longStay);

  const beach =
    context.warm ||
    /playa|mar|costa|caribe|cancun|punta cana|miami|hawaii|florida|bali|phuket/.test(destNorm) ||
    occasionNorm.includes("playa");

  let shirts = topsForDays(days, context.warm || beach);
  let pants = pantsForDays(days, assumesLaundry);
  let underwear = underwearForDays(days, assumesLaundry);
  let socks = socksForDays(days, assumesLaundry);
  let shorts = beach ? shortsForBeach(days) : 0;
  let outerwear = context.cold ? (longStay ? 3 : 2) : 1;

  const shirtCap = extendedStay ? 12 : longStay ? 10 : days <= 7 ? 6 : 8;
  const pantsCap = extendedStay ? 6 : longStay ? 4 : 3;
  const shortsCap = extendedStay ? 4 : 3;

  shirts = clampInt(shirts, 2, shirtCap);
  pants = clampInt(pants, 1, pantsCap);
  underwear = clampInt(underwear, 3, extendedStay ? 10 : 8);
  socks = clampInt(socks, 3, extendedStay ? 9 : 7);
  shorts = clampInt(shorts, 0, shortsCap);

  // Destino playa/calor: más shorts; en viajes cortos se puede bajar un poco tops
  if (beach) {
    if (pants > 1) pants = clampInt(pants - 1, 1, pantsCap);
    if (days <= 5 && shirts > 3) shirts = clampInt(shirts - 1, 3, shirtCap);
  }

  if (context.cold) {
    outerwear = longStay ? 3 : 2;
    shirts = clampInt(shirts + 1, 2, shirtCap + 1);
    socks = clampInt(socks + 1, 3, extendedStay ? 10 : 8);
    pants = clampInt(pants + 1, 1, pantsCap + 1);
  }

  if (/estados unidos|usa\b|united states|eeuu|ee uu|new york|los angeles|miami|chicago|boston/.test(destNorm)) {
    if (beach && !context.cold && shorts < shortsCap) {
      shorts = clampInt(shorts + 1, 1, shortsCap);
    }
  }

  if (context.formal || /casamiento|boda|matrimonio|gala|formal/.test(occasionNorm)) {
    shirts = clampInt(shirts + (longStay ? 2 : 1), 2, shirtCap + 2);
    pants = clampInt(pants + 1, 1, pantsCap + 1);
  }

  if (/trabajo|negocio|conferencia|reunion|oficina|work|business/.test(occasionNorm)) {
    shirts = clampInt(shirts + 1, 2, shirtCap + 1);
    pants = clampInt(pants + (longStay ? 1 : 0), 1, pantsCap + 1);
  }

  if (/trekking|senderismo|montana|acampar|campamento|hiking/.test(occasionNorm)) {
    socks = clampInt(socks + 2, 3, extendedStay ? 10 : 8);
    shirts = clampInt(shirts + 1, 2, shirtCap + 1);
  }

  if (explicitLaundry) {
    shirts = clampInt(3 + Math.ceil(days / 12), 3, shirtCap);
    pants = clampInt(1 + Math.ceil(days / 16), 1, pantsCap);
    underwear = clampInt(4 + Math.ceil(days / 10), 4, 8);
    socks = clampInt(3 + Math.ceil(days / 9), 3, 7);
  }

  if (/equipaje de mano|carry on|carry-on|valija chica|valija peque|poco espacio|minimal|liviano|solo mochila/.test(notesNorm)) {
    shirts = clampInt(shirts - 2, 2, shirtCap);
    pants = clampInt(pants - 1, 1, pantsCap);
    underwear = clampInt(underwear - 2, 3, extendedStay ? 8 : 6);
    socks = clampInt(socks - 1, 3, extendedStay ? 7 : 5);
    shorts = Math.max(0, shorts - 1);
  }

  const people = context.sharedSuitcase ? context.sharedPeople : 1;
  if (people > 1) {
    shirts = clampInt(shirts * people, shirts, shirtCap * people);
    pants = clampInt(pants * people, pants, pantsCap * people);
    underwear = clampInt(underwear * people, underwear, (extendedStay ? 10 : 8) * people);
    socks = clampInt(socks * people, socks, (extendedStay ? 9 : 7) * people);
    shorts = clampInt(shorts * people, shorts, shortsCap * people);
    outerwear = clampInt(outerwear * people, outerwear, 3 * people);
  }

  return { shirts, pants, shorts, underwear, socks, outerwear };
}

function isSocksItem(item: Pick<PackItem, "category" | "name">): boolean {
  const t = normalizeText(`${item.category} ${item.name}`);
  return /\bmedias\b|\bmedios\b|\bmedia\b|\bcalcetines?\b/.test(t);
}

function isUnderwearItem(item: Pick<PackItem, "category" | "name">): boolean {
  const t = normalizeText(`${item.category} ${item.name}`);
  return /ropa interior|\bcalzon|\bbombacha|\bboxer|\bbraga/.test(t);
}

function dedupeIdenticalItems(items: PackItem[]): PackItem[] {
  const map = new Map<string, PackItem>();
  for (const item of items) {
    const key = normalizeText(`${item.category}|${item.name}`);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item });
      continue;
    }
    existing.quantity = Math.max(existing.quantity, item.quantity);
  }
  return [...map.values()];
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
  if (/toalla/.test(t)) return "towels";
  if (/conjunto formal|smoking|corbata|moño|traje sastre/.test(t)) return "formal";
  if (/vestido|falda larga/.test(t)) return "formal";
  if (item.category === "Zapatillas" || /zapat|sandalia|ojota|bota|calzado|sneaker/.test(t)) return "footwear";
  if (/short|bermuda/.test(t)) return "shorts";
  if (isUnderwearItem(item)) return "underwear";
  if (isSocksItem(item)) return "socks";
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
  Pick<PackItem, "category" | "name">
> = {
  shirts: { category: "Remeras", name: "Remeras o tops cómodos" },
  pants: { category: "Pantalones", name: "Pantalón o jean versátil" },
  shorts: { category: "Pantalones", name: "Short o bermuda" },
  underwear: { category: "Otros", name: "Ropa interior" },
  socks: { category: "Otros", name: "Medias" },
};

function mergeClothingGroup(
  group: PackItem[],
  slot: keyof typeof CANONICAL_CLOTHING,
  recommended: number,
): PackItem | null {
  if (recommended <= 0) return null;

  const totalQty = group.reduce((sum, it) => sum + it.quantity, 0);
  const finalQty = Math.max(recommended, totalQty);

  const canonical = CANONICAL_CLOTHING[slot];

  return withPackWeight({
    category: canonical.category,
    name: canonical.name,
    quantity: finalQty,
  });
}

type FootwearKind = "everyday" | "formal" | "sandals" | "trekking";

function footwearKey(name: string): FootwearKind {
  const t = normalizeText(name);
  if (/formal|vestir|casamiento|boda|salon|salón/.test(t)) return "formal";
  if (/sandalia|ojota|flip|chinel/.test(t)) return "sandals";
  if (/trekking|trail|senderismo|bota/.test(t)) return "trekking";
  return "everyday";
}

function footwearCanonicalName(kind: FootwearKind): string {
  switch (kind) {
    case "formal":
      return "Zapatos formales";
    case "sandals":
      return "Sandalias u ojotas";
    case "trekking":
      return "Botas o zapatillas de trekking";
    default:
      return "Zapatillas cómodas";
  }
}

function footwearNeeds(
  context: ReturnType<typeof extractTripContext>,
  destination: string,
): PackItem[] {
  const people = context.sharedSuitcase ? context.sharedPeople : 1;
  const occasionNorm = normalizeText(context.occasion);
  const destNorm = normalizeText(destination);
  const beach =
    context.warm || /playa|brasil|caribe|costa|mar|punta cana|miami|hawaii/.test(destNorm);
  const trekking = /trekking|senderismo|montana|montaña|hiking|acampar/.test(occasionNorm);

  const needs: Omit<PackItem, "weight">[] = [];

  const everydayPairs = context.days > 14 || trekking ? 2 : 1;
  needs.push({
    category: "Zapatillas",
    name: footwearCanonicalName("everyday"),
    quantity: everydayPairs * people,
  });

  if (context.formal) {
    needs.push({
      category: "Zapatillas",
      name: footwearCanonicalName("formal"),
      quantity: people,
    });
  }
  if (beach) {
    needs.push({
      category: "Zapatillas",
      name: footwearCanonicalName("sandals"),
      quantity: people,
    });
  }
  if (trekking) {
    needs.push({
      category: "Zapatillas",
      name: footwearCanonicalName("trekking"),
      quantity: people,
    });
  }

  return needs.map(withPackWeight);
}

function processFootwearGroup(
  group: PackItem[],
  context: ReturnType<typeof extractTripContext>,
  destination: string,
  limit: number,
): PackItem[] {
  const merged = new Map<FootwearKind, PackItem>();

  const add = (item: PackItem) => {
    const kind = footwearKey(item.name);
    const prev = merged.get(kind);
    if (!prev) {
      merged.set(kind, {
        category: "Zapatillas",
        name: footwearCanonicalName(kind),
        quantity: item.quantity,
        weight: item.weight,
      });
    } else {
      prev.quantity = Math.max(prev.quantity, item.quantity);
    }
  };

  for (const item of footwearNeeds(context, destination)) add(item);
  for (const item of group) add(item);

  let result = [...merged.values()];
  let totalPairs = result.reduce((sum, it) => sum + it.quantity, 0);

  if (totalPairs > limit) {
    const minimums = new Map(
      footwearNeeds(context, destination).map((item) => [footwearKey(item.name), item.quantity]),
    );
    const trimOrder: FootwearKind[] = ["trekking", "sandals", "everyday", "formal"];

    while (totalPairs > limit) {
      let reduced = false;
      for (const kind of trimOrder) {
        const item = result.find((it) => footwearKey(it.name) === kind);
        const floor = minimums.get(kind) ?? 0;
        if (item && item.quantity > floor) {
          item.quantity -= 1;
          totalPairs -= 1;
          reduced = true;
          break;
        }
      }
      if (!reduced) break;
    }
  }

  return result.map((item) => withPackWeight(item));
}

function enforceClothingBudget(
  items: PackItem[],
  context: ReturnType<typeof extractTripContext>,
  destination: string,
): PackItem[] {
  const budget = computeClothingBudget(context, destination);
  const people = context.sharedSuitcase ? context.sharedPeople : 1;
  const slotRecommended: Record<ClothingSlot, number> = {
    shirts: budget.shirts,
    pants: budget.pants,
    shorts: budget.shorts,
    underwear: budget.underwear,
    socks: budget.socks,
    outerwear: Math.min(budget.outerwear, 2 * people),
    swimwear: 2 * people,
    formal: (context.formal ? 3 : 2) * people,
    footwear: 3 * people,
    other_clothing: 4 * people,
    towels: 2 * people,
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
    const merged = mergeClothingGroup(bySlot.get(slot) ?? [], slot, slotRecommended[slot]);
    if (merged) result.push(merged);
    bySlot.delete(slot);
  }

  for (const [slot, group] of bySlot) {
    const limit = slotRecommended[slot];
    if (slot === "footwear") {
      result.push(...processFootwearGroup(group, context, destination, limit));
      continue;
    }
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
  const people = context.sharedSuitcase ? context.sharedPeople : 1;

  const items: PackItem[] = [
    withPackWeight({ category: "Remeras", name: "Remeras o tops cómodos", quantity: budget.shirts }),
    withPackWeight({ category: "Pantalones", name: "Pantalón o jean versátil", quantity: budget.pants }),
    withPackWeight({ category: "Otros", name: "Ropa interior", quantity: budget.underwear }),
    withPackWeight({ category: "Otros", name: "Medias", quantity: budget.socks }),
    withPackWeight({ category: "Higiene", name: "Neceser de higiene personal", quantity: people }),
    withPackWeight({ category: "Electrónica", name: "Cargador de celular", quantity: people }),
    withPackWeight({ category: "Accesorios", name: "Documento, pasaporte y reservas", quantity: people }),
  ];

  if (budget.shorts > 0) {
    items.push(
      withPackWeight({
        category: "Pantalones",
        name: "Short o bermuda",
        quantity: budget.shorts,
      }),
    );
  }

  if (context.formal) {
    items.push(
      withPackWeight({ category: "Otros", name: "Conjunto formal para el casamiento", quantity: people }),
      withPackWeight({ category: "Accesorios", name: "Accesorios formales", quantity: people }),
    );
  }
  if (context.warm || /playa|brasil|caribe|costa/i.test(destination)) {
    items.push(
      withPackWeight({ category: "Otros", name: "Traje de baño", quantity: people }),
      withPackWeight({ category: "Higiene", name: "Protector solar", quantity: 1 }),
    );
  }
  if (context.cold) {
    items.push(
      withPackWeight({ category: "Abrigos", name: "Campera de abrigo", quantity: people }),
      withPackWeight({ category: "Abrigos", name: "Buzo o sweater térmico", quantity: people }),
      withPackWeight({ category: "Accesorios", name: "Gorro y guantes", quantity: people }),
    );
  } else {
    items.push(withPackWeight({ category: "Abrigos", name: "Campera liviana", quantity: people }));
  }

  for (const shoe of footwearNeeds(context, destination)) {
    const idx = items.findIndex((i) => footwearKey(i.name) === footwearKey(shoe.name));
    if (idx >= 0) {
      items[idx] = withPackWeight({
        ...items[idx],
        name: shoe.name,
        quantity: Math.max(items[idx].quantity, shoe.quantity),
      });
    } else {
      items.push(shoe);
    }
  }

  // Ítems pedidos explícitamente en las notas del usuario (siempre obligatorios)
  for (const extra of [...context.noteItems, ...context.extras]) {
    const exists = items.some((i) => noteItemMatchesExisting(extra, i));
    if (!exists) items.push(extra);
  }

  return applyConsistentWeights(items);
}

function clampCapacityKg(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  if (rounded < 5 || rounded > 60) return undefined;
  return rounded;
}

function weightOf(items: PackItem[]) {
  return items.reduce((acc, it) => acc + it.weight * it.quantity, 0);
}

export function computeWeightExcessKg(
  totalWeightKg: number,
  capacityKg?: number,
): number | undefined {
  if (!capacityKg || totalWeightKg <= capacityKg) return undefined;
  return Number((totalWeightKg - capacityKg).toFixed(2));
}

type ItemCapKind = "shirts" | "pants" | "jackets" | "sweatshirts" | "shoes" | "towels" | "underwear";

function computeAbsoluteCaps(days: number, people = 1) {
  const p = Math.max(1, people);
  return {
    shirts: Math.min(14 * p, Math.max(4 * p, Math.ceil(days * 0.8) * p)),
    pants: 4 * p,
    jackets: 2 * p,
    sweatshirts: 2 * p,
    shoes: 3 * p,
    towels: 2 * p,
    underwear: Math.min(12 * p, Math.max(4 * p, Math.ceil(days * 0.85) * p)),
  };
}

function itemCapKind(item: PackItem): ItemCapKind | null {
  const t = normalizeText(`${item.category} ${item.name}`);
  if (/toalla/.test(t)) return "towels";
  if (item.category === "Zapatillas" || /zapat|sandalia|ojota|bota|calzado|sneaker/.test(t)) return "shoes";
  if (/campera|abrigo|tapado|piloto|impermeable/.test(t)) return "jackets";
  if (/buzo|sweater|sueter|hoodie/.test(t)) return "sweatshirts";
  if (isUnderwearItem(item)) return "underwear";
  if (item.category === "Remeras" || /remera|camisa|blusa|top|chomba|polo/.test(t)) return "shirts";
  if (/short|bermuda/.test(t)) return null;
  if (item.category === "Pantalones" || /pantalon|jean|jogger|legging|falda|pollera/.test(t)) {
    return "pants";
  }
  return null;
}

function countItemsByCapKind(items: PackItem[], kind: ItemCapKind): number {
  return items.reduce((sum, it) => sum + (itemCapKind(it) === kind ? it.quantity : 0), 0);
}

function shouldAddSweatshirtForFill(
  context: ReturnType<typeof extractTripContext>,
  destination: string,
): boolean {
  if (context.cold) return false;
  const { zone } = detectClimate(destination);
  if (zone === "temperate" || zone === "mediterranean" || zone === "unknown") return true;
  if (context.warm && context.days > 7) return true;
  return false;
}

function shouldAddExtraShoes(
  context: ReturnType<typeof extractTripContext>,
  items: PackItem[],
): boolean {
  const shoeCount = countItemsByCapKind(items, "shoes");
  if (shoeCount >= 2) return false;
  const occasion = normalizeText(context.occasion);
  if (/trekking|senderismo|montana|montaña|hiking|acampar/.test(occasion)) return true;
  if (context.formal && shoeCount === 1) return true;
  if (context.days > 10 && shoeCount <= 1) return true;
  return false;
}

function addOrMergeItem(items: PackItem[], toAdd: PackItem): PackItem[] {
  const kind = itemCapKind(toAdd);
  if (kind) {
    const idx = items.findIndex((it) => itemCapKind(it) === kind);
    if (idx >= 0) {
      const copy = [...items];
      copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + toAdd.quantity };
      return copy;
    }
  }
  return [...items, toAdd];
}

function enforceAbsoluteCaps(items: PackItem[], days: number, people = 1): PackItem[] {
  const caps = computeAbsoluteCaps(days, people);
  const used: Record<ItemCapKind, number> = {
    shirts: 0,
    pants: 0,
    jackets: 0,
    sweatshirts: 0,
    shoes: 0,
    towels: 0,
    underwear: 0,
  };
  const result: PackItem[] = [];

  for (const item of items) {
    const kind = itemCapKind(item);
    if (!kind) {
      result.push(item);
      continue;
    }
    const max = caps[kind];
    const remaining = Math.max(0, max - used[kind]);
    if (remaining <= 0) continue;
    const qty = Math.min(item.quantity, remaining);
    if (qty <= 0) continue;
    result.push({ ...item, quantity: qty });
    used[kind] += qty;
  }

  return result;
}

function fillLeftoverSpace(
  items: PackItem[],
  opts: {
    packingLimitKg: number;
    capacityMode?: CapacityMode;
    days: number;
    people?: number;
    context: ReturnType<typeof extractTripContext>;
    destination: string;
  },
): PackItem[] {
  if (opts.capacityMode !== "fill") return items;

  const leftoverMinKg = 0.25;
  let result = [...items];
  let currentWeight = weightOf(result);
  if (currentWeight >= opts.packingLimitKg - leftoverMinKg) return result;

  const caps = computeAbsoluteCaps(opts.days, opts.people ?? 1);
  const fillSteps: Array<{
    kind: ItemCapKind;
    item: PackItem;
    allowed: () => boolean;
  }> = [
    {
      kind: "shirts",
      item: packItem("Remeras o tops cómodos", "Remeras", 1),
      allowed: () => countItemsByCapKind(result, "shirts") < caps.shirts,
    },
    {
      kind: "underwear",
      item: packItem("Ropa interior", "Otros", 1),
      allowed: () => countItemsByCapKind(result, "underwear") < caps.underwear,
    },
    {
      kind: "pants",
      item: packItem("Pantalón o jean versátil", "Pantalones", 1),
      allowed: () => countItemsByCapKind(result, "pants") < caps.pants,
    },
    {
      kind: "sweatshirts",
      item: packItem("Buzo o sweater térmico", "Abrigos", 1),
      allowed: () =>
        shouldAddSweatshirtForFill(opts.context, opts.destination) &&
        countItemsByCapKind(result, "sweatshirts") < caps.sweatshirts,
    },
    {
      kind: "shoes",
      item: packItem("Zapatillas extra", "Zapatillas", 1),
      allowed: () =>
        shouldAddExtraShoes(opts.context, result) && countItemsByCapKind(result, "shoes") < caps.shoes,
    },
  ];

  for (const step of fillSteps) {
    if (currentWeight >= opts.packingLimitKg - leftoverMinKg) break;
    if (!step.allowed()) continue;
    const addWeight = step.item.weight * step.item.quantity;
    if (currentWeight + addWeight > opts.packingLimitKg) continue;
    result = addOrMergeItem(result, step.item);
    currentWeight += addWeight;
  }

  return result;
}

function assemblePackList(input: {
  items: PackItem[];
  packingLimitKg: number;
  capacityMode?: CapacityMode;
  days: number;
  context: ReturnType<typeof extractTripContext>;
  destination: string;
}): PackItem[] {
  const people = input.context.sharedSuitcase ? input.context.sharedPeople : 1;

  return enforceAbsoluteCaps(
    fillLeftoverSpace([...input.items], {
      packingLimitKg: input.packingLimitKg,
      capacityMode: input.capacityMode,
      days: input.days,
      people,
      context: input.context,
      destination: input.destination,
    }),
    input.days,
    people,
  );
}

function normalizeSuggestion(
  raw: unknown,
  prompt: string,
  suitcaseCapacityKg?: number,
  trip?: TripInput,
  packing?: PackingCapacity,
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

  const resolvedPacking =
    packing ??
    (capacity
      ? resolvePackingCapacity({
          suitcaseCapacityKg: capacity,
          capacityMode: trip?.capacityMode ?? context.capacityMode,
          shoppingReserveKg: trip?.shoppingReserveKg ?? context.shoppingReserveKg,
        })
      : undefined);

  const people = context.sharedSuitcase ? context.sharedPeople : 1;
  const itemsWithNotes = ensureUserNotesInItems(
    resolvedPacking
      ? assemblePackList({
          items: merged,
          packingLimitKg: resolvedPacking.packingLimitKg,
          capacityMode: resolvedPacking.capacityMode,
          days,
          context,
          destination,
        })
      : enforceAbsoluteCaps(merged, days, people),
    context.noteLines,
  );

  const items = applyConsistentWeights(dedupeIdenticalItems(itemsWithNotes));
  const totalWeight = weightOf(items);
  const weightExcessKg = computeWeightExcessKg(totalWeight, capacity);

  return {
    destination,
    days,
    weather,
    occasion,
    suitcaseCapacityKg: capacity,
    capacityMode: resolvedPacking?.capacityMode,
    shoppingReserveKg: resolvedPacking?.reserveKg,
    packingLimitKg: resolvedPacking?.packingLimitKg,
    weightExcessKg,
    items,
    forecast: [],
  };
}

function buildCapacityPromptContext(packing?: PackingCapacity): string {
  if (!packing) return "";
  if (packing.capacityMode === "fill") {
    return `, modo=llenar valija (usá hasta ~${packing.packingLimitKg} kg de ${packing.capacityKg} kg, priorizá aprovechar el espacio)`;
  }
  return `, modo=dejar espacio para compras (reservá ${packing.reserveKg} kg libres; armá la lista hasta ~${packing.packingLimitKg} kg, no llenes toda la valija)`;
}

export async function generatePackSuggestion(input: {
  prompt: string;
  suitcaseCapacityKg?: number;
  trip?: TripInput;
}): Promise<{ suggestion: PackSuggestion; providerUsed: string }> {
  const context = extractTripContext(input.prompt, input.trip);
  const capacity = clampCapacityKg(input.suitcaseCapacityKg);
  const packing = capacity
    ? resolvePackingCapacity({
        suitcaseCapacityKg: capacity,
        capacityMode: input.trip?.capacityMode ?? context.capacityMode,
        shoppingReserveKg: input.trip?.shoppingReserveKg ?? context.shoppingReserveKg,
      })
    : undefined;
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
- Cantidades realistas con rotación de prendas (no 1 por día salvo viajes muy cortos):
  · Remeras/tops: 3–4 (≤7 días), 5–6 (8–14 días), 6–8 (15–21 días). En playa/calor podés variar con más shorts, pero no bajes remeras por debajo de lo indicado.
  · Pantalones: 1 (≤4 días), 2 (5–14 días), 3 (15–21 días). Se reusan entre lavados.
  · Ropa interior: mitad del viaje + 1 repuesto si >6 días (ej. 11 días → 7, no 10). Con lavandería explícita, menos.
  · Medias: un poco menos que ropa interior (ej. 11 días → 5–6).
  · Shorts en playa: 2–3 máximo para viajes de 2 semanas.
  · Calzado (quantity = pares): zapatillas de uso diario 1 par/persona (2 si viaje >14 días o trekking); sandalias en playa/calor; zapatos formales en eventos formales; botas en trekking. Valija compartida → multiplicá por cantidad de personas.
  · Viajes largos (>21 días) o con lavandería: escalar lento (60 días ≈ 9 remeras, 4 pantalones, 7–8 ropa interior).
- Si el usuario puso notas, incluí TODAS como ítems aparte (quantity 1). No omitas ninguna nota de la lista.
- Si hay casamiento/boda incluí conjunto y zapatos formales; si es playa incluí traje de baño/protector; si no hay nieve no sugieras ropa de nieve.
- Si el usuario indicó capacidad de valija en kg, armá la lista completa según días y destino; no recortes cantidades solo por peso (la app avisará si se excede). Modo "llenar" = aprovechar espacio; "remanente/compras" = dejar margen para compras.
- Si la valija es compartida, multiplicá las prendas personales por la cantidad de personas indicada.
- Límites máximos de cantidad (nunca superar): remeras ≈ ceil(días×0.8) (ej. 8 en 10 días), pantalones 4, camperas 2, zapatos 3 pares, toallas 2. No repitas la misma prenda en exceso.
- Para calcetines usá siempre "Medias" (nunca "Medios").`,
          prompt: `Solicitud del usuario: ${input.prompt}\nContexto detectado: destino=${context.destination}, días=${context.days}, ocasión=${context.occasion}${capacity ? `, capacidad=${capacity}kg${buildCapacityPromptContext(packing)}` : ""}, valija compartida=${context.sharedSuitcase ? `sí (${context.sharedPeople} personas)` : "no"}${
            context.noteLines.length
              ? `\nNotas del usuario (incluir TODAS en items, una por nota):\n${context.noteLines.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
              : ""
          }`,
        });
        return {
          suggestion: await enrichWithForecast(
            normalizeSuggestion(
              JSON.parse(stripJson(text)),
              input.prompt,
              capacity,
              input.trip,
              packing,
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
      normalizeSuggestion({}, input.prompt, capacity, input.trip, packing),
      context,
    ),
    providerUsed: "fallback-local",
  };
}
