import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ADMIN_EMAIL = "i.manbrut@wolfsohn.edu.ar";
const ADMIN_PASSWORD = "ilan20enero";

type RegisteredUser = {
  email: string;
  password: string;
};

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthState = {
  email: string | null;
  isAdmin: boolean;
  users: RegisteredUser[];
  login: (email: string, password: string) => AuthResult;
  loginAdmin: (email: string, password: string) => AuthResult;
  register: (email: string, password: string) => AuthResult;
  removeUser: (email: string) => void;
  logout: () => void;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      email: null,
      isAdmin: false,
      users: [],
      login: (email, password) => {
        const normalized = normalizeEmail(email);

        if (normalized === ADMIN_EMAIL) {
          return { ok: false, error: "Usá el acceso de administrador" };
        }

        const user = get().users.find((u) => u.email === normalized);
        if (user && user.password === password) {
          set({ email: normalized, isAdmin: false });
          return { ok: true };
        }

        return { ok: false, error: "Credenciales inválidas" };
      },
      loginAdmin: (email, password) => {
        const normalized = normalizeEmail(email);

        if (normalized === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          set({ email: ADMIN_EMAIL, isAdmin: true });
          return { ok: true };
        }

        return { ok: false, error: "Acceso denegado. Solo el administrador autorizado." };
      },
      register: (email, password) => {
        const normalized = normalizeEmail(email);

        if (!normalized || !password) {
          return { ok: false, error: "Completá email y contraseña" };
        }

        if (!isValidEmail(normalized)) {
          return { ok: false, error: "Ingresá un email válido" };
        }

        if (password.length < 6) {
          return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
        }

        if (normalized === ADMIN_EMAIL) {
          return { ok: false, error: "Este email no puede registrarse" };
        }

        const exists = get().users.some((u) => u.email === normalized);
        if (exists) {
          return { ok: false, error: "Este email ya está registrado" };
        }

        set({
          users: [...get().users, { email: normalized, password }],
          email: normalized,
          isAdmin: false,
        });
        return { ok: true };
      },
      removeUser: (email) => {
        const normalized = normalizeEmail(email);
        set({
          users: get().users.filter((u) => u.email !== normalized),
        });
      },
      logout: () => set({ email: null, isAdmin: false }),
    }),
    { name: "travel-wolf-auth" },
  ),
);
