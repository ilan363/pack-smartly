import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OAuthProviderId } from "@/lib/oauth";
import type { AuthErrorCode } from "@/lib/i18n/translations-dynamic";
import { createSafeLocalStorage } from "@/lib/safe-storage";
import { syncUserToRegistry } from "@/lib/user-registry";

export const ADMIN_EMAIL = "i.manbrut@wolfsohn.edu.ar";
const ADMIN_PASSWORD = "ilan20enero";

export type RegisteredUser = {
  email: string;
  password: string;
  oauthProvider: OAuthProviderId | null;
  registeredAt: number;
  lastLoginAt: number;
};

type AuthResult = { ok: true } | { ok: false; error: AuthErrorCode };

type AuthState = {
  email: string | null;
  isAdmin: boolean;
  oauthProvider: OAuthProviderId | null;
  users: RegisteredUser[];
  login: (email: string, password: string) => AuthResult;
  loginAdmin: (email: string, password: string) => AuthResult;
  register: (email: string, password: string) => AuthResult;
  resetPassword: (email: string, newPassword: string) => AuthResult;
  setOAuthSession: (email: string, provider: OAuthProviderId | null) => AuthResult;
  clearOAuthSession: () => void;
  removeUser: (email: string) => void;
  logout: () => void;
  resetSession: () => void;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isOAuthOnlyUser(user: RegisteredUser) {
  return Boolean(user.oauthProvider) && !user.password;
}

function findRegisteredUser(users: RegisteredUser[], email: string) {
  const normalized = normalizeEmail(email);
  return users.find((user) => user.email === normalized);
}

function trackUserLogin(email: string, authMethod: OAuthProviderId | "email") {
  void (async () => {
    const ok = await syncUserToRegistry(email, authMethod);
    if (!ok) {
      await syncUserToRegistry(email, authMethod);
    }
  })();
}

function upsertRegisteredUser(
  users: RegisteredUser[],
  email: string,
  patch: Partial<Pick<RegisteredUser, "password" | "oauthProvider">>,
): RegisteredUser[] {
  const normalized = normalizeEmail(email);
  const now = Date.now();
  const index = users.findIndex((user) => user.email === normalized);

  if (index >= 0) {
    const current = users[index];
    const next = [...users];
    next[index] = {
      ...current,
      password: patch.password ?? current.password,
      oauthProvider: patch.oauthProvider ?? current.oauthProvider,
      lastLoginAt: now,
    };
    return next;
  }

  return [
    ...users,
    {
      email: normalized,
      password: patch.password ?? "",
      oauthProvider: patch.oauthProvider ?? null,
      registeredAt: now,
      lastLoginAt: now,
    },
  ];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      email: null,
      isAdmin: false,
      oauthProvider: null,
      users: [],
      login: (email, password) => {
        const normalized = normalizeEmail(email);

        if (!normalized || !password) {
          return { ok: false, error: "auth.err.missing_credentials" };
        }

        if (!isValidEmail(normalized)) {
          return { ok: false, error: "auth.err.invalid_email" };
        }

        if (normalized === ADMIN_EMAIL) {
          return { ok: false, error: "auth.err.use_admin_login" };
        }

        const user = findRegisteredUser(get().users, normalized);
        if (!user) {
          return { ok: false, error: "auth.err.user_not_found" };
        }

        if (isOAuthOnlyUser(user)) {
          return { ok: false, error: "auth.err.use_oauth_login" };
        }

        if (user.password !== password) {
          return { ok: false, error: "auth.err.wrong_password" };
        }

        set({
          email: normalized,
          isAdmin: false,
          oauthProvider: null,
          users: upsertRegisteredUser(get().users, normalized, { password }),
        });
        trackUserLogin(normalized, "email");
        return { ok: true };
      },
      loginAdmin: (email, password) => {
        const normalized = normalizeEmail(email);

        if (!normalized || !password) {
          return { ok: false, error: "auth.err.missing_credentials" };
        }

        if (normalized === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          set({
            email: ADMIN_EMAIL,
            isAdmin: true,
            oauthProvider: null,
          });
          return { ok: true };
        }

        return { ok: false, error: "auth.err.access_denied" };
      },
      register: (email, password) => {
        const normalized = normalizeEmail(email);

        if (!normalized || !password) {
          return { ok: false, error: "auth.err.missing_credentials" };
        }

        if (!isValidEmail(normalized)) {
          return { ok: false, error: "auth.err.invalid_email" };
        }

        if (password.length < 6) {
          return { ok: false, error: "auth.err.password_too_short" };
        }

        if (normalized === ADMIN_EMAIL) {
          return { ok: false, error: "auth.err.email_cannot_register" };
        }

        const existing = findRegisteredUser(get().users, normalized);
        if (existing?.password) {
          return { ok: false, error: "auth.err.email_already_registered" };
        }

        if (existing && isOAuthOnlyUser(existing)) {
          set({
            users: upsertRegisteredUser(get().users, normalized, {
              password,
              oauthProvider: existing.oauthProvider,
            }),
            email: normalized,
            isAdmin: false,
            oauthProvider: existing.oauthProvider,
          });
          trackUserLogin(normalized, existing.oauthProvider ?? "email");
          return { ok: true };
        }

        set({
          users: upsertRegisteredUser(get().users, normalized, {
            password,
            oauthProvider: null,
          }),
          email: normalized,
          isAdmin: false,
          oauthProvider: null,
        });
        trackUserLogin(normalized, "email");
        return { ok: true };
      },
      resetPassword: (email, newPassword) => {
        const normalized = normalizeEmail(email);

        if (!normalized || !newPassword) {
          return { ok: false, error: "auth.err.missing_credentials" };
        }

        if (!isValidEmail(normalized)) {
          return { ok: false, error: "auth.err.invalid_email" };
        }

        if (newPassword.length < 6) {
          return { ok: false, error: "auth.err.password_too_short" };
        }

        if (normalized === ADMIN_EMAIL) {
          return { ok: false, error: "auth.err.use_admin_login" };
        }

        const existing = findRegisteredUser(get().users, normalized);
        if (!existing) {
          return { ok: false, error: "auth.err.user_not_found" };
        }

        set({
          users: upsertRegisteredUser(get().users, normalized, {
            password: newPassword,
            oauthProvider: existing.oauthProvider,
          }),
          email: normalized,
          isAdmin: false,
          oauthProvider: null,
        });
        trackUserLogin(normalized, "email");
        return { ok: true };
      },
      setOAuthSession: (email, provider) => {
        const normalized = normalizeEmail(email);

        if (!normalized || !isValidEmail(normalized)) {
          return { ok: false, error: "auth.err.oauth_invalid_email" };
        }

        if (normalized === ADMIN_EMAIL) {
          return {
            ok: false,
            error: "auth.err.oauth_admin_password",
          };
        }

        set({
          email: normalized,
          isAdmin: false,
          oauthProvider: provider,
          users: upsertRegisteredUser(get().users, normalized, { oauthProvider: provider }),
        });
        trackUserLogin(normalized, provider ?? "email");
        return { ok: true };
      },
      clearOAuthSession: () => {
        if (get().oauthProvider) {
          set({ email: null, isAdmin: false, oauthProvider: null });
        }
      },
      removeUser: (email) => {
        const normalized = normalizeEmail(email);
        set({
          users: get().users.filter((u) => u.email !== normalized),
        });
      },
      logout: () => set({ email: null, isAdmin: false, oauthProvider: null }),
      resetSession: () => set({ email: null, isAdmin: false, oauthProvider: null }),
    }),
    {
      name: "pack-smartly-auth",
      storage: createJSONStorage(() => createSafeLocalStorage()),
      partialize: (state) => ({
        email: state.email,
        isAdmin: state.isAdmin,
        oauthProvider: state.oauthProvider,
        users: state.users,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AuthState>;
        const users = (saved.users ?? [])
          .map((user) => ({
            email: normalizeEmail(user.email),
            password: user.password ?? "",
            oauthProvider: user.oauthProvider ?? null,
            registeredAt: user.registeredAt ?? Date.now(),
            lastLoginAt: user.lastLoginAt ?? user.registeredAt ?? Date.now(),
          }))
          .filter((user) => user.email !== ADMIN_EMAIL);

        const oauthProvider = saved.oauthProvider ?? null;

        return {
          ...current,
          ...saved,
          oauthProvider,
          isAdmin: Boolean(saved.isAdmin && !oauthProvider),
          users,
        };
      },
    },
  ),
);
