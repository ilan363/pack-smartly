export type WeightSource = "manual" | "assistant" | "imported";

export type WeightExplainInput = {
  name: string;
  category: string;
  weight: number;
  quantity?: number;
  source?: WeightSource;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

type KnownItem = {
  match: RegExp;
  typicalWeight: number;
  reason: string;
};

const KNOWN_ITEMS: KnownItem[] = [
  {
    match: /remera|top|camisa|blusa|chomba|polo/,
    typicalWeight: 0.18,
    reason: "Prenda liviana de algodón o mezcla; varía según tela y talla.",
  },
  {
    match: /pantalon|jean|jogger/,
    typicalWeight: 0.55,
    reason: "Denim o gabardina; los jeans suelen ser más pesados que un pantalón liviano.",
  },
  {
    match: /short|bermuda/,
    typicalWeight: 0.25,
    reason: "Menos tela que un pantalón largo.",
  },
  {
    match: /campera|abrigo|tapado|piloto|impermeable/,
    typicalWeight: 0.75,
    reason: "Capas externas con más material; una campera de pluma pesa menos que un abrigo de lana.",
  },
  {
    match: /buzo|sweater|sueter|hoodie/,
    typicalWeight: 0.55,
    reason: "Tejido de algodón o lana; el fleece suele ser liviano, el lana más pesado.",
  },
  {
    match: /zapatilla|zapato|bota|sandalia|ojota/,
    typicalWeight: 0.8,
    reason: "Calzado con suela y estructura; las botas pesan más que las sandalias.",
  },
  {
    match: /media|medias|calcetin/,
    typicalWeight: 0.04,
    reason: "Par de medias de algodén o deportivas.",
  },
  {
    match: /ropa interior|calzon|boxer|bombacha/,
    typicalWeight: 0.05,
    reason: "Prenda mínima de algodón o microfibra.",
  },
  {
    match: /traje de bano|malla|bikini/,
    typicalWeight: 0.18,
    reason: "Tela sintética liviana y poca superficie.",
  },
  {
    match: /anteojo|gafa|lente/,
    typicalWeight: 0.08,
    reason: "Montura y cristales livianos.",
  },
  {
    match: /\bmate\b|termo/,
    typicalWeight: 0.5,
    reason: "Incluye recipiente y contenido habitual de viaje.",
  },
  {
    match: /laptop|notebook/,
    typicalWeight: 1.4,
    reason: "Ultrabook liviano vs. notebook gamer; este valor es un promedio.",
  },
  {
    match: /cargador|adaptador/,
    typicalWeight: 0.12,
    reason: "Cargador de celular o adaptador de enchufe.",
  },
  {
    match: /neceser|higiene|shampoo|cepillo/,
    typicalWeight: 0.45,
    reason: "Kit de higiene en envases de viaje.",
  },
  {
    match: /protector solar/,
    typicalWeight: 0.25,
    reason: "Frasco estándar de 100–200 ml.",
  },
  {
    match: /libro/,
    typicalWeight: 0.3,
    reason: "Libro de bolsillo; un tapa dura puede superar 0,5 kg.",
  },
  {
    match: /pijama/,
    typicalWeight: 0.3,
    reason: "Conjunto liviano de dormir.",
  },
];

const CATEGORY_HINTS: Record<string, string> = {
  Remeras: "Las remeras suelen ir de 0,12 a 0,25 kg según tela y manga.",
  Pantalones: "Un pantalón va de 0,35 a 0,75 kg; el jean suele estar arriba.",
  Abrigos: "Abrigos y camperas: 0,45 a 1,4 kg según aislamiento y largo.",
  Zapatillas: "Calzado cerrado: 0,35 a 1,2 kg por par.",
  Accesorios: "Objetos chicos: 0,05 a 0,5 kg según material.",
  Higiene: "Neceser y productos: 0,15 a 0,7 kg.",
  Electrónica: "Gadgets: 0,1 a 1,5 kg según dispositivo.",
  Otros: "Estimación según tamaño y material del objeto.",
};

const CATEGORY_DEFAULT_KG: Record<string, number> = {
  Remeras: 0.18,
  Pantalones: 0.55,
  Abrigos: 0.75,
  Zapatillas: 0.8,
  Accesorios: 0.25,
  Higiene: 0.45,
  Electrónica: 0.5,
  Otros: 0.2,
};

/** Estimated kg per unit from item name and category (same logic as the AI packer). */
export function estimateUnitWeightKg(name: string, category: string): number {
  const blob = normalizeText(`${category} ${name}`);
  const known = KNOWN_ITEMS.find((item) => item.match.test(blob));
  if (known) return known.typicalWeight;
  return CATEGORY_DEFAULT_KG[category] ?? CATEGORY_DEFAULT_KG.Otros;
}

export function estimateLineWeightKg(name: string, category: string, quantity: number): number {
  const qty = Math.max(1, quantity);
  const perUnit = estimateUnitWeightKg(name, category);
  return Math.round(perUnit * qty * 100) / 100;
}

export function getWeightExplanation(input: WeightExplainInput): string {
  const quantity = Math.max(1, input.quantity ?? 1);
  const perUnit = input.weight;
  const total = perUnit * quantity;
  const blob = normalizeText(`${input.category} ${input.name}`);
  const known = KNOWN_ITEMS.find((item) => item.match.test(blob));

  if (input.source === "manual") {
    const qtyText =
      quantity > 1
        ? ` (${perUnit.toFixed(2)} kg por unidad × ${quantity} = ${total.toFixed(2)} kg)`
        : "";
    return `Este peso lo cargaste vos al agregar "${input.name}"${qtyText}. Es el valor que ingresaste; si querés más precisión, pesalo con balanza antes del viaje.`;
  }

  if (known) {
    const diff = Math.abs(perUnit - known.typicalWeight);
    const close = diff <= 0.15;
    return `"${input.name}" está en ${perUnit.toFixed(2)} kg por unidad${
      quantity > 1 ? ` (${total.toFixed(2)} kg en total)` : ""
    }. Referencia habitual: ~${known.typicalWeight.toFixed(2)} kg. ${known.reason}${
      close
        ? " El valor asignado está alineado con ese rango."
        : " Ajustamos según categoría y tipo de prenda."
    }`;
  }

  const categoryHint = CATEGORY_HINTS[input.category] ?? CATEGORY_HINTS.Otros;
  const origin =
    input.source === "assistant"
      ? "El asistente de IA estimó este peso"
      : "Este peso viene de una lista sugerida o guardada";

  return `${origin} para "${input.name}" (${input.category}): ${perUnit.toFixed(2)} kg c/u${
    quantity > 1 ? `, ${total.toFixed(2)} kg en total` : ""
  }. ${categoryHint} Cada prenda pesa distinto; usamos un promedio razonable para planificar la valija.`;
}
