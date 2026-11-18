import { create } from "zustand";
import type { OAuthProviderId } from "@/lib/oauth";

export const ADMIN_EMAIL = "i.manbrut@wolfsohn.edu.ar";

type AuthState = {
  email: string | null;
  isAdmin: boolean;
  oauthProvider: OAuthProviderId | null;
  setFirebaseSession: (email: string, provider: OAuthProviderId | null) => void;
  clearFirebaseSession: () => void;
  logout: () => void;
  resetSession: () => void;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  isAdmin: false,
  oauthProvider: null,
  setFirebaseSession: (email, provider) => {
    const normalizedEmail = normalizeEmail(email);
    set({
      email: normalizedEmail,
      isAdmin: normalizedEmail === ADMIN_EMAIL && provider === null,
      oauthProvider: provider,
    });
  },
  clearFirebaseSession: () =>
    set({ email: null, isAdmin: false, oauthProvider: null }),
  logout: () => set({ email: null, isAdmin: false, oauthProvider: null }),
  resetSession: () => set({ email: null, isAdmin: false, oauthProvider: null }),
}));
