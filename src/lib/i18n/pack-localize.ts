import type { ForecastDay } from "@/lib/chat-store";
import type { PackSuggestion } from "@/lib/pack-service";
import type { Locale } from "./locale-store";
import {
  localizePackItems,
  translateForecastCondition,
  translateItemName,
  translateOccasion,
} from "./pack-items";
import { formatWeatherDate } from "@/lib/weather/codes";
import { translate } from "./translations";

const CLIMATE_RANGE: Record<string, { es: string; en: string; pt: string }> = {
  "caluroso y humedo (28–34°c), lluvias breves posibles": {
    es: "Caluroso y húmedo (28–34°C), lluvias breves posibles",
    en: "Hot and humid (28–34°C), brief showers possible",
    pt: "Quente e úmido (28–34°C), chuvas breves possíveis",
  },
  "calido y seco (22–29°c), noches frescas": {
    es: "Cálido y seco (22–29°C), noches frescas",
    en: "Warm and dry (22–29°C), cool nights",
    pt: "Quente e seco (22–29°C), noites frescas",
  },
  "calido (25–31°c), humedad moderada": {
    es: "Cálido (25–31°C), humedad moderada",
    en: "Warm (25–31°C), moderate humidity",
    pt: "Quente (25–31°C), umidade moderada",
  },
  "calido con chubascos (24–30°c)": {
    es: "Cálido con chubascos (24–30°C)",
    en: "Warm with showers (24–30°C)",
    pt: "Quente com pancadas (24–30°C)",
  },
  "caluroso y seco (26–34°c), noches templadas": {
    es: "Caluroso y seco (26–34°C), noches templadas",
    en: "Hot and dry (26–34°C), mild nights",
    pt: "Quente e seco (26–34°C), noites amenas",
  },
  "templado fresco (6–14°c), lluvias dispersas": {
    es: "Templado fresco (6–14°C), lluvias dispersas",
    en: "Cool mild (6–14°C), scattered rain",
    pt: "Ameno fresco (6–14°C), chuvas dispersas",
  },
  "agradable (14–22°c), ideal para capas livianas": {
    es: "Agradable (14–22°C), ideal para capas livianas",
    en: "Pleasant (14–22°C), ideal for light layers",
    pt: "Agradável (14–22°C), ideal para camadas leves",
  },
  "templado (15–24°c), tardes calidas y noches frescas": {
    es: "Templado (15–24°C), tardes cálidas y noches frescas",
    en: "Mild (15–24°C), warm afternoons and cool nights",
    pt: "Ameno (15–24°C), tardes quentes e noites frescas",
  },
  "templado calido (20–28°c)": {
    es: "Templado cálido (20–28°C)",
    en: "Warm temperate (20–28°C)",
    pt: "Ameno quente (20–28°C)",
  },
  "frio (-2 a 8°c), abrigo necesario": {
    es: "Frío (-2 a 8°C), abrigo necesario",
    en: "Cold (-2 to 8°C), coat needed",
    pt: "Frio (-2 a 8°C), casaco necessário",
  },
  "variable (10–20°c), llevar capas": {
    es: "Variable (10–20°C), llevar capas",
    en: "Variable (10–20°C), bring layers",
    pt: "Variável (10–20°C), leve camadas",
  },
  "fresco (8–18°c), posibles lluvias": {
    es: "Fresco (8–18°C), posibles lluvias",
    en: "Cool (8–18°C), possible rain",
    pt: "Fresco (8–18°C), possível chuva",
  },
  "fresco (5–14°c), viento y lluvia probable": {
    es: "Fresco (5–14°C), viento y lluvia probable",
    en: "Cool (5–14°C), wind and rain likely",
    pt: "Fresco (5–14°C), vento e chuva prováveis",
  },
  "frio extremo (-10 a 2°c), nieve frecuente": {
    es: "Frío extremo (-10 a 2°C), nieve frecuente",
    en: "Extreme cold (-10 to 2°C), frequent snow",
    pt: "Frio extremo (-10 a 2°C), neve frequente",
  },
  "frio (0–8°c), aun con nieve": {
    es: "Frío (0–8°C), aún con nieve",
    en: "Cold (0–8°C), still snowy",
    pt: "Frio (0–8°C), ainda com neve",
  },
  "frio (2–10°c), viento intenso": {
    es: "Frío (2–10°C), viento intenso",
    en: "Cold (2–10°C), strong wind",
    pt: "Frio (2–10°C), vento forte",
  },
  "muy caluroso de dia (35–45°c), noches frescas": {
    es: "Muy caluroso de día (35–45°C), noches frescas",
    en: "Very hot by day (35–45°C), cool nights",
    pt: "Muito quente de dia (35–45°C), noites frescas",
  },
  "templado de dia (18–25°c), noches frias": {
    es: "Templado de día (18–25°C), noches frías",
    en: "Mild by day (18–25°C), cold nights",
    pt: "Ameno de dia (18–25°C), noites frias",
  },
  "calido seco (25–33°c)": {
    es: "Cálido seco (25–33°C)",
    en: "Warm and dry (25–33°C)",
    pt: "Quente seco (25–33°C)",
  },
  "calido seco (24–32°c)": {
    es: "Cálido seco (24–32°C)",
    en: "Warm and dry (24–32°C)",
    pt: "Quente seco (24–32°C)",
  },
  "calido (24–30°c)": {
    es: "Cálido (24–30°C)",
    en: "Warm (24–30°C)",
    pt: "Quente (24–30°C)",
  },
  "templado calido (20–26°c)": {
    es: "Templado cálido (20–26°C)",
    en: "Warm temperate (20–26°C)",
    pt: "Ameno quente (20–26°C)",
  },
  "frio (0–8°c)": {
    es: "Frío (0–8°C)",
    en: "Cold (0–8°C)",
    pt: "Frio (0–8°C)",
  },
  "templado fresco (8–15°c)": {
    es: "Templado fresco (8–15°C)",
    en: "Cool mild (8–15°C)",
    pt: "Ameno fresco (8–15°C)",
  },
  "templado variable (14–22°c)": {
    es: "Templado variable (14–22°C)",
    en: "Variable temperate (14–22°C)",
    pt: "Ameno variável (14–22°C)",
  },
  "templado variable (12–20°c)": {
    es: "Templado variable (12–20°C)",
    en: "Variable temperate (12–20°C)",
    pt: "Ameno variável (12–20°C)",
  },
};

const normalizeClimate = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const SEASON_MAP: Record<string, "season.summer" | "season.winter" | "season.spring" | "season.autumn"> = {
  verano: "season.summer",
  invierno: "season.winter",
  primavera: "season.spring",
  otono: "season.autumn",
};

export function translateWeatherSummary(text: string, locale: Locale): string {
  if (locale === "es") return text;

  const warmMatch = text.match(/^Cálido durante los (\d+) días/i);
  if (warmMatch) {
    return translate(locale, "weather.infer.warmDays", { days: warmMatch[1] });
  }

  const coldMatch = text.match(/^Frío intenso a lo largo de los (\d+) días/i);
  if (coldMatch) {
    return translate(locale, "weather.infer.coldDays", { days: coldMatch[1] });
  }

  const suffixMatch = text.match(
    /^(.+?) — pronóstico aproximado para tu estadía de (\d+) día(s?) \(([^)]+)\)\.?$/i,
  );
  if (suffixMatch) {
    const base = CLIMATE_RANGE[normalizeClimate(suffixMatch[1])]?.[locale] ?? suffixMatch[1];
    const days = suffixMatch[2];
    const seasonKey = SEASON_MAP[normalizeClimate(suffixMatch[3])];
    const season = seasonKey ? translate(locale, seasonKey) : suffixMatch[3];
    const daysLabel = Number(days) === 1 ? translate(locale, "common.daysOne") : translate(locale, "common.daysMany");
    return `${base}${translate(locale, "weather.infer.suffix", { days, daysLabel, season })}`;
  }

  return text;
}

function localizeForecast(forecast: ForecastDay[], locale: Locale): ForecastDay[] {
  if (locale === "es") return forecast;
  return forecast.map((day) => ({
    ...day,
    label: day.date ? formatWeatherDate(day.date, "short", locale) : day.label,
    conditions: translateForecastCondition(day.conditions, locale),
  }));
}

export function localizePackSuggestion(suggestion: PackSuggestion, locale: Locale): PackSuggestion {
  if (locale === "es") return suggestion;
  return {
    ...suggestion,
    occasion: translateOccasion(suggestion.occasion, locale),
    weather: translateWeatherSummary(suggestion.weather, locale),
    items: localizePackItems(suggestion.items, locale),
    forecast: suggestion.forecast ? localizeForecast(suggestion.forecast, locale) : suggestion.forecast,
  };
}

export { translateItemName, translateOccasion, translateForecastCondition };
