import type { Locale } from "@/lib/i18n/locale-store";

type PackingCapacity = {
  capacityKg: number;
  packingLimitKg: number;
  reserveKg: number;
  capacityMode: "fill" | "reserve";
};

const CATEGORIES =
  "Remeras|Pantalones|Abrigos|Zapatillas|Accesorios|Higiene|Electrónica|Otros";

export function buildPackAiSystemPrompt(locale: Locale): string {
  if (locale === "en") {
    return `You are an expert packing assistant. Respond ONLY with valid JSON, no markdown.
Exact format: {"destination":"City or country","days":3,"weather":"brief summary","occasion":"reason","items":[{"category":"${CATEGORIES}","name":"item","quantity":1,"weight":0.2}]}.
Critical rules:
- USE EXACTLY the days, destination, and occasion the user provides (do not invent or change them).
- Realistic quantities with clothing rotation (not 1 per day except very short trips):
  · Shirts/tops: 3–4 (≤7 days), 5–6 (8–14 days), 6–8 (15–21 days). Beach/hot trips may add shorts but do not reduce shirts below these ranges.
  · Pants: 1 (≤4 days), 2 (5–14 days), 3 (15–21 days). Reused between washes.
  · Underwear: half the trip + 1 spare if >6 days (e.g. 11 days → 7, not 10). Less if laundry is explicit.
  · Socks: slightly less than underwear (e.g. 11 days → 5–6).
  · Shorts at beach: 2–3 max for 2-week trips.
  · Footwear (quantity = pairs): everyday sneakers 1/person (2 if trip >14 days or trekking); sandals at beach/hot; formal shoes for formal events; boots for trekking. Shared suitcase → multiply by number of people.
  · Long trips (>21 days) or with laundry: scale slowly (60 days ≈ 9 shirts, 4 pants, 7–8 underwear).
- If the user added notes, include ALL as separate items (quantity 1). Do not omit any note.
- Wedding/formal → include outfit and formal shoes; beach → swimsuit/sunscreen; no snow gear unless snow is mentioned.
- If suitcase capacity in kg is given, build the full list for days and destination; do not cut quantities only for weight (the app will warn if exceeded). "Fill" mode = use space; "reserve/shopping" = leave margin for purchases.
- Shared suitcase: multiply personal clothing by the number of people indicated.
- Max quantity caps (never exceed): shirts ≈ ceil(days×0.8), pants 4, jackets 2, shoes 3 pairs, towels 2. Do not repeat the same garment excessively.
- For socks always use "Medias" (never "Medios").
- Write item names in English.`;
  }

  if (locale === "pt") {
    return `Você é um assistente especialista em bagagem. Responda APENAS com JSON válido, sem markdown.
Formato exato: {"destination":"Cidade ou país","days":3,"weather":"resumo breve","occasion":"motivo","items":[{"category":"${CATEGORIES}","name":"item","quantity":1,"weight":0.2}]}.
Regras críticas:
- USE EXATAMENTE os dias, destino e ocasião indicados pelo usuário (não invente nem altere).
- Quantidades realistas com rotação de roupas (não 1 por dia exceto viagens muito curtas):
  · Camisetas/tops: 3–4 (≤7 dias), 5–6 (8–14 dias), 6–8 (15–21 dias). Em praia/calor pode variar com mais shorts, mas não reduza camisetas abaixo do indicado.
  · Calças: 1 (≤4 dias), 2 (5–14 dias), 3 (15–21 dias). Reutilizadas entre lavagens.
  · Roupa íntima: metade da viagem + 1 reserva se >6 dias (ex. 11 dias → 7, não 10). Com lavanderia explícita, menos.
  · Meias: um pouco menos que roupa íntima (ex. 11 dias → 5–6).
  · Shorts na praia: 2–3 máximo para viagens de 2 semanas.
  · Calçado (quantity = pares): tênis do dia a dia 1 par/pessoa (2 se viagem >14 dias ou trekking); sandálias em praia/calor; sapatos formais em eventos formais; botas em trekking. Mala compartilhada → multiplique pela quantidade de pessoas.
  · Viagens longas (>21 dias) ou com lavanderia: escalar devagar (60 dias ≈ 9 camisetas, 4 calças, 7–8 roupa íntima).
- Se o usuário colocou notas, inclua TODAS como itens separados (quantity 1). Não omita nenhuma nota.
- Casamento/formal → inclua roupa e sapatos formais; praia → roupa de banho/protetor; sem neve não sugira roupa de neve.
- Se indicou capacidade da mala em kg, monte a lista completa conforme dias e destino; não corte quantidades só por peso (o app avisará se exceder). Modo "encher" = aproveitar espaço; "reserva/compras" = deixar margem para compras.
- Mala compartilhada: multiplique as roupas pessoais pela quantidade de pessoas indicada.
- Limites máximos de quantidade (nunca superar): camisetas ≈ ceil(dias×0.8), calças 4, jaquetas 2, sapatos 3 pares, toalhas 2. Não repita a mesma peça em excesso.
- Para meias use sempre "Medias" (nunca "Medios").
- Escreva os nomes dos itens em português.`;
  }

  return `Sos un asistente experto en equipaje. Respondé SOLO JSON válido, sin markdown.
Formato exacto: {"destination":"Ciudad o país","days":3,"weather":"resumen breve","occasion":"motivo","items":[{"category":"${CATEGORIES}","name":"item","quantity":1,"weight":0.2}]}.
Reglas críticas:
- USÁ EXACTAMENTE los días, destino y ocasión que indica el usuario (no inventes ni cambies).
- Cantidades realistas con rotación de prendas (no 1 por día salvo viajes muy cortos):
  · Remeras/tops: 3–4 (≤7 días), 5–6 (8–14 días), 6–8 (15–21 días). En playa/calor podés variar con más shorts, pero no bajes remeras por debajo de lo indicado.
  · Pantalones: 1 (≤4 días), 2 (5–14 días), 3 (15–21 días). Se reusan entre lavados.
  · Ropa interior: mitad del viaje + 1 repuesto si >6 días (ej. 11 días → 7, no 10). Con lavandería explícita, menos.
  · Medias: un poco menos que ropa interior (ej. 11 días → 5–6).
  · Shorts en playa: 2–3 máximo para viajes de 2 semanas.
  · Calzado (quantity = pares): zapatillas de uso diario 1 par/persona (2 si viaje >14 días o trekking); sandalias en playa/calor; zapatos formales en eventos formales; botas en trekking. Valija compartida → multiplicá por cantidad de personas.
  · Viajes largos (>21 días) o con lavandería: escalar lento (60 días ≈ 9 remeras, 4 pantalones, 7–8 ropa interior).
- Si el usuario puso notas, incluí TODAS como ítems aparte (quantity 1). No omitas ninguna nota de la lista.
- Si hay casamiento/boda incluí conjunto y zapatos formales; si es playa incluí traje de baño/protector; si no hay nieve no sugieras ropa de nieve.
- Si el usuario indicó capacidad de valija en kg, armá la lista completa según días y destino; no recortes cantidades solo por peso (la app avisará si se excede). Modo "llenar" = aprovechar espacio; "remanente/compras" = dejar margen para compras.
- Si la valija es compartida, multiplicá las prendas personales por la cantidad de personas indicada.
- Límites máximos de cantidad (nunca superar): remeras ≈ ceil(días×0.8) (ej. 8 en 10 días), pantalones 4, camperas 2, zapatos 3 pares, toallas 2. No repitas la misma prenda en exceso.
- Para calcetines usá siempre "Medias" (nunca "Medios").
- Escribí los nombres de los ítems en español.`;
}

export function buildCapacityPromptContext(packing: PackingCapacity | undefined, locale: Locale): string {
  if (!packing) return "";
  if (packing.capacityMode === "fill") {
    if (locale === "en") {
      return `, mode=fill suitcase (use up to ~${packing.packingLimitKg} kg of ${packing.capacityKg} kg, prioritize using space)`;
    }
    if (locale === "pt") {
      return `, modo=encher mala (use até ~${packing.packingLimitKg} kg de ${packing.capacityKg} kg, priorize aproveitar o espaço)`;
    }
    return `, modo=llenar valija (usá hasta ~${packing.packingLimitKg} kg de ${packing.capacityKg} kg, priorizá aprovechar el espacio)`;
  }
  if (locale === "en") {
    return `, mode=leave space for shopping (reserve ${packing.reserveKg} kg free; pack up to ~${packing.packingLimitKg} kg, do not fill the entire suitcase)`;
  }
  if (locale === "pt") {
    return `, modo=deixar espaço para compras (reserve ${packing.reserveKg} kg livres; monte a lista até ~${packing.packingLimitKg} kg, não encha toda a mala)`;
  }
  return `, modo=dejar espacio para compras (reservá ${packing.reserveKg} kg libres; armá la lista hasta ~${packing.packingLimitKg} kg, no llenes toda la valija)`;
}

export function buildPackAiUserPromptSuffix(
  context: {
    destination: string;
    days: number;
    occasion: string;
    sharedSuitcase: boolean;
    sharedPeople: number;
    noteLines: string[];
  },
  capacity: number | undefined,
  packing: PackingCapacity | undefined,
  locale: Locale,
): string {
  const shared = context.sharedSuitcase
    ? locale === "en"
      ? `yes (${context.sharedPeople} people)`
      : locale === "pt"
        ? `sim (${context.sharedPeople} pessoas)`
        : `sí (${context.sharedPeople} personas)`
    : locale === "en"
      ? "no"
      : locale === "pt"
        ? "não"
        : "no";

  const notesHeader =
    locale === "en"
      ? "\nUser notes (include ALL in items, one per note):\n"
      : locale === "pt"
        ? "\nNotas do usuário (incluir TODAS em items, uma por nota):\n"
        : "\nNotas del usuario (incluir TODAS en items, una por nota):\n";

  const detected =
    locale === "en"
      ? `Detected context: destination=${context.destination}, days=${context.days}, occasion=${context.occasion}`
      : locale === "pt"
        ? `Contexto detectado: destino=${context.destination}, dias=${context.days}, ocasião=${context.occasion}`
        : `Contexto detectado: destino=${context.destination}, días=${context.days}, ocasión=${context.occasion}`;

  const sharedLabel =
    locale === "en" ? "shared suitcase" : locale === "pt" ? "mala compartilhada" : "valija compartida";

  return `${detected}${capacity ? `, capacity=${capacity}kg${buildCapacityPromptContext(packing, locale)}` : ""}, ${sharedLabel}=${shared}${
    context.noteLines.length
      ? `${notesHeader}${context.noteLines.map((n, i) => `${i + 1}. ${n}`).join("\n")}`
      : ""
  }`;
}
