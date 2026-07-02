export type WeatherIconKind = "sun" | "cloud" | "rain" | "snow" | "storm" | "partly";

export function wmoToWeather(code: number): { icon: WeatherIconKind; label: string } {
  if (code === 0) return { icon: "sun", label: "Despejado" };
  if (code === 1) return { icon: "partly", label: "Mayormente despejado" };
  if (code === 2) return { icon: "partly", label: "Parcialmente nublado" };
  if (code === 3) return { icon: "cloud", label: "Nublado" };
  if (code >= 45 && code <= 48) return { icon: "cloud", label: "Niebla" };
  if (code >= 51 && code <= 57) return { icon: "rain", label: "Llovizna" };
  if (code >= 61 && code <= 67) return { icon: "rain", label: "Lluvia" };
  if (code >= 71 && code <= 77) return { icon: "snow", label: "Nieve" };
  if (code >= 80 && code <= 82) return { icon: "rain", label: "Chubascos" };
  if (code >= 85 && code <= 86) return { icon: "snow", label: "Nevadas" };
  if (code >= 95 && code <= 99) return { icon: "storm", label: "Tormenta" };
  return { icon: "partly", label: "Variable" };
}

export function iconTone(icon: WeatherIconKind): string {
  if (icon === "snow") return "text-sky-400";
  if (icon === "rain" || icon === "storm") return "text-blue-500";
  if (icon === "cloud") return "text-muted-foreground";
  if (icon === "partly") return "text-amber-500";
  return "text-amber-500";
}

export function formatWeatherDate(isoDate: string, style: "short" | "long" = "short"): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  if (style === "long") {
    return date.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  return date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatUpdatedAt(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((Date.now() - then) / 60_000);
  if (diffMin < 1) return "Actualizado recién";
  if (diffMin < 60) return `Actualizado hace ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `Actualizado hace ${diffH} h`;
  return new Date(iso).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
