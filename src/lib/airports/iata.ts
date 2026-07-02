import airportsData from "@/data/iata-airports.json";

export type IataAirport = {
  code: string;
  name: string;
  city: string;
  country: string;
};

/** Aeropuertos con código IATA, ordenados alfabéticamente por código. */
export const IATA_AIRPORTS: IataAirport[] = airportsData as IataAirport[];

const byCode = new Map(IATA_AIRPORTS.map((a) => [a.code, a]));

export function getAirportByCode(code: string): IataAirport | undefined {
  return byCode.get(code.trim().toUpperCase());
}

export function formatAirportOption(airport: IataAirport): string {
  const place = airport.city || airport.name;
  const country = airport.country ? `, ${airport.country}` : "";
  return `${airport.code} — ${place}${country}`;
}

export function searchIataAirports(query: string): IataAirport[] {
  const q = query.trim().toLowerCase();
  if (!q) return IATA_AIRPORTS;

  return IATA_AIRPORTS.filter((airport) => {
    const code = airport.code.toLowerCase();
    const city = airport.city.toLowerCase();
    const name = airport.name.toLowerCase();
    const country = airport.country.toLowerCase();
    return (
      code.includes(q) ||
      city.includes(q) ||
      name.includes(q) ||
      country.includes(q)
    );
  });
}

export function isValidIataCode(code: string): boolean {
  return /^[A-Z0-9]{3}$/.test(code.trim().toUpperCase()) && byCode.has(code.trim().toUpperCase());
}
