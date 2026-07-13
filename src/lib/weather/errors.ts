import type { WeatherErrorCode } from "@/lib/i18n/translations-dynamic";

export class WeatherLookupError extends Error {
  readonly code: WeatherErrorCode;
  readonly vars?: Record<string, string>;

  constructor(code: WeatherErrorCode, vars?: Record<string, string>) {
    super(code);
    this.name = "WeatherLookupError";
    this.code = code;
    this.vars = vars;
  }
}

export function isWeatherLookupError(error: unknown): error is WeatherLookupError {
  return error instanceof WeatherLookupError;
}
