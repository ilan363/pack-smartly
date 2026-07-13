import type { TranslationKey } from "./translations";

export const ITEM_CATEGORY_IDS = [
  "Remeras",
  "Pantalones",
  "Abrigos",
  "Zapatillas",
  "Accesorios",
  "Higiene",
  "Electrónica",
  "Otros",
] as const;

export type ItemCategoryId = (typeof ITEM_CATEGORY_IDS)[number];

const CATEGORY_KEYS: Record<ItemCategoryId, TranslationKey> = {
  Remeras: "category.shirts",
  Pantalones: "category.pants",
  Abrigos: "category.outerwear",
  Zapatillas: "category.footwear",
  Accesorios: "category.accessories",
  Higiene: "category.hygiene",
  "Electrónica": "category.electronics",
  Otros: "category.other",
};

export function categoryTranslationKey(category: string): TranslationKey | null {
  return CATEGORY_KEYS[category as ItemCategoryId] ?? null;
}
