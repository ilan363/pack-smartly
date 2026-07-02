import type { SuitcaseType } from "@/lib/suitcases-store";
import { amadeusGet, hasAmadeusCredentials } from "./client";

export type ExcessBaggageEstimate = {
  excessKg: number;
  estimatedCost: number;
  currency: string;
  pricePerKg: number;
  source: "amadeus" | "fallback";
  airline?: string;
  routeLabel?: string;
  bagUnitPrice?: number;
  note: string;
};

type AmadeusLocationHit = {
  iataCode?: string;
  name?: string;
  subType?: string;
};

type AmadeusFlightOffer = {
  validatingAirlineCodes?: string[];
  price?: {
    currency?: string;
    additionalServices?: Array<{ amount?: string; type?: string }>;
  };
  travelerPricings?: Array<{
    fareDetailsBySegment?: Array<{
      includedCheckedBags?: { quantity?: number; weight?: number; weightUnit?: string };
    }>;
  }>;
};

const AR_IATA = new Set([
  "EZE", "AEP", "COR", "MDZ", "BRC", "SLA", "IGR", "NQN", "TUC", "USH",
  "FTE", "REL", "PSS", "CRD", "RSA", "SFN", "JUJ", "IRJ", "CNQ", "RCU",
]);

function defaultDepartureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function isArgentinaIata(code: string) {
  return AR_IATA.has(code.toUpperCase());
}

function isLikelyArgentinaDestination(destination: string): boolean {
  const d = destination.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/^[a-z]{3}$/i.test(destination.trim()) && isArgentinaIata(destination.trim())) {
    return true;
  }
  return /argentina|buenos aires|cordoba|mendoza|bariloche|ushuaia|calafate|mar del plata|salta|iguazu|el calafate/.test(
    d,
  );
}

function isDomesticRoute(origin: string, destination: string): boolean {
  return isArgentinaIata(origin) && isLikelyArgentinaDestination(destination);
}

function fallbackEstimate(
  excessKg: number,
  suitcaseType: SuitcaseType,
  domestic: boolean,
  note?: string,
): ExcessBaggageEstimate {
  const pricePerKg = domestic
    ? suitcaseType === "cabina"
      ? 1200
      : 900
    : suitcaseType === "cabina"
      ? 18
      : 14;
  const currency = domestic ? "ARS" : "USD";

  return {
    excessKg,
    pricePerKg,
    estimatedCost: Math.round(excessKg * pricePerKg * 100) / 100,
    currency,
    source: "fallback",
    note:
      note ??
      "Estimación regional aproximada. Configurá credenciales Amadeus para cotizar con ofertas reales del mercado.",
  };
}

async function resolveAirportCode(query: string): Promise<string | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z]{3}$/.test(trimmed)) return trimmed.toUpperCase();

  const data = await amadeusGet<{ data?: AmadeusLocationHit[] }>(
    "/v1/reference-data/locations",
    {
      keyword: trimmed.split(",")[0].trim(),
      subType: "AIRPORT,CITY",
      "page[limit]": 5,
    },
  );

  const hit =
    data.data?.find((l) => l.iataCode && l.subType === "AIRPORT") ??
    data.data?.find((l) => l.iataCode);

  return hit?.iataCode?.toUpperCase() ?? null;
}

function extractBagUnitPrices(offers: AmadeusFlightOffer[]): number[] {
  const prices: number[] = [];

  for (const offer of offers) {
    for (const svc of offer.price?.additionalServices ?? []) {
      const type = (svc.type ?? "").toUpperCase();
      if (type.includes("BAG") || type.includes("CHECKED")) {
        const amount = parseFloat(svc.amount ?? "");
        if (Number.isFinite(amount) && amount > 0) prices.push(amount);
      }
    }
  }

  return prices;
}

function inferBagCapacityKg(suitcaseType: SuitcaseType, offers: AmadeusFlightOffer[]) {
  for (const offer of offers) {
    for (const tp of offer.travelerPricings ?? []) {
      for (const seg of tp.fareDetailsBySegment ?? []) {
        const w = seg.includedCheckedBags?.weight;
        if (typeof w === "number" && w > 0) return w;
      }
    }
  }
  return suitcaseType === "cabina" ? 10 : 23;
}

/**
 * Usa Flight Offers Search de Amadeus para obtener precios de equipaje extra
 * y estimar el costo por exceso de peso.
 * @see https://developers.amadeus.com/self-service/category/flights/api-doc/flight-offers-search
 */
export async function estimateExcessBaggageCost(input: {
  destination: string;
  excessKg: number;
  suitcaseType: SuitcaseType;
  originAirport?: string;
  departureDate?: string;
}): Promise<ExcessBaggageEstimate> {
  const excessKg = Math.max(0, input.excessKg);
  if (excessKg <= 0) {
    return {
      excessKg: 0,
      estimatedCost: 0,
      currency: "USD",
      pricePerKg: 0,
      source: "fallback",
      note: "No hay exceso de peso.",
    };
  }

  const originRaw = input.originAirport?.trim().toUpperCase();
  const hasOrigin = Boolean(originRaw && /^[A-Z0-9]{3}$/.test(originRaw));

  if (!hasOrigin) {
    const domestic = isLikelyArgentinaDestination(input.destination);
    return fallbackEstimate(
      excessKg,
      input.suitcaseType,
      domestic,
      "No indicaste aeropuerto de origen (IATA). Mostramos una estimación aproximada del exceso; completá el origen en la valija para afinar la cotización.",
    );
  }

  const origin = originRaw!;
  const domestic = isDomesticRoute(origin, input.destination);

  if (!hasAmadeusCredentials()) {
    return fallbackEstimate(
      excessKg,
      input.suitcaseType,
      domestic,
      "Estimación regional aproximada (sin credenciales Amadeus).",
    );
  }

  try {
    const destinationCode = await resolveAirportCode(input.destination);
    if (!destinationCode) {
      return {
        ...fallbackEstimate(excessKg, input.suitcaseType, domestic),
        note: `No encontramos aeropuerto para "${input.destination}". Mostramos una estimación regional.`,
      };
    }

    const departureDate = input.departureDate || defaultDepartureDate();

    const search = await amadeusGet<{ data?: AmadeusFlightOffer[] }>(
      "/v2/shopping/flight-offers",
      {
        originLocationCode: origin,
        destinationLocationCode: destinationCode,
        departureDate,
        adults: 1,
        max: 8,
        currencyCode: domestic ? "ARS" : "USD",
      },
    );

    const offers = search.data ?? [];
    const bagPrices = extractBagUnitPrices(offers);

    if (!bagPrices.length) {
      return {
        ...fallbackEstimate(excessKg, input.suitcaseType, domestic),
        routeLabel: `${origin} → ${destinationCode}`,
        note: "Amadeus no devolvió tarifas de equipaje extra en estas ofertas. Estimación regional.",
      };
    }

    const bagUnitPrice = Math.min(...bagPrices);
    const bagCapacityKg = inferBagCapacityKg(input.suitcaseType, offers);
    const pricePerKg = bagUnitPrice / bagCapacityKg;
    const byWeight = excessKg * pricePerKg;
    const byWholeBags = Math.ceil(excessKg / bagCapacityKg) * bagUnitPrice;
    const estimatedCost = Math.round(Math.max(byWeight, byWholeBags * 0.85) * 100) / 100;

    const airline = offers[0]?.validatingAirlineCodes?.[0];
    const currency = offers[0]?.price?.currency ?? (domestic ? "ARS" : "USD");

    return {
      excessKg,
      estimatedCost,
      currency,
      pricePerKg: Math.round(pricePerKg * 100) / 100,
      bagUnitPrice,
      airline,
      routeLabel: `${origin} → ${destinationCode}`,
      source: "amadeus",
      note: "Referencia basada en Flight Offers Search de Amadeus (servicios CHECKED_BAGS). El valor final lo define la aerolínea en el mostrador.",
    };
  } catch (err) {
    console.warn("Amadeus excess baggage estimate failed", err);
    return {
      ...fallbackEstimate(excessKg, input.suitcaseType, domestic),
      note: "No pudimos consultar Amadeus desde el navegador. Mostramos una estimación regional aproximada.",
    };
  }
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
