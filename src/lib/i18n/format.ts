import type { Locale } from "./locale-store";

export function dateLocaleFor(locale: Locale): string {
  if (locale === "en") return "en-US";
  if (locale === "pt") return "pt-BR";
  return "es-AR";
}

export function formatAppDate(
  locale: Locale,
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
): string {
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return date.toLocaleDateString(dateLocaleFor(locale), options);
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
