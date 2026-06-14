import { resolveWindguruSpotGlobal } from "./windguru-search";

export type HourlyReading = {
  date: string;
  tempC: number;
  humidity: number;
  precipitationMm: number;
};

export type DailyForecast = {
  date: string;
  label: string;
  tempMin: number;
  tempMax: number;
  humidityAvg: number;
  precipitationMm: number;
  summary: string;
};

export type WindguruForecastResult = {
  spotName: string;
  spotId: number;
  model: string;
  timezone: string;
  daily: DailyForecast[];
  weatherSummary: string;
};

function parsePrecipitation(value: string): number {
  if (value === "-" || value === "") return 0;
  const n = parseFloat(value);
  return Number.isNaN(n) ? 0 : n;
}

function parseHourlyLines(text: string, anchorDate: string): HourlyReading[] {
  const anchor = new Date(anchorDate + "T12:00:00");
  const lines = text.split("\n");
  const readings: HourlyReading[] = [];
  let year = anchor.getFullYear();
  let currentMonth = anchor.getMonth();
  let lastDay = -1;
  let headerFound = false;

  const dataLine =
    /^\s*[A-Za-z]{3}\s+(\d{1,2})\.\s+(\d{1,2})h\s+(-?\d+)\s+(\d+)\s+(-|\d+(?:\.\d+)?)/;

  for (const line of lines) {
    if (line.includes("Date") && line.includes("TMP")) {
      headerFound = true;
      continue;
    }
    if (!headerFound) continue;

    const match = line.match(dataLine);
    if (!match) continue;

    const day = parseInt(match[1], 10);
    if (lastDay >= 0 && day < lastDay - 2) {
      currentMonth += 1;
      if (currentMonth > 11) {
        currentMonth = 0;
        year += 1;
      }
    }
    lastDay = day;

    const date = new Date(year, currentMonth, day, 12, 0, 0);
    const iso = date.toISOString().slice(0, 10);

    readings.push({
      date: iso,
      tempC: parseInt(match[3], 10),
      humidity: parseInt(match[4], 10),
      precipitationMm: parsePrecipitation(match[5]),
    });
  }

  return readings;
}

function describeDay(tempMin: number, tempMax: number, precip: number): string {
  const avg = (tempMin + tempMax) / 2;
  let tempLabel = "templado";
  if (avg <= 0) tempLabel = "muy frío";
  else if (avg <= 8) tempLabel = "frío";
  else if (avg <= 16) tempLabel = "fresco";
  else if (avg <= 24) tempLabel = "agradable";
  else if (avg <= 30) tempLabel = "cálido";
  else tempLabel = "caluroso";

  let precipLabel = "";
  if (precip >= 15) precipLabel = ", lluvia intensa";
  else if (precip >= 5) precipLabel = ", lluvia";
  else if (precip >= 1) precipLabel = ", lluvia ligera";
  else if (precip > 0) precipLabel = ", posible llovizna";

  return `${tempLabel}${precipLabel} (${tempMin}° a ${tempMax}°C)`;
}

function aggregateDaily(
  readings: HourlyReading[],
  dateFrom: string,
  dateTo: string,
): DailyForecast[] {
  const byDay = new Map<
    string,
    { temps: number[]; humidity: number[]; precip: number[] }
  >();

  for (const r of readings) {
    if (r.date < dateFrom || r.date > dateTo) continue;
    const bucket = byDay.get(r.date) ?? { temps: [], humidity: [], precip: [] };
    bucket.temps.push(r.tempC);
    bucket.humidity.push(r.humidity);
    bucket.precip.push(r.precipitationMm);
    byDay.set(r.date, bucket);
  }

  const daily: DailyForecast[] = [];
  const cursor = new Date(dateFrom + "T12:00:00");
  const end = new Date(dateTo + "T12:00:00");

  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    const bucket = byDay.get(iso);

    if (bucket && bucket.temps.length > 0) {
      const tempMin = Math.min(...bucket.temps);
      const tempMax = Math.max(...bucket.temps);
      const humidityAvg = Math.round(
        bucket.humidity.reduce((a, b) => a + b, 0) / bucket.humidity.length,
      );
      const precipitationMm = Math.round(
        bucket.precip.reduce((a, b) => a + b, 0) * 10,
      ) / 10;

      daily.push({
        date: iso,
        label: cursor.toLocaleDateString("es-AR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        tempMin,
        tempMax,
        humidityAvg,
        precipitationMm,
        summary: describeDay(tempMin, tempMax, precipitationMm),
      });
    } else {
      daily.push({
        date: iso,
        label: cursor.toLocaleDateString("es-AR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        tempMin: 0,
        tempMax: 0,
        humidityAvg: 0,
        precipitationMm: 0,
        summary: "Sin datos de pronóstico para este día",
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return daily;
}

function buildWeatherSummary(daily: DailyForecast[]): string {
  const withData = daily.filter((d) => d.tempMax !== 0 || d.tempMin !== 0);
  if (withData.length === 0) return "Pronóstico no disponible para las fechas seleccionadas";

  const tempMin = Math.min(...withData.map((d) => d.tempMin));
  const tempMax = Math.max(...withData.map((d) => d.tempMax));
  const totalRain = withData.reduce((a, d) => a + d.precipitationMm, 0);
  const rainyDays = withData.filter((d) => d.precipitationMm >= 3).length;

  let text = `Entre ${tempMin}°C y ${tempMax}°C durante el viaje`;
  if (rainyDays > 0) {
    text += ` · ${rainyDays} ${rainyDays === 1 ? "día con lluvia" : "días con lluvia"} (${Math.round(totalRain)} mm acumulados)`;
  } else {
    text += " · sin lluvia significativa prevista";
  }
  return text;
}

function extractMeta(text: string): { spotName: string; model: string; timezone: string } {
  const lines = text.split("\n").map((l) => l.trim());
  const spotLine = lines.find((l) => l.includes("lat:") && !l.startsWith("Windguru")) ?? "";
  const spotName = spotLine.split(", lat:")[0]?.trim() || "Destino";
  const modelLine = lines.find((l) => l.includes("GFS") || l.includes("km")) ?? "GFS";
  const tzMatch = text.match(/\((UTC[^)]+)\)/);
  return {
    spotName,
    model: modelLine,
    timezone: tzMatch?.[1] ?? "UTC",
  };
}

export async function fetchWindguruForecast(params: {
  destination: string;
  dateFrom: string;
  dateTo: string;
  lat?: number;
  lon?: number;
  proUser?: string;
  proPassword?: string;
}): Promise<WindguruForecastResult> {
  const { destination, dateFrom, dateTo } = params;

  let url: string;
  let spotId: number;
  let spotName: string;

  if (params.lat != null && params.lon != null && params.proUser && params.proPassword) {
    url = `http://micro.windguru.cz/?lat=${params.lat}&lon=${params.lon}&m=gfs&v=TMP,RH,APCP&tz=auto&u=${encodeURIComponent(params.proUser)}&p=${encodeURIComponent(params.proPassword)}`;
    spotId = 0;
    spotName = destination;
  } else {
    const spot = await resolveWindguruSpotGlobal(destination);
    if (!spot) {
      throw new Error(
        "No encontramos un lugar en Windguru para ese destino. Probá con «Ciudad, País» (ej: París, Francia o Bariloche, Argentina).",
      );
    }
    spotId = spot.id;
    spotName = spot.name;
    url = `http://micro.windguru.cz/?s=${spot.id}&m=gfs&v=TMP,RH,APCP`;
  }

  const response = await fetch(url, {
    headers: { Accept: "text/plain" },
  });

  if (!response.ok) {
    throw new Error("Windguru no respondió correctamente. Intentá de nuevo en unos minutos.");
  }

  const text = await response.text();
  if (text.includes("error") && text.length < 200) {
    throw new Error("No se pudo obtener el pronóstico de Windguru.");
  }

  const meta = extractMeta(text);
  const hourly = parseHourlyLines(text, dateFrom);
  const daily = aggregateDaily(hourly, dateFrom, dateTo);

  return {
    spotName: spotName || meta.spotName,
    spotId,
    model: meta.model,
    timezone: meta.timezone,
    daily,
    weatherSummary: buildWeatherSummary(daily),
  };
}
