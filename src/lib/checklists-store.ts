import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSafeLocalStorage } from "@/lib/safe-storage";

export type ChecklistItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight: number;
  checked: boolean;
};

export type Checklist = {
  id: string;
  title: string;
  destination: string;
  days: number;
  weather: string;
  occasion: string;
  items: ChecklistItem[];
  createdAt: number;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type State = { checklists: Checklist[] };
type Actions = {
  addChecklist: (data: Omit<Checklist, "id" | "createdAt" | "items"> & {
    items: Omit<ChecklistItem, "id" | "checked">[];
  }) => string;
  removeChecklist: (id: string) => void;
  toggleItem: (checklistId: string, itemId: string) => void;
  pendingCount: (id: string) => number;
  reset: () => void;
};

export const useChecklistsStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      checklists: [],
      addChecklist: (data) => {
        const id = uid();
        set((s) => ({
          checklists: [
            ...s.checklists,
            {
              id,
              title: data.title,
              destination: data.destination,
              days: data.days,
              weather: data.weather,
              occasion: data.occasion,
              createdAt: Date.now(),
              items: data.items.map((i) => ({ ...i, id: uid(), checked: false })),
            },
          ],
        }));
        return id;
      },
      removeChecklist: (id) =>
        set((s) => ({ checklists: s.checklists.filter((c) => c.id !== id) })),
      toggleItem: (checklistId, itemId) =>
        set((s) => ({
          checklists: s.checklists.map((c) =>
            c.id === checklistId
              ? {
                  ...c,
                  items: c.items.map((it) =>
                    it.id === itemId ? { ...it, checked: !it.checked } : it,
                  ),
                }
              : c,
          ),
        })),
      pendingCount: (id) => {
        const c = get().checklists.find((cl) => cl.id === id);
        if (!c) return 0;
        return c.items.filter((i) => !i.checked).length;
      },
      reset: () => set({ checklists: [] }),
    }),
    {
      name: "pack-smartly-checklists",
      storage: createJSONStorage(() => createSafeLocalStorage()),
      partialize: (state) => ({ checklists: state.checklists }),
    },
  ),
);
