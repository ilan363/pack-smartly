import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type {
  WeatherForecastResponse,
  WeatherHour,
  WeatherDaySummary,
  WeatherSpot,
} from "@/lib/weather/types";

/**
 * Server route: /api/weather
 *
 * Devuelve un pronóstico normalizado (estilo Windguru) para cualquier
 * ubicación buscada por nombre o por lat/lon.
 *
 * Provider actual: Open-Meteo (gratis, sin API key, soporta datos marinos).
 *
 * ────────────────────────────────────────────────────────────────────
 * CÓMO SWAPPEAR A WINDGURU REAL:
 * ────────────────────────────────────────────────────────────────────
 * 1. Pedile a Lovable que agregue los secrets:
 *      WINDGURU_STATION_ID, WINDGURU_PASSWORD, WINDGURU_UID
 * 2. Reemplazá fetchOpenMeteo() por una llamada a:
 *      https://www.windguru.cz/int/iapi.php?q=forecast&id_model=3
 *        &id_spot={station}&uid={uid}&password={pw}
 *    (Windguru entrega CSV/XML — parsealo y mapealo a WeatherHour[].)
 * 3. NO uses process.env.WINDGURU_* fuera del handler — el server route
 *    los inyecta solo en runtime.
 * ────────────────────────────────────────────────────────────────────
 */

const QuerySchema = z.object({
  q: z.string().min(1).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  days: z.coerce.number().int().min(1).max(14).optional().default(5),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/weather")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const parsed = QuerySchema.safeParse({
            q: url.searchParams.get("q") ?? undefined,
            lat: url.searchParams.get("lat") ?? undefined,
            lon: url.searchParams.get("lon") ?? undefined,
            days: url.searchParams.get("days") ?? undefined,
          });
          if (!parsed.success) {
            return json({ error: "Parámetros inválidos" }, 400);
          }
          const { q, lat, lon, days } = parsed.data;

          // Cache en memoria del worker: fresh 10 min, stale-on-429 hasta 1h.
          const cacheKey = `${q ?? ""}|${lat ?? ""}|${lon ?? ""}|${days}`;
          const cached = MEMO.get(cacheKey);
          const now = Date.now();
          if (cached && now - cached.at < 10 * 60_000) {
            return json(cached.data, 200, { "Cache-Control": "public, max-age=600" });
          }

          let spot: WeatherSpot;
          if (typeof lat === "number" && typeof lon === "number") {
            spot = { name: q ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`, latitude: lat, longitude: lon };
          } else if (q) {
            const geo = await geocode(q);
            if (!geo) return json({ error: `No encontré "${q}"` }, 404);
            spot = geo;
          } else {
            return json({ error: "Indicá un destino o coordenadas" }, 400);
          }

          // Intentamos Open-Meteo primero (con timeout corto); si falla o tarda,
          // caemos a wttr.in. Sin retry loops para no exceder el CPU budget del worker.
          try {
            const data = await fetchOpenMeteo(spot, days);
            MEMO.set(cacheKey, { at: now, data });
            return json(data, 200, { "Cache-Control": "public, max-age=600" });
          } catch (err) {
            console.warn("open-meteo failed, trying wttr", err);
            if (cached) {
              return json(cached.data, 200, {
                "Cache-Control": "public, max-age=60",
                "X-Weather-Stale": "true",
              });
            }
            try {
              const fallback = await fetchWttr(spot, days);
              MEMO.set(cacheKey, { at: now, data: fallback });
              return json(fallback, 200, { "Cache-Control": "public, max-age=300" });
            } catch (fallbackErr) {
              console.error("wttr fallback failed", fallbackErr);
              return json(
                { error: "No pude obtener el clima ahora. Probá de nuevo en unos segundos." },
                503,
              );
            }
          }
        } catch (err) {
          console.error("weather route error", err);
          return json({ error: "No pude obtener el clima ahora" }, 502);
        }
      },
    },
  },
});

// Cache en memoria del worker (best-effort; se reinicia con cold starts).
const MEMO = new Map<string, { at: number; data: WeatherForecastResponse }>();

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

// ── fetch con timeout (CF Workers a veces cuelgan en upstreams lentos) ──
async function fetchWithTimeout(url: string, ms = 6000, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ── Geocoding (Open-Meteo, gratis) ────────────────────────────────
async function geocode(name: string): Promise<WeatherSpot | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");
  const res = await fetchWithTimeout(url.toString(), 6000);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      timezone?: string;
    }>;
  };
  const r = data.results?.[0];
  if (!r) return null;
  return {
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    timezone: r.timezone,
  };
}

// ── Forecast fetcher ──────────────────────────────────────────────
async function fetchOpenMeteo(spot: WeatherSpot, days: number): Promise<WeatherForecastResponse> {
  const fc = new URL("https://api.open-meteo.com/v1/forecast");
  fc.searchParams.set("latitude", String(spot.latitude));
  fc.searchParams.set("longitude", String(spot.longitude));
  fc.searchParams.set("timezone", "auto");
  fc.searchParams.set("forecast_days", String(days));
  fc.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
  );
  fc.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max",
  );
  fc.searchParams.set("current", "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m");

  // API marina (olas) — endpoint separado en Open-Meteo
  const mr = new URL("https://marine-api.open-meteo.com/v1/marine");
  mr.searchParams.set("latitude", String(spot.latitude));
  mr.searchParams.set("longitude", String(spot.longitude));
  mr.searchParams.set("timezone", "auto");
  mr.searchParams.set("forecast_days", String(days));
  mr.searchParams.set("hourly", "wave_height,wave_period,wave_direction");

  const [fr, mrRes] = await Promise.all([
    fetchWithTimeout(fc.toString(), 7000),
    fetchWithTimeout(mr.toString(), 5000).catch(() => null), // olas pueden no existir tierra adentro
  ]);
  if (!fr.ok) throw new Error(`open-meteo ${fr.status}`);
  const fJson = (await fr.json()) as OpenMeteoForecast;
  const mJson = mrRes && mrRes.ok ? ((await mrRes.json()) as OpenMeteoMarine) : null;

  const hourly: WeatherHour[] = fJson.hourly.time.map((t, i) => ({
    time: t,
    temperature: round(fJson.hourly.temperature_2m[i]),
    precipitation: round(fJson.hourly.precipitation[i] ?? 0),
    windSpeed: round(fJson.hourly.wind_speed_10m[i]),
    windGust: round(fJson.hourly.wind_gusts_10m[i]),
    windDirection: Math.round(fJson.hourly.wind_direction_10m[i]),
    waveHeight: mJson ? pickByTime(mJson.hourly.time, mJson.hourly.wave_height, t) : null,
    wavePeriod: mJson ? pickByTime(mJson.hourly.time, mJson.hourly.wave_period, t) : null,
    waveDirection: mJson ? pickByTime(mJson.hourly.time, mJson.hourly.wave_direction, t) : null,
  }));

  const daily: WeatherDaySummary[] = fJson.daily.time.map((d, i) => ({
    date: d,
    tempMin: round(fJson.daily.temperature_2m_min[i]),
    tempMax: round(fJson.daily.temperature_2m_max[i]),
    precipitation: round(fJson.daily.precipitation_sum[i] ?? 0),
    windMax: round(fJson.daily.wind_speed_10m_max[i]),
    gustMax: round(fJson.daily.wind_gusts_10m_max[i]),
    waveMax: mJson ? maxWaveForDay(mJson, d) : null,
  }));

  const current: WeatherHour = {
    time: fJson.current.time,
    temperature: round(fJson.current.temperature_2m),
    precipitation: round(fJson.current.precipitation ?? 0),
    windSpeed: round(fJson.current.wind_speed_10m),
    windGust: round(fJson.current.wind_gusts_10m),
    windDirection: Math.round(fJson.current.wind_direction_10m),
    waveHeight: hourly[0]?.waveHeight ?? null,
    wavePeriod: hourly[0]?.wavePeriod ?? null,
    waveDirection: hourly[0]?.waveDirection ?? null,
  };

  return {
    spot: { ...spot, timezone: fJson.timezone ?? spot.timezone },
    current,
    hourly,
    daily,
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
  };
}

function pickByTime(times: string[], values: (number | null)[], t: string): number | null {
  const idx = times.indexOf(t);
  if (idx === -1) return null;
  const v = values[idx];
  return v == null ? null : round(v);
}

function maxWaveForDay(m: OpenMeteoMarine, date: string): number | null {
  const heights: number[] = [];
  m.hourly.time.forEach((t, i) => {
    if (t.startsWith(date)) {
      const v = m.hourly.wave_height[i];
      if (typeof v === "number") heights.push(v);
    }
  });
  if (!heights.length) return null;
  return round(Math.max(...heights));
}

const round = (n: number) => Math.round(n * 10) / 10;

// ── Tipos del provider (Open-Meteo) ───────────────────────────────
type OpenMeteoForecast = {
  timezone?: string;
  current: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    wind_direction_10m: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
  };
};

type OpenMeteoMarine = {
  hourly: {
    time: string[];
    wave_height: (number | null)[];
    wave_period: (number | null)[];
    wave_direction: (number | null)[];
  };
};

// ── Retry con backoff para mitigar 429 ─────────────────────────────
async function fetchWithRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("429") || i === tries - 1) throw err;
      const delay = 400 * Math.pow(2, i) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ── Fallback provider: wttr.in (gratis, sin API key) ──────────────
async function fetchWttr(spot: WeatherSpot, days: number): Promise<WeatherForecastResponse> {
  const loc = `${spot.latitude},${spot.longitude}`;
  const res = await fetch(`https://wttr.in/${loc}?format=j1`, {
    headers: { "User-Agent": "curl/8" },
  });
  if (!res.ok) throw new Error(`wttr ${res.status}`);
  const j = (await res.json()) as WttrResponse;

  const cc = j.current_condition?.[0];
  const nowIso = new Date().toISOString();

  const hourly: WeatherHour[] = [];
  for (const d of j.weather.slice(0, days)) {
    for (const h of d.hourly) {
      // "time" en wttr es "0","300","600"... (HHMM sin ceros)
      const hh = String(h.time).padStart(4, "0").slice(0, 2);
      const iso = `${d.date}T${hh}:00`;
      hourly.push({
        time: iso,
        temperature: Number(h.tempC),
        precipitation: Number(h.precipMM),
        windSpeed: Number(h.windspeedKmph),
        windGust: Number(h.WindGustKmph ?? h.windspeedKmph),
        windDirection: Number(h.winddirDegree),
        waveHeight: null,
        wavePeriod: null,
        waveDirection: null,
      });
    }
  }

  const daily: WeatherDaySummary[] = j.weather.slice(0, days).map((d) => ({
    date: d.date,
    tempMin: Number(d.mintempC),
    tempMax: Number(d.maxtempC),
    precipitation: d.hourly.reduce((s, h) => s + Number(h.precipMM), 0),
    windMax: Math.max(...d.hourly.map((h) => Number(h.windspeedKmph))),
    gustMax: Math.max(...d.hourly.map((h) => Number(h.WindGustKmph ?? h.windspeedKmph))),
    waveMax: null,
  }));

  const current: WeatherHour = cc
    ? {
        time: nowIso,
        temperature: Number(cc.temp_C),
        precipitation: Number(cc.precipMM),
        windSpeed: Number(cc.windspeedKmph),
        windGust: Number(cc.windspeedKmph),
        windDirection: Number(cc.winddirDegree),
        waveHeight: null,
        wavePeriod: null,
        waveDirection: null,
      }
    : hourly[0];

  return {
    spot,
    current,
    hourly,
    daily,
    provider: "wttr.in",
    fetchedAt: nowIso,
  };
}

type WttrHour = {
  time: string;
  tempC: string;
  precipMM: string;
  windspeedKmph: string;
  WindGustKmph?: string;
  winddirDegree: string;
};
type WttrResponse = {
  current_condition?: Array<{
    temp_C: string;
    precipMM: string;
    windspeedKmph: string;
    winddirDegree: string;
  }>;
  weather: Array<{
    date: string;
    maxtempC: string;
    mintempC: string;
    hourly: WttrHour[];
  }>;
};
