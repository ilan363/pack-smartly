import { geocodeDestination, parseDestinationParts } from "./geocoding";
import { resolveWindguruSpot, type WindguruSpot } from "./windguru-spots";

export type WindguruSearchHit = {
  id: number;
  name: string;
  score: number;
};

const SEARCH_CACHE = new Map<string, { hits: WindguruSearchHit[]; expires: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 h

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function parseSearchHtml(html: string): WindguruSearchHit[] {
  const hits: WindguruSearchHit[] = [];
  const seen = new Set<number>();

  // Bloques: *Nombre del spot: ... sc=123456
  const blockRegex = /\*([^*]+?):\s*[\s\S]*?sc=(\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const name = match[1].trim();
    const id = parseInt(match[2], 10);
    if (Number.isNaN(id) || seen.has(id)) continue;
    seen.add(id);
    hits.push({ id, name, score: 0 });
  }

  return hits;
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  argentina: ["argentina", "ar"],
  france: ["france", "francia", "fr"],
  spain: ["spain", "españa", "espana", "es"],
  italy: ["italy", "italia", "it"],
  brazil: ["brazil", "brasil", "br"],
  chile: ["chile", "cl"],
  usa: ["usa", "united states", "estados unidos", "us", "eeuu"],
  uk: ["uk", "united kingdom", "reino unido", "gb", "england", "inglaterra"],
  germany: ["germany", "alemania", "de"],
  japan: ["japan", "japon", "tokyo", "jp"],
  mexico: ["mexico", "méxico", "mx"],
  portugal: ["portugal", "pt"],
  australia: ["australia", "au"],
  newzealand: ["new zealand", "nueva zelanda", "nz"],
};

function countryTokens(hint?: string): string[] {
  if (!hint) return [];
  const n = normalize(hint);
  const tokens = new Set<string>([n]);
  for (const aliases of Object.values(COUNTRY_ALIASES)) {
    if (aliases.some((a) => n.includes(a) || a.includes(n))) {
      aliases.forEach((a) => tokens.add(a));
    }
  }
  return [...tokens];
}

function scoreSpot(
  spotName: string,
  searchTerm: string,
  countryHint?: string,
  geocodedCountry?: string,
): number {
  const name = normalize(spotName);
  const term = normalize(searchTerm);
  const words = term.split(/\s+/).filter((w) => w.length > 2);

  let score = 0;

  const countries = [
    ...countryTokens(countryHint),
    ...countryTokens(geocodedCountry),
  ];

  if (countries.length > 0) {
    const matchesCountry = countries.some((c) => name.includes(c));
    if (matchesCountry) score += 60;
    else {
      // Penalizar país claramente distinto en el nombre del spot
      const knownCountries = Object.values(COUNTRY_ALIASES).flat();
      const spotCountries = knownCountries.filter((c) => name.includes(c));
      if (spotCountries.length > 0 && !spotCountries.some((c) => countries.includes(c))) {
        score -= 80;
      }
    }
  }

  if (name.includes(term)) score += 40;
  else if (words.every((w) => name.includes(w))) score += 30;
  else if (words.some((w) => name.includes(w))) score += 15;

  // Preferir nombre corto tipo "País - Ciudad"
  const afterDash = spotName.split("-").slice(1).join("-").trim();
  if (afterDash && normalize(afterDash) === term) score += 25;

  if (!term.includes("aeropuerto") && !term.includes("airport")) {
    if (name.includes("aeropuerto") || name.includes("airport")) score -= 20;
  }

  if (name.includes("disneyland") && !term.includes("disney")) score -= 30;

  return score;
}

async function searchWindguruRaw(query: string): Promise<WindguruSearchHit[]> {
  const cacheKey = normalize(query);
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.hits;
  }

  const url = `http://wap2.windguru.cz/search.php?spot=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error("No se pudo buscar spots en Windguru");
  }

  const html = await response.text();
  const hits = parseSearchHtml(html);

  SEARCH_CACHE.set(cacheKey, { hits, expires: Date.now() + CACHE_TTL_MS });
  return hits;
}

/**
 * Resuelve un spot de Windguru para cualquier destino (sin cuenta PRO).
 * 1) Lista local  2) Búsqueda en windguru.cz  3) Ranking por país/ciudad
 */
export async function resolveWindguruSpotGlobal(
  destination: string,
): Promise<WindguruSpot | null> {
  const local = resolveWindguruSpot(destination);
  if (local) return local;

  const { searchTerm, countryHint } = parseDestinationParts(destination);
  const geocoded = await geocodeDestination(destination).catch(() => null);

  const queries = [
    searchTerm,
    geocoded?.displayName.split(",").slice(0, 2).join(",").trim(),
    destination,
  ].filter((q, i, arr): q is string => Boolean(q) && arr.indexOf(q) === i);

  let best: WindguruSearchHit | null = null;

  for (const q of queries) {
    const hits = await searchWindguruRaw(q);
    for (const hit of hits) {
      const score = scoreSpot(
        hit.name,
        searchTerm,
        countryHint,
        geocoded?.country,
      );
      if (!best || score > best.score) {
        best = { ...hit, score };
      }
    }
    if (best && best.score >= 50) break;
  }

  if (!best || best.score < 20) return null;

  return {
    id: best.id,
    name: best.name,
    keywords: [],
  };
}
