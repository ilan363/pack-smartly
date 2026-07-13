import type { ForecastDay } from "@/lib/chat-store";
import type { Locale } from "@/lib/i18n/locale-store";
import { translate } from "@/lib/i18n/translations";
import { formatWeatherDate, wmoToWeather } from "@/lib/weather/codes";
import { getWeatherForecast } from "@/lib/weather/service";

function endDateFromStart(dateFrom: string, days: number): string {
  const start = new Date(`${dateFrom}T12:00:00`);
  start.setDate(start.getDate() + Math.max(0, days - 1));
  return start.toISOString().slice(0, 10);
}

export function summarizeForecast(forecast: ForecastDay[], days: number, locale: Locale = "es"): string {
  if (!forecast.length) return "";
  const avgMax = forecast.reduce((s, f) => s + f.tempMax, 0) / forecast.length;
  const avgMin = forecast.reduce((s, f) => s + f.tempMin, 0) / forecast.length;
  const rainyDays = forecast.filter((f) => f.icon === "rain" || f.icon === "storm").length;
  const first = forecast[0];
  const last = forecast[forecast.length - 1];
  const range =
    first.date && last.date
      ? translate(locale, "weather.forecast.range", {
          from: formatWeatherDate(first.date, "long", locale),
          to: formatWeatherDate(last.date, "long", locale),
        })
      : "";

  const rain =
    rainyDays > 0
      ? translate(locale, "weather.forecast.rainDays", {
          count: rainyDays,
          daysLabel:
            rainyDays === 1
              ? translate(locale, "common.daysOne")
              : translate(locale, "common.daysMany"),
        })
      : "";

  return translate(locale, "weather.forecast.summary", {
    range,
    min: Math.round(avgMin),
    max: Math.round(avgMax),
    rain,
  });
}

export async function fetchTripForecast(input: {
  destination: string;
  days: number;
  dateFrom?: string;
  dateTo?: string;
  locale?: Locale;
}): Promise<ForecastDay[] | null> {
  const locale = input.locale ?? "es";
  const days = Math.min(14, Math.max(1, input.days));
  const startDate = input.dateFrom;
  const endDate =
    input.dateTo ?? (startDate ? endDateFromStart(startDate, days) : undefined);

  try {
    const data = await getWeatherForecast({
      query: input.destination,
      days,
      startDate,
      endDate,
      locale,
    });

    return data.daily.slice(0, days).map((d, i) => {
      const { icon, label } = wmoToWeather(d.weatherCode ?? 2, locale);
      return {
        day: i + 1,
        date: d.date,
        label: formatWeatherDate(d.date, "short", locale),
        tempMin: d.tempMin,
        tempMax: d.tempMax,
        conditions: d.conditions ?? label,
        icon,
        precipitation: d.precipitation,
        windMax: d.windMax,
      };
    });
  } catch (error) {
    console.warn("[weather] No se pudo obtener pronóstico real para el viaje", error);
    return null;
  }
}
