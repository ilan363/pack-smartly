import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSafeLocalStorage } from "@/lib/safe-storage";

export type Locale = "es" | "en" | "pt";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "es",
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "travel-wolf-locale",
      storage: createJSONStorage(() => createSafeLocalStorage()),
      partialize: (state) => ({ locale: state.locale }),
    },
  ),
);
