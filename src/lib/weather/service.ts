import type {
  WeatherDaySummary,
  WeatherForecastResponse,
  WeatherHour,
  WeatherSpot,
} from "./types";
import { wmoToWeather } from "./codes";
import { resolvePlace, searchPlaces } from "./geocode";
import { WeatherLookupError } from "./errors";

export { resolvePlace, searchPlaces } from "./geocode";
export type { GeocodePlace } from "./geocode";

const MEMO = new Map<string, { at: number; data: WeatherForecastResponse }>();

async function fetchWithTimeout(url: string, ms = 6000, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function geocode(name: string): Promise<WeatherSpot | null> {
  return resolvePlace(name);
}

async function fetchOpenMeteo(
  spot: WeatherSpot,
  days: number,
  range?: { startDate?: string; endDate?: string },
  locale: import("@/lib/i18n/locale-store").Locale = "es",
): Promise<WeatherForecastResponse> {
  const fc = new URL("https://api.open-meteo.com/v1/forecast");
  fc.searchParams.set("latitude", String(spot.latitude));
  fc.searchParams.set("longitude", String(spot.longitude));
  fc.searchParams.set("timezone", spot.timezone ?? "auto");

  if (range?.startDate && range?.endDate) {
    fc.searchParams.set("start_date", range.startDate);
    fc.searchParams.set("end_date", range.endDate);
  } else {
    fc.searchParams.set("forecast_days", String(days));
  }

  fc.searchParams.set(
    "hourly",
    "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code",
  );
  fc.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max",
  );
  fc.searchParams.set(
    "current",
    "temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code",
  );

  const mr = new URL("https://marine-api.open-meteo.com/v1/marine");
  mr.searchParams.set("latitude", String(spot.latitude));
  mr.searchParams.set("longitude", String(spot.longitude));
  mr.searchParams.set("timezone", "auto");
  mr.searchParams.set("forecast_days", String(days));
  mr.searchParams.set("hourly", "wave_height,wave_period,wave_direction");

  const [fr, mrRes] = await Promise.all([
    fetchWithTimeout(fc.toString(), 7000),
    fetchWithTimeout(mr.toString(), 5000).catch(() => null),
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

  const daily: WeatherDaySummary[] = fJson.daily.time.map((d, i) => {
    const code = fJson.daily.weather_code?.[i];
    const parsed = code != null ? wmoToWeather(code, locale) : null;
    return {
      date: d,
      tempMin: round(fJson.daily.temperature_2m_min[i]),
      tempMax: round(fJson.daily.temperature_2m_max[i]),
      precipitation: round(fJson.daily.precipitation_sum[i] ?? 0),
      windMax: round(fJson.daily.wind_speed_10m_max[i]),
      gustMax: round(fJson.daily.wind_gusts_10m_max[i]),
      waveMax: mJson ? maxWaveForDay(mJson, d) : null,
      weatherCode: code,
      conditions: parsed?.label,
    };
  });

  const current: WeatherHour = {
    time: fJson.current.time,
    temperature: round(fJson.current.temperature_2m),
    precipitation: round(fJson.current.precipitation ?? 0),
    windSpeed: round(fJson.current.wind_speed_10m),
    windGust: round(fJson.current.wind_gusts_10m),
    windDirection: Math.round(fJson.current.wind_direction_10m),
    weatherCode: fJson.current.weather_code,
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

type OpenMeteoForecast = {
  timezone?: string;
  current: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    wind_direction_10m: number;
    weather_code?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    wind_direction_10m: number[];
    weather_code?: number[];
  };
  daily: {
    time: string[];
    weather_code?: number[];
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

async function fetchWttr(spot: WeatherSpot, days: number): Promise<WeatherForecastResponse> {
  const loc = `${spot.latitude},${spot.longitude}`;
  const res = await fetchWithTimeout(`https://wttr.in/${loc}?format=j1`, 8000, {
    headers: { "User-Agent": "curl/8" },
  });
  if (!res.ok) throw new Error(`wttr ${res.status}`);
  const j = (await res.json()) as WttrResponse;

  const cc = j.current_condition?.[0];
  const nowIso = new Date().toISOString();

  const hourly: WeatherHour[] = [];
  for (const d of j.weather.slice(0, days)) {
    for (const h of d.hourly) {
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

export async function getWeatherForecast(params: {
  query?: string;
  lat?: number;
  lon?: number;
  days?: number;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
  locale?: import("@/lib/i18n/locale-store").Locale;
}): Promise<WeatherForecastResponse> {
  const locale = params.locale ?? "es";
  const days = Math.min(14, Math.max(1, params.days ?? 5));
  const cacheKey = `${params.query ?? ""}|${params.lat ?? ""}|${params.lon ?? ""}|${days}|${params.startDate ?? ""}|${params.endDate ?? ""}`;
  const cached = MEMO.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.at < 10 * 60_000) {
    return cached.data;
  }

  let spot: WeatherSpot;
  if (params.lat != null && params.lon != null) {
    spot = {
      name: params.query ?? `${params.lat.toFixed(2)}, ${params.lon.toFixed(2)}`,
      latitude: params.lat,
      longitude: params.lon,
    };
  } else if (params.query) {
    const geo = await geocode(params.query);
    if (!geo) {
      const suggestions = await searchPlaces(params.query, 4);
      if (suggestions.length) {
        const names = suggestions.map((s) => s.name).join(" · ");
        throw new WeatherLookupError("weather.err.notFound", {
          query: params.query,
          suggestions: names,
        });
      }
      throw new WeatherLookupError("weather.err.notFoundGeneric", { query: params.query });
    }
    spot = geo;
  } else {
    throw new WeatherLookupError("weather.err.noDestination");
  }

  try {
    const data = await fetchOpenMeteo(
      spot,
      days,
      {
        startDate: params.startDate,
        endDate: params.endDate,
      },
      locale,
    );
    MEMO.set(cacheKey, { at: now, data });
    return data;
  } catch (err) {
    console.warn("open-meteo failed, trying wttr", err);
    if (cached) return cached.data;
    const fallback = await fetchWttr(spot, days);
    MEMO.set(cacheKey, { at: now, data: fallback });
    return fallback;
  }
}
