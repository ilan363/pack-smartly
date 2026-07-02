import type { ForecastDay } from "@/lib/chat-store";
import { formatWeatherDate, wmoToWeather } from "@/lib/weather/codes";
import { getWeatherForecast } from "@/lib/weather/service";

function endDateFromStart(dateFrom: string, days: number): string {
  const start = new Date(`${dateFrom}T12:00:00`);
  start.setDate(start.getDate() + Math.max(0, days - 1));
  return start.toISOString().slice(0, 10);
}

export function summarizeForecast(forecast: ForecastDay[], days: number): string {
  if (!forecast.length) return "";
  const avgMax = forecast.reduce((s, f) => s + f.tempMax, 0) / forecast.length;
  const avgMin = forecast.reduce((s, f) => s + f.tempMin, 0) / forecast.length;
  const rainyDays = forecast.filter((f) => f.icon === "rain" || f.icon === "storm").length;
  const first = forecast[0];
  const last = forecast[forecast.length - 1];
  const range =
    first.date && last.date
      ? ` del ${formatWeatherDate(first.date, "long")} al ${formatWeatherDate(last.date, "long")}`
      : "";

  let text = `Pronóstico${range}: ${Math.round(avgMin)}–${Math.round(avgMax)}°C de promedio`;
  if (rainyDays > 0) {
    text += `, con lluvia posible en ${rainyDays} día${rainyDays === 1 ? "" : "s"}`;
  }
  text += `.`;
  return text;
}

export async function fetchTripForecast(input: {
  destination: string;
  days: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ForecastDay[] | null> {
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
    });

    return data.daily.slice(0, days).map((d, i) => {
      const { icon, label } = wmoToWeather(d.weatherCode ?? 2);
      return {
        day: i + 1,
        date: d.date,
        label: formatWeatherDate(d.date),
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
