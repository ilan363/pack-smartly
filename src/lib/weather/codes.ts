import type { Locale } from "@/lib/i18n/locale-store";
import { dateLocaleFor } from "@/lib/i18n/format";
import { translate, type TranslationKey } from "@/lib/i18n/translations";
import type { ItemCategoryId } from "@/lib/i18n/categories";
import { categoryTranslationKey } from "@/lib/i18n/categories";

export type WeatherIconKind = "sun" | "cloud" | "rain" | "snow" | "storm" | "partly";

const WMO_KEYS: Record<number, TranslationKey> = {
  0: "weather.cond.clear",
  1: "weather.cond.mostlyClear",
  2: "weather.cond.partlyCloudy",
  3: "weather.cond.cloudy",
  45: "weather.cond.fog",
  48: "weather.cond.fog",
  51: "weather.cond.drizzle",
  57: "weather.cond.drizzle",
  61: "weather.cond.rain",
  67: "weather.cond.rain",
  71: "weather.cond.snow",
  77: "weather.cond.snow",
  80: "weather.cond.showers",
  82: "weather.cond.showers",
  85: "weather.cond.snowShowers",
  86: "weather.cond.snowShowers",
  95: "weather.cond.storm",
  99: "weather.cond.storm",
};

function wmoKey(code: number): TranslationKey {
  if (WMO_KEYS[code]) return WMO_KEYS[code];
  if (code >= 45 && code <= 48) return "weather.cond.fog";
  if (code >= 51 && code <= 57) return "weather.cond.drizzle";
  if (code >= 61 && code <= 67) return "weather.cond.rain";
  if (code >= 71 && code <= 77) return "weather.cond.snow";
  if (code >= 80 && code <= 82) return "weather.cond.showers";
  if (code >= 85 && code <= 86) return "weather.cond.snowShowers";
  if (code >= 95 && code <= 99) return "weather.cond.storm";
  return "weather.cond.variable";
}

export function wmoToWeather(
  code: number,
  locale: Locale = "es",
): { icon: WeatherIconKind; label: string } {
  const key = wmoKey(code);
  const label = translate(locale, key);
  if (code === 0) return { icon: "sun", label };
  if (code === 1 || code === 2) return { icon: "partly", label };
  if (code === 3 || (code >= 45 && code <= 48)) return { icon: "cloud", label };
  if (code >= 51 && code <= 67) return { icon: "rain", label };
  if (code >= 71 && code <= 77) return { icon: "snow", label };
  if (code >= 80 && code <= 82) return { icon: "rain", label };
  if (code >= 85 && code <= 86) return { icon: "snow", label };
  if (code >= 95 && code <= 99) return { icon: "storm", label };
  return { icon: "partly", label };
}

export function iconTone(icon: WeatherIconKind): string {
  if (icon === "snow") return "text-sky-400";
  if (icon === "rain" || icon === "storm") return "text-blue-500";
  if (icon === "cloud") return "text-muted-foreground";
  if (icon === "partly") return "text-amber-500";
  return "text-amber-500";
}

export function formatWeatherDate(
  isoDate: string,
  style: "short" | "long" = "short",
  locale: Locale = "es",
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const dateLocale = dateLocaleFor(locale);
  if (style === "long") {
    return date.toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  return date.toLocaleDateString(dateLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatUpdatedAt(iso: string, locale: Locale = "es"): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60_000);
  if (diffMin < 1) return translate(locale, "weather.updated.justNow");
  if (diffMin < 60) return translate(locale, "weather.updated.minutes", { min: diffMin });
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return translate(locale, "weather.updated.hours", { hours: diffH });
  return new Date(iso).toLocaleString(dateLocaleFor(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function translateCategoryLabel(category: string, locale: Locale): string {
  const key = categoryTranslationKey(category as ItemCategoryId);
  return key ? translate(locale, key) : category;
}
