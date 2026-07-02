import type { WeatherForecastResponse } from "./types";
import { getWeatherForecast } from "./service";

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
