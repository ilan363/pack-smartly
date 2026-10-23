import type { Item } from "@/lib/suitcases-store";
import { itemLineWeight, totalWeight } from "@/lib/suitcases-store";

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Lower = remove from suitcase first (carry in backpack / personal item instead). */
function removalPriority(item: Item): number {
  const blob = normalizeText(`${item.category} ${item.name}`);

  const rules: { match: RegExp; priority: number }[] = [
    {
      match:
        /documento|pasaporte|passport|dni|cedula|identidad|licencia|reserva|boarding|itinerario|billetera|tarjeta|wallet/,
      priority: 1,
    },
    { match: /cargador|adaptador|auricular|headphone|celular|telefono|tablet|powerbank|bateria/, priority: 2 },
    { match: /laptop|notebook|camara|camera/, priority: 3 },
    { match: /libro|book/, priority: 4 },
    { match: /\bmate\b|termo|yerba/, priority: 5 },
    { match: /anteojo|gafa|lente|glasses|sunglasses/, priority: 6 },
    { match: /medic|farmacia|pastilla|vitamina/, priority: 7 },
    { match: /neceser|higiene|shampoo|cepillo|desodorante|perfume|protector solar/, priority: 8 },
    { match: /paraguas|umbrella/, priority: 9 },
    { match: /zapatilla extra|zapatos extra|extra|repuesto/, priority: 20 },
    { match: /formal|casamiento|fiesta|vestido/, priority: 21 },
    { match: /toalla/, priority: 22 },
    { match: /gorra|sombrero|gorro|guante|accesorio/, priority: 23 },
    { match: /pijama/, priority: 24 },
    { match: /traje de bano|malla|bikini|swim/, priority: 25 },
  ];

  for (const rule of rules) {
    if (rule.match.test(blob)) return rule.priority;
  }

  if (item.category === "Electrónica") return 10;
  if (item.category === "Accesorios") return 12;
  if (item.category === "Higiene") return 15;
  if (item.category === "Otros") return 18;

  return 100;
}

function isQuantityReducible(item: Item): boolean {
  const blob = normalizeText(`${item.category} ${item.name}`);
  return /remera|top|camisa|blusa|media|calcetin|ropa interior|calzon|boxer|bombacha/.test(blob);
}

export type ReduceWeightPlan = {
  removeItemIds: string[];
  quantityUpdates: { itemId: string; quantity: number }[];
  savedKg: number;
  stillOverKg: number;
};

export function planReduceSuitcaseWeight(items: Item[], maxWeight: number): ReduceWeightPlan {
  const startWeight = totalWeight(items);
  if (startWeight <= maxWeight) {
    return { removeItemIds: [], quantityUpdates: [], savedKg: 0, stillOverKg: 0 };
  }

  const removeItemIds: string[] = [];
  const quantityUpdates: { itemId: string; quantity: number }[] = [];
  const quantities = new Map(items.map((i) => [i.id, i.quantity]));

  const currentWeight = () =>
    items.reduce((acc, it) => {
      if (removeItemIds.includes(it.id)) return acc;
      const q = quantities.get(it.id) ?? it.quantity;
      return acc + it.weight * q;
    }, 0);

  const ordered = [...items].sort((a, b) => {
    const pa = removalPriority(a);
    const pb = removalPriority(b);
    if (pa !== pb) return pa - pb;
    return itemLineWeight(b) - itemLineWeight(a);
  });

  for (const item of ordered) {
    if (currentWeight() <= maxWeight) break;
    if (removalPriority(item) >= 100) continue;
    removeItemIds.push(item.id);
  }

  if (currentWeight() > maxWeight) {
    const reducible = items
      .filter((i) => !removeItemIds.includes(i.id))
      .filter((i) => (quantities.get(i.id) ?? i.quantity) > 1 && isQuantityReducible(i))
      .sort((a, b) => removalPriority(b) - removalPriority(a));

    for (const item of reducible) {
      let q = quantities.get(item.id) ?? item.quantity;
      while (q > 1 && currentWeight() > maxWeight) {
        q -= 1;
        quantities.set(item.id, q);
      }
      if (q !== item.quantity) {
        quantityUpdates.push({ itemId: item.id, quantity: q });
      }
    }
  }

  const endWeight = currentWeight();
  return {
    removeItemIds,
    quantityUpdates,
    savedKg: Math.max(0, startWeight - endWeight),
    stillOverKg: Math.max(0, endWeight - maxWeight),
  };
}
