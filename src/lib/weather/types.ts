// Shared weather types — usados por backend (server route) y frontend.
// Diseñados con campos estilo Windguru (viento, ráfagas, dirección, olas, etc.)
// para que el día de mañana puedas swappear el provider sin tocar la UI.

export type WeatherSpot = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  timezone?: string;
};

export type WeatherHour = {
  /** ISO timestamp local del spot */
  time: string;
  temperature: number; // °C
  precipitation: number; // mm
  windSpeed: number; // km/h
  windGust: number; // km/h
  windDirection: number; // grados (0-360)
  waveHeight: number | null; // metros
  wavePeriod: number | null; // segundos
  waveDirection: number | null; // grados
};

export type WeatherDaySummary = {
  date: string; // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  precipitation: number;
  windMax: number;
  gustMax: number;
  waveMax: number | null;
};

export type WeatherForecastResponse = {
  spot: WeatherSpot;
  current: WeatherHour;
  hourly: WeatherHour[];
  daily: WeatherDaySummary[];
  /** "open-meteo" | "windguru" — para mostrar en la UI */
  provider: "open-meteo" | "windguru" | "wttr.in";
  fetchedAt: string;
};

export type WeatherErrorResponse = {
  error: string;
};

export const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function degToCompass(deg: number): string {
  const idx = Math.round(deg / 22.5) % 16;
  return COMPASS[idx];
}
