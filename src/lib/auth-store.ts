import { create } from "zustand";
import { persist } from "zustand/middleware";

const ALLOWED_EMAIL = "i.manbrut@wolfsohn.edu.ar";
const ALLOWED_PASSWORD = "ilan20enero";

type AuthState = {
  email: string | null;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      login: (email, password) => {
        if (
          email.trim().toLowerCase() === ALLOWED_EMAIL &&
          password === ALLOWED_PASSWORD
        ) {
          set({ email: ALLOWED_EMAIL });
          return { ok: true };
        }
        return { ok: false, error: "Credenciales inválidas" };
      },
      logout: () => set({ email: null }),
    }),
    { name: "travel-wolf-auth" },
  ),
);
