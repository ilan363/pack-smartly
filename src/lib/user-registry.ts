import type { OAuthProviderId } from "@/lib/oauth";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type RegistryAuthMethod = "email" | OAuthProviderId;

export type RegistryUser = {
  email: string;
  authMethod: RegistryAuthMethod;
  registeredAt: number;
  lastLoginAt: number;
};

type AppUserRow = {
  email: string;
  auth_method: string;
  registered_at: string;
  last_login_at: string;
};

const TABLE = "app_users";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toRegistryUser(row: AppUserRow): RegistryUser {
  const authMethod =
    row.auth_method === "google" || row.auth_method === "github"
      ? row.auth_method
      : "email";

  return {
    email: row.email,
    authMethod,
    registeredAt: new Date(row.registered_at).getTime(),
    lastLoginAt: new Date(row.last_login_at).getTime(),
  };
}

function resolveAuthMethod(
  oauthProvider: OAuthProviderId | null | undefined,
): RegistryAuthMethod {
  return oauthProvider ?? "email";
}

export async function syncUserToRegistry(
  email: string,
  authMethod: RegistryAuthMethod,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();

  const { error } = await supabase.from(TABLE).upsert(
    {
      email: normalized,
      auth_method: authMethod,
      last_login_at: now,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.warn("[user-registry] No se pudo sincronizar usuario:", error.message);
    return false;
  }

  return true;
}

async function upsertWithRetry(
  email: string,
  authMethod: RegistryAuthMethod,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (await syncUserToRegistry(email, authMethod)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

/** Registers or updates an email/password user from the website in the central registry. */
export async function syncWebEmailUser(
  email: string,
  password?: string,
  options?: { isRegistration?: boolean },
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  const normalized = normalizeEmail(email);
  let rpcOk = false;

  const { error: rpcError } = await supabase.rpc("register_web_user", {
    p_email: normalized,
  });
  if (rpcError) {
    console.warn("[user-registry] register_web_user:", rpcError.message);
  } else {
    rpcOk = true;
  }

  const upserted = await upsertWithRetry(normalized, "email");

  if (options?.isRegistration && password) {
    const { error: signUpError } = await supabase.auth.signUp({
      email: normalized,
      password,
    });
    if (
      signUpError &&
      !/already|registered|exists|duplicate/i.test(signUpError.message)
    ) {
      console.warn("[user-registry] signUp:", signUpError.message);
    }
  }

  return rpcOk || upserted;
}

/** Pulls OAuth users from Supabase Auth into app_users (server-side). */
export async function refreshRegistryFromAuth(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.rpc("refresh_app_users_from_auth");
  if (error) {
    console.warn("[user-registry] refresh_app_users_from_auth:", error.message);
    return false;
  }

  return true;
}

export async function loadAllRegistryUsers(): Promise<RegistryUser[]> {
  await refreshRegistryFromAuth();
  return fetchAllRegistryUsers();
}

export async function syncLocalUsersToRegistry(
  users: { email: string; oauthProvider: OAuthProviderId | null }[],
): Promise<void> {
  await Promise.all(
    users.map((user) =>
      syncUserToRegistry(user.email, resolveAuthMethod(user.oauthProvider)),
    ),
  );
}

export async function fetchAllRegistryUsers(): Promise<RegistryUser[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("email, auth_method, registered_at, last_login_at")
    .order("last_login_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => toRegistryUser(row as AppUserRow));
}

export async function removeUserFromRegistry(email: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("email", normalizeEmail(email));

  return !error;
}

export function isRegistryAvailable(): boolean {
  return isSupabaseConfigured();
}
