import type { Provider } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type OAuthProviderId = "google" | "github";

export const OAUTH_PROVIDERS: {
  id: OAuthProviderId;
  label: string;
  supabaseProvider: Provider;
}[] = [
  { id: "google", label: "Google", supabaseProvider: "google" },
  { id: "github", label: "GitHub", supabaseProvider: "github" },
];

export function getOAuthRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export type OAuthSignInResult = { ok: true } | { ok: false; error: string };

async function validateSupabaseReachable(): Promise<string | null> {
  const url = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (!url) {
    return "OAuth no está configurado. Agregá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en tu archivo .env";
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    if (response.status >= 500) {
      return "No se pudo conectar con Supabase. Verificá VITE_SUPABASE_URL y que el proyecto esté activo en supabase.com.";
    }
    return null;
  } catch {
    return `No se puede acceder a Supabase (${new URL(url).hostname}). El proyecto puede haber sido eliminado o la URL en .env es incorrecta. Entrá a supabase.com → tu proyecto → Settings → API y copiá la Project URL actual.`;
  }
}

export async function signInWithOAuthProvider(
  providerId: OAuthProviderId,
): Promise<OAuthSignInResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "OAuth no está configurado. Agregá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en tu archivo .env",
    };
  }

  const reachabilityError = await validateSupabaseReachable();
  if (reachabilityError) {
    return { ok: false, error: reachabilityError };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: "No se pudo inicializar el cliente de autenticación" };
  }

  const provider = OAUTH_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) {
    return { ok: false, error: "Proveedor no soportado" };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider.supabaseProvider,
    options: {
      redirectTo: getOAuthRedirectUrl(),
    },
  });

  if (error) {
    return { ok: false, error: mapOAuthError(error.message) };
  }

  return { ok: true };
}

export async function signOutOAuth(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function parseOAuthCallbackError(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const error = searchParams.get("error") ?? hashParams.get("error");
  const description =
    searchParams.get("error_description") ?? hashParams.get("error_description");

  if (!error) return null;

  if (error === "access_denied" || description?.toLowerCase().includes("cancel")) {
    return "Inicio de sesión cancelado";
  }

  return mapOAuthError(description ?? error);
}

export function resolveOAuthProviderFromUser(user: {
  app_metadata?: { provider?: string };
  identities?: { provider?: string }[];
}): OAuthProviderId | null {
  const raw =
    user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? null;

  if (!raw) return null;

  const match = OAUTH_PROVIDERS.find((p) => p.supabaseProvider === raw || p.id === raw);
  return match?.id ?? null;
}

function mapOAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("cancel") || lower.includes("denied") || lower.includes("closed")) {
    return "Inicio de sesión cancelado";
  }

  if (lower.includes("popup") && lower.includes("block")) {
    return "El navegador bloqueó la ventana de inicio de sesión";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Error de conexión. Verificá tu internet e intentá de nuevo";
  }

  if (lower.includes("provider is not enabled")) {
    return "Este proveedor no está habilitado en Supabase. Configuralo en el panel de Authentication → Providers";
  }

  if (lower.includes("email") && lower.includes("already")) {
    return "Ya existe una cuenta con este correo. Iniciá sesión con tu contraseña o vinculá el proveedor desde tu perfil en Supabase.";
  }

  return message;
}
