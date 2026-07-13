import type { Locale } from "@/lib/i18n/locale-store";
import { categoryTranslationKey } from "@/lib/i18n/categories";
import type { ItemCategoryId } from "@/lib/i18n/categories";
import { translate, type TranslationKey } from "@/lib/i18n/translations";
import { translateItemName } from "@/lib/i18n/pack-items";

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
  reasonKey: TranslationKey;
};

const KNOWN_ITEMS: KnownItem[] = [
  { match: /remera|top|camisa|blusa|chomba|polo/, typicalWeight: 0.18, reasonKey: "weight.reason.shirt" },
  { match: /pantalon|jean|jogger/, typicalWeight: 0.55, reasonKey: "weight.reason.pants" },
  { match: /short|bermuda/, typicalWeight: 0.25, reasonKey: "weight.reason.shorts" },
  { match: /campera|abrigo|tapado|piloto|impermeable/, typicalWeight: 0.75, reasonKey: "weight.reason.jacket" },
  { match: /buzo|sweater|sueter|hoodie/, typicalWeight: 0.55, reasonKey: "weight.reason.sweater" },
  { match: /zapatilla|zapato|bota|sandalia|ojota/, typicalWeight: 0.8, reasonKey: "weight.reason.shoes" },
  { match: /media|medias|calcetin/, typicalWeight: 0.04, reasonKey: "weight.reason.socks" },
  { match: /ropa interior|calzon|boxer|bombacha/, typicalWeight: 0.05, reasonKey: "weight.reason.underwear" },
  { match: /traje de bano|malla|bikini/, typicalWeight: 0.18, reasonKey: "weight.reason.swimwear" },
  { match: /anteojo|gafa|lente/, typicalWeight: 0.08, reasonKey: "weight.reason.glasses" },
  { match: /\bmate\b|termo/, typicalWeight: 0.5, reasonKey: "weight.reason.mate" },
  { match: /laptop|notebook/, typicalWeight: 1.4, reasonKey: "weight.reason.laptop" },
  { match: /cargador|adaptador/, typicalWeight: 0.12, reasonKey: "weight.reason.charger" },
  { match: /neceser|higiene|shampoo|cepillo/, typicalWeight: 0.45, reasonKey: "weight.reason.toiletry" },
  { match: /protector solar/, typicalWeight: 0.25, reasonKey: "weight.reason.sunscreen" },
  { match: /libro/, typicalWeight: 0.3, reasonKey: "weight.reason.book" },
  { match: /pijama/, typicalWeight: 0.3, reasonKey: "weight.reason.pajamas" },
];

const CATEGORY_HINT_KEYS: Record<string, TranslationKey> = {
  Remeras: "weight.hint.shirts",
  Pantalones: "weight.hint.pants",
  Abrigos: "weight.hint.outerwear",
  Zapatillas: "weight.hint.footwear",
  Accesorios: "weight.hint.accessories",
  Higiene: "weight.hint.hygiene",
  Electrónica: "weight.hint.electronics",
  Otros: "weight.hint.other",
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

function categoryLabel(category: string, locale: Locale): string {
  const key = categoryTranslationKey(category as ItemCategoryId);
  return key ? translate(locale, key) : category;
}

export function getWeightExplanation(input: WeightExplainInput, locale: Locale = "es"): string {
  const quantity = Math.max(1, input.quantity ?? 1);
  const perUnit = input.weight;
  const total = perUnit * quantity;
  const displayName = translateItemName(input.name, locale);
  const blob = normalizeText(`${input.category} ${input.name}`);
  const known = KNOWN_ITEMS.find((item) => item.match.test(blob));

  if (input.source === "manual") {
    const qtyText =
      quantity > 1
        ? translate(locale, "weight.explain.manualQty", {
            perUnit: perUnit.toFixed(2),
            quantity,
            total: total.toFixed(2),
          })
        : "";
    return translate(locale, "weight.explain.manual", { name: displayName, qty: qtyText });
  }

  if (known) {
    const diff = Math.abs(perUnit - known.typicalWeight);
    const close = diff <= 0.15;
    return translate(locale, "weight.explain.known", {
      name: displayName,
      perUnit: perUnit.toFixed(2),
      total:
        quantity > 1
          ? translate(locale, "weight.explain.knownTotal", { total: total.toFixed(2) })
          : "",
      typical: known.typicalWeight.toFixed(2),
      reason: translate(locale, known.reasonKey),
      aligned: close
        ? translate(locale, "weight.explain.aligned")
        : translate(locale, "weight.explain.adjusted"),
    });
  }

  const hintKey = CATEGORY_HINT_KEYS[input.category] ?? CATEGORY_HINT_KEYS.Otros;
  const origin =
    input.source === "assistant"
      ? translate(locale, "weight.explain.originAssistant")
      : translate(locale, "weight.explain.originSaved");

  return translate(locale, "weight.explain.generic", {
    origin,
    name: displayName,
    category: categoryLabel(input.category, locale),
    perUnit: perUnit.toFixed(2),
    total:
      quantity > 1
        ? translate(locale, "weight.explain.knownTotal", { total: total.toFixed(2) })
        : "",
    hint: translate(locale, hintKey),
  });
}
