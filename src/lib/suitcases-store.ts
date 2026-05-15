import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SuitcaseType = "cabina" | "bodega";

export type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight: number; // kg per unit
};

export type Suitcase = {
  id: string;
  name: string;
  destination: string;
  type: SuitcaseType;
  maxWeight: number; // kg
  items: Item[];
  createdAt: number;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type State = {
  suitcases: Suitcase[];
  activeSuitcaseId: string | null;
};

type Actions = {
  setActive: (id: string | null) => void;
  addSuitcase: (data: Omit<Suitcase, "id" | "items" | "createdAt"> & { items?: Item[] }) => string;
  updateSuitcase: (id: string, patch: Partial<Omit<Suitcase, "id" | "items" | "createdAt">>) => void;
  removeSuitcase: (id: string) => void;
  addItem: (suitcaseId: string, item: Omit<Item, "id">) => void;
  updateItem: (suitcaseId: string, itemId: string, patch: Partial<Omit<Item, "id">>) => void;
  removeItem: (suitcaseId: string, itemId: string) => void;
  createFromSuggestion: (input: {
    name: string;
    destination: string;
    type: SuitcaseType;
    maxWeight: number;
    items: Omit<Item, "id">[];
  }) => string;
};

const defaultSuitcases: Suitcase[] = [
  {
    id: "default-cabina",
    name: "Valija de Cabina",
    destination: "Bariloche",
    type: "cabina",
    maxWeight: 10,
    createdAt: Date.now(),
    items: [
      { id: uid(), name: "Remera térmica", category: "Remeras", quantity: 3, weight: 0.15 },
      { id: uid(), name: "Pantalón de nieve", category: "Pantalones", quantity: 1, weight: 0.8 },
      { id: uid(), name: "Botas", category: "Zapatillas", quantity: 1, weight: 1.2 },
      { id: uid(), name: "Laptop", category: "Electrónica", quantity: 1, weight: 1.5 },
    ],
  },
  {
    id: "default-bodega",
    name: "Valija Principal",
    destination: "Bariloche",
    type: "bodega",
    maxWeight: 23,
    createdAt: Date.now(),
    items: [],
  },
];

export const useSuitcasesStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      suitcases: defaultSuitcases,
      activeSuitcaseId: "default-cabina",

      setActive: (id) => set({ activeSuitcaseId: id }),

      addSuitcase: (data) => {
        const id = uid();
        const newSuitcase: Suitcase = {
          id,
          name: data.name,
          destination: data.destination,
          type: data.type,
          maxWeight: data.maxWeight,
          items: (data.items ?? []).map((i) => ({ ...i, id: uid() })),
          createdAt: Date.now(),
        };
        set((s) => ({ suitcases: [...s.suitcases, newSuitcase], activeSuitcaseId: id }));
        return id;
      },

      updateSuitcase: (id, patch) =>
        set((s) => ({
          suitcases: s.suitcases.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
        })),

      removeSuitcase: (id) =>
        set((s) => {
          const suitcases = s.suitcases.filter((sc) => sc.id !== id);
          return {
            suitcases,
            activeSuitcaseId:
              s.activeSuitcaseId === id ? suitcases[0]?.id ?? null : s.activeSuitcaseId,
          };
        }),

      addItem: (suitcaseId, item) =>
        set((s) => ({
          suitcases: s.suitcases.map((sc) =>
            sc.id === suitcaseId ? { ...sc, items: [...sc.items, { ...item, id: uid() }] } : sc,
          ),
        })),

      updateItem: (suitcaseId, itemId, patch) =>
        set((s) => ({
          suitcases: s.suitcases.map((sc) =>
            sc.id === suitcaseId
              ? {
                  ...sc,
                  items: sc.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
                }
              : sc,
          ),
        })),

      removeItem: (suitcaseId, itemId) =>
        set((s) => ({
          suitcases: s.suitcases.map((sc) =>
            sc.id === suitcaseId ? { ...sc, items: sc.items.filter((it) => it.id !== itemId) } : sc,
          ),
        })),

      createFromSuggestion: (input) => {
        return get().addSuitcase(input);
      },
    }),
    {
      name: "travel-wolf-suitcases",
    },
  ),
);

export const totalWeight = (items: Item[]) =>
  items.reduce((acc, it) => acc + it.weight * it.quantity, 0);
