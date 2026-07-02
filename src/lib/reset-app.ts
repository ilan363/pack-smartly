import { useAuthStore } from "@/lib/auth-store";
import { useChatStore } from "@/lib/chat-store";
import { useChecklistsStore } from "@/lib/checklists-store";
import { clearAllSavedLists } from "@/lib/saved-lists";
import { useSuitcasesStore } from "@/lib/suitcases-store";

/** Reinicia valijas, listas, chat, sesión y valijas guardadas de la visita actual. */
export function resetAppState() {
  useSuitcasesStore.getState().reset();
  useChecklistsStore.getState().reset();
  useChatStore.getState().reset();
  useAuthStore.getState().resetSession();
  clearAllSavedLists();
}
