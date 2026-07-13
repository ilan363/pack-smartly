import { create } from "zustand";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { getChatWelcome } from "@/lib/i18n/translations";

export type ChatSuggestionItem = {
  category: string;
  name: string;
  weight: number;
  quantity?: number;
};

export type ForecastDay = {
  day: number;
  date?: string;
  label: string;
  tempMin: number;
  tempMax: number;
  conditions: string;
  icon: "sun" | "cloud" | "rain" | "snow" | "storm" | "partly";
  precipitation?: number;
  windMax?: number;
};

export type ChatSuggestion = {
  destination: string;
  weather: string;
  days?: number;
  occasion?: string;
  suitcaseCapacityKg?: number;
  capacityMode?: "fill" | "reserve";
  shoppingReserveKg?: number;
  packingLimitKg?: number;
  weightExcessKg?: number;
  items: ChatSuggestionItem[];
  totalWeight: number;
  forecast?: ForecastDay[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestion?: ChatSuggestion;
  createdAt: number;
};

type ChatState = {
  messages: ChatMessage[];
  addMessage: (m: Omit<ChatMessage, "createdAt">) => void;
  updateSuggestion: (id: string, suggestion: ChatSuggestion) => void;
  reset: () => void;
  syncWelcomeLocale: () => void;
};

function buildInitialChat(): ChatMessage {
  const locale = useLocaleStore.getState().locale;
  return {
    id: "welcome",
    role: "assistant",
    content: getChatWelcome(locale),
    createdAt: 0,
  };
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [buildInitialChat()],
  addMessage: (m) =>
    set((s) => ({ messages: [...s.messages, { ...m, createdAt: Date.now() }] })),
  updateSuggestion: (id, suggestion) =>
    set((s) => ({
      messages: s.messages.map((msg) =>
        msg.id === id ? { ...msg, suggestion } : msg,
      ),
    })),
  reset: () => set({ messages: [buildInitialChat()] }),
  syncWelcomeLocale: () =>
    set((s) => ({
      messages: s.messages.map((msg) =>
        msg.id === "welcome"
          ? { ...msg, content: getChatWelcome(useLocaleStore.getState().locale) }
          : msg,
      ),
    })),
}));
