export type WindguruSpot = {
  id: number;
  name: string;
  keywords: string[];
};

/** Spots populares en Wind Guru (micro API usa el parámetro `s`). */
export const WINDGURU_SPOTS: WindguruSpot[] = [
  {
    id: 100133,
    name: "Bariloche - Cerro Catedral",
    keywords: ["bariloche", "catedral", "san carlos de bariloche"],
  },
  {
    id: 402996,
    name: "Ushuaia, Tierra del Fuego",
    keywords: ["ushuaia", "tierra del fuego"],
  },
  {
    id: 288497,
    name: "Aeropuerto Ushuaia",
    keywords: ["aeropuerto ushuaia", "sawh"],
  },
  {
    id: 1215661,
    name: "Bariloche Centro",
    keywords: ["bariloche centro", "centro bariloche"],
  },
  {
    id: 515250,
    name: "Bariloche",
    keywords: ["bariloche ciudad"],
  },
  {
    id: 370445,
    name: "Mendoza",
    keywords: ["mendoza"],
  },
  {
    id: 64348,
    name: "Buenos Aires (referencia costa)",
    keywords: ["buenos aires", "caba", "capital federal", "baires"],
  },
  {
    id: 53,
    name: "Maui (referencia playa)",
    keywords: ["maui", "hawaii"],
  },
  {
    id: 366613,
    name: "Lago Moreno - Bariloche",
    keywords: ["lago moreno", "playa del viento"],
  },
  {
    id: 1032579,
    name: "Ushuaia (costa)",
    keywords: ["ushuaia costa"],
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function resolveWindguruSpot(destination: string): WindguruSpot | null {
  const query = normalize(destination);
  if (!query) return null;

  let best: { spot: WindguruSpot; score: number } | null = null;

  for (const spot of WINDGURU_SPOTS) {
    for (const keyword of spot.keywords) {
      const kw = normalize(keyword);
      if (query.includes(kw) || kw.includes(query)) {
        const score = kw.length;
        if (!best || score > best.score) {
          best = { spot, score };
        }
      }
    }
  }

  return best?.spot ?? null;
}
