export type GeocodeResult = {
  displayName: string;
  lat: number;
  lon: number;
  country?: string;
  countryCode?: string;
};

/** Geocodifica un destino con Nominatim (OpenStreetMap). Uso moderado en servidor. */
export async function geocodeDestination(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "PackSmartly/1.0 (travel packing assistant)",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: { country?: string; country_code?: string };
  }>;

  if (!data.length) return null;

  const hit = data[0];
  return {
    displayName: hit.display_name,
    lat: parseFloat(hit.lat),
    lon: parseFloat(hit.lon),
    country: hit.address?.country,
    countryCode: hit.address?.country_code?.toUpperCase(),
  };
}

export function parseDestinationParts(destination: string): {
  searchTerm: string;
  countryHint?: string;
} {
  const parts = destination
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      searchTerm: parts[0],
      countryHint: parts[parts.length - 1],
    };
  }

  return { searchTerm: destination.trim() };
}
