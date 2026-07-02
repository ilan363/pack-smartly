import type { WeatherSpot } from "./types";

export type GeocodePlace = WeatherSpot & {
  id: number;
  admin1?: string;
  population?: number;
  featureCode?: string;
};

type RawGeocodeHit = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  feature_code?: string;
  population?: number;
};

const CITY_FEATURES = new Set([
  "PPL",
  "PPLA",
  "PPLA2",
  "PPLA3",
  "PPLA4",
  "PPLC",
  "PPLG",
  "PPLH",
  "PPLQ",
  "PPLR",
  "PPLS",
  "PPLW",
  "PPLX",
  "STLMT",
]);

const COUNTRY_FEATURES = new Set(["PCLI", "PCL", "PCLD", "PCLF", "PCLS", "PCLX"]);

export function normalizePlaceText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePlaceQuery(query: string): { city: string; countryHint?: string } {
  const parts = query
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return { city: parts[0], countryHint: parts[parts.length - 1] };
  }
  return { city: query.trim() };
}

export function formatPlaceLabel(hit: RawGeocodeHit): string {
  const bits = [hit.name];
  if (hit.admin1 && normalizePlaceText(hit.admin1) !== normalizePlaceText(hit.name)) {
    bits.push(hit.admin1);
  }
  if (hit.country) bits.push(hit.country);
  return bits.join(", ");
}

function scorePlace(hit: RawGeocodeHit, city: string, countryHint?: string): number {
  const name = normalizePlaceText(hit.name);
  const query = normalizePlaceText(city);
  const country = normalizePlaceText(hit.country ?? "");
  const admin1 = normalizePlaceText(hit.admin1 ?? "");
  const hint = countryHint ? normalizePlaceText(countryHint) : "";

  let score = 0;

  if (name === query) score += 120;
  else if (name.startsWith(query)) score += 70;
  else if (name.includes(query) || query.includes(name)) score += 35;

  if (hint) {
    if (country === hint || country.includes(hint) || hint.includes(country)) score += 50;
    if (admin1.includes(hint)) score += 25;
  }

  const feature = hit.feature_code ?? "";
  if (CITY_FEATURES.has(feature)) score += 90;
  else if (COUNTRY_FEATURES.has(feature)) score -= 60;
  else if (feature.startsWith("ADM")) score -= 20;

  if (hit.population) {
    score += Math.min(40, Math.log10(Math.max(1, hit.population)) * 8);
  }

  // Si el usuario escribió una ciudad concreta, no elegir un país entero.
  if (COUNTRY_FEATURES.has(feature) && name !== query && !hint) score -= 80;

  return score;
}

function toPlace(hit: RawGeocodeHit): GeocodePlace {
  return {
    id: hit.id,
    name: formatPlaceLabel(hit),
    latitude: hit.latitude,
    longitude: hit.longitude,
    country: hit.country,
    timezone: hit.timezone,
    admin1: hit.admin1,
    population: hit.population,
    featureCode: hit.feature_code,
  };
}

export async function searchPlaces(query: string, limit = 8): Promise<GeocodePlace[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { city, countryHint } = parsePlaceQuery(trimmed);
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", "20");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data = (await res.json()) as { results?: RawGeocodeHit[] };
  const results = data.results ?? [];
  if (!results.length) return [];

  return results
    .map((hit) => ({ hit, score: scorePlace(hit, city, countryHint) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter(({ score }) => score > 0)
    .map(({ hit }) => toPlace(hit));
}

export async function resolvePlace(query: string): Promise<GeocodePlace | null> {
  const places = await searchPlaces(query, 5);
  return places[0] ?? null;
}
