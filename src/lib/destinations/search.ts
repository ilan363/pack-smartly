import { normalizePlaceText, searchPlaces } from "@/lib/weather/geocode";
import { DESTINATION_CATALOG, type CountryDestinations } from "./catalog";

export type DestinationSuggestion = {
  label: string;
  kind: "country" | "city" | "place";
};

function matchesQuery(text: string, query: string): boolean {
  const normText = normalizePlaceText(text);
  const normQuery = normalizePlaceText(query);
  if (!normQuery) return true;
  return normText.startsWith(normQuery) || normText.includes(normQuery);
}

function countryMatchesQuery(country: CountryDestinations, query: string): boolean {
  if (matchesQuery(country.name, query)) return true;
  return country.aliases.some((alias) => matchesQuery(alias, query));
}

function findMatchingCountry(query: string): CountryDestinations | null {
  const normQuery = normalizePlaceText(query);
  if (!normQuery) return null;

  let best: { country: CountryDestinations; score: number } | null = null;

  for (const country of DESTINATION_CATALOG) {
    const normName = normalizePlaceText(country.name);
    let score = 0;

    if (normName === normQuery) score = 200;
    else if (normName.startsWith(normQuery)) score = 150;
    else if (normName.includes(normQuery)) score = 100;
    else {
      for (const alias of country.aliases) {
        const normAlias = normalizePlaceText(alias);
        if (normAlias === normQuery) score = Math.max(score, 180);
        else if (normAlias.startsWith(normQuery)) score = Math.max(score, 140);
        else if (normAlias.includes(normQuery)) score = Math.max(score, 90);
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { country, score };
    }
  }

  return best?.country ?? null;
}

function searchCatalog(query: string): DestinationSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const results: DestinationSuggestion[] = [];

  const push = (label: string, kind: DestinationSuggestion["kind"]) => {
    const key = normalizePlaceText(label);
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ label, kind });
  };

  const matchedCountry = findMatchingCountry(trimmed);

  if (matchedCountry) {
    push(matchedCountry.name, "country");
    for (const city of matchedCountry.cities) {
      push(`${city}, ${matchedCountry.name}`, "city");
    }
    return results;
  }

  for (const country of DESTINATION_CATALOG) {
    for (const city of country.cities) {
      if (matchesQuery(city, trimmed) || matchesQuery(`${city}, ${country.name}`, trimmed)) {
        push(`${city}, ${country.name}`, "city");
      }
    }

    if (countryMatchesQuery(country, trimmed)) {
      push(country.name, "country");
    }
  }

  return results;
}

/** Búsqueda instantánea en catálogo local (países + ciudades principales). */
export function searchDestinationCatalog(query: string, limit = 12): DestinationSuggestion[] {
  return searchCatalog(query).slice(0, limit);
}

/** Catálogo + geocodificación para cubrir destinos fuera del catálogo. */
export async function searchDestinations(
  query: string,
  limit = 12,
): Promise<DestinationSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const catalog = searchCatalog(trimmed);
  const seen = new Set(catalog.map((s) => normalizePlaceText(s.label)));

  if (catalog.length >= limit) {
    return catalog.slice(0, limit);
  }

  try {
    const places = await searchPlaces(trimmed, limit);
    for (const place of places) {
      const key = normalizePlaceText(place.name);
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push({ label: place.name, kind: "place" });
      if (catalog.length >= limit) break;
    }
  } catch {
    // Si falla la API, devolvemos solo el catálogo.
  }

  return catalog.slice(0, limit);
}
