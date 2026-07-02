import type { WeatherForecastResponse } from "./types";
import { getWeatherForecast } from "./service";
import { searchPlaces } from "./geocode";

export async function fetchWeather(params: {
  query?: string;
  lat?: number;
  lon?: number;
  days?: number;
  startDate?: string;
  endDate?: string;
  signal?: AbortSignal;
}): Promise<WeatherForecastResponse> {
  return getWeatherForecast(params);
}

export async function searchWeatherPlaces(query: string, limit = 8) {
  return searchPlaces(query, limit);
}
