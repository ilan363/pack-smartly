// Helper de frontend para llamar al server route /api/weather.
// Centralizado acá para que mañana puedas cambiar el endpoint
// (p.ej. agregar caching, retries) sin tocar componentes.

import type { WeatherForecastResponse } from "./types";

export async function fetchWeather(params: {
  query?: string;
  lat?: number;
  lon?: number;
  days?: number;
  signal?: AbortSignal;
}): Promise<WeatherForecastResponse> {
  const sp = new URLSearchParams();
  if (params.query) sp.set("q", params.query);
  if (params.lat != null) sp.set("lat", String(params.lat));
  if (params.lon != null) sp.set("lon", String(params.lon));
  if (params.days) sp.set("days", String(params.days));

  const res = await fetch(`/api/weather?${sp.toString()}`, { signal: params.signal });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: "Error" }))) as { error?: string };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return (await res.json()) as WeatherForecastResponse;
}
