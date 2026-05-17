import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ChatSuggestionItem = {
  category: string;
  name: string;
  weight: number;
  quantity?: number;
};

export type ChatSuggestion = {
  destination: string;
  weather: string;
  days?: number;
  occasion?: string;
  items: ChatSuggestionItem[];
  totalWeight: number;
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
};

export const INITIAL_CHAT: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy tu asistente de equipaje. Contame sobre tu próximo viaje (destino, clima, días, eventos) y te armo la valija ideal.",
  createdAt: 0,
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [INITIAL_CHAT],
      addMessage: (m) =>
        set((s) => ({ messages: [...s.messages, { ...m, createdAt: Date.now() }] })),
      updateSuggestion: (id, suggestion) =>
        set((s) => ({
          messages: s.messages.map((msg) =>
            msg.id === id ? { ...msg, suggestion } : msg,
          ),
        })),
      reset: () => set({ messages: [INITIAL_CHAT] }),
    }),
    { name: "travel-wolf-chat" },
  ),
);
