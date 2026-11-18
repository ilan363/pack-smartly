import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

export type OAuthProviderId = "google" | "github";

export const OAUTH_PROVIDERS: { id: OAuthProviderId; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

export type OAuthSignInResult = { ok: true } | { ok: false; error: string };

export async function signInWithOAuthProvider(
  providerId: OAuthProviderId,
): Promise<OAuthSignInResult> {
  const provider =
    providerId === "google"
      ? new GoogleAuthProvider()
      : providerId === "github"
        ? new GithubAuthProvider()
        : null;

  if (!provider) {
    return { ok: false, error: "Proveedor no soportado" };
  }

  try {
    await signInWithRedirect(auth, provider);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapOAuthError(error) };
  }
}

export async function resolveOAuthCallbackSession() {
  return getRedirectResult(auth);
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function resolveOAuthProviderFromUser(
  user: Pick<User, "providerData">,
): OAuthProviderId | null {
  const providers: Record<string, OAuthProviderId> = {
    "google.com": "google",
    "github.com": "github",
  };
  for (const identity of user.providerData) {
    const provider = providers[identity.providerId];
    if (provider) return provider;
  }
  return null;
}

export function mapOAuthError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Error de autenticación";
  const lower = message.toLowerCase();

  if (lower.includes("cancel") || lower.includes("denied") || lower.includes("closed")) {
    return "Inicio de sesión cancelado";
  }

  if (lower.includes("popup") && lower.includes("block")) {
    return "El navegador bloqueó la ventana de inicio de sesión";
  }

  if (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("network-request-failed")
  ) {
    return "Error de conexión. Verificá tu internet e intentá de nuevo";
  }

  if (lower.includes("unauthorized-domain")) {
    return "Este dominio no está autorizado en Firebase Authentication.";
  }

  if (lower.includes("operation-not-allowed")) {
    return "Este proveedor no está habilitado en Firebase Authentication.";
  }

  return message;
}
