import {
  GithubAuthProvider,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthError,
  type User,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

export type OAuthProviderId = "google" | "github";

export const OAUTH_PROVIDERS: { id: OAuthProviderId; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
];

export type OAuthSignInResult =
  | { ok: true; via: "popup"; credential: UserCredential }
  | { ok: true; via: "redirect" }
  | { ok: false; error: string };

function createProvider(providerId: OAuthProviderId) {
  if (providerId === "google") {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  if (providerId === "github") {
    const provider = new GithubAuthProvider();
    provider.addScope("user:email");
    return provider;
  }

  return null;
}

function getAuthErrorCode(error: unknown): string {
  if (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as AuthError).code === "string"
  ) {
    return (error as AuthError).code;
  }
  return "";
}

/**
 * Prefer popup: redirect auth breaks on Chrome/Safari when authDomain
 * (*.firebaseapp.com) differs from the app host (Vercel, localhost, etc.).
 * Falls back to redirect only if the popup is blocked.
 */
export async function signInWithOAuthProvider(
  providerId: OAuthProviderId,
): Promise<OAuthSignInResult> {
  const provider = createProvider(providerId);

  if (!provider) {
    return { ok: false, error: "Proveedor no soportado" };
  }

  try {
    const credential = await signInWithPopup(auth, provider);
    return { ok: true, via: "popup", credential };
  } catch (error) {
    const code = getAuthErrorCode(error);

    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return { ok: false, error: "Inicio de sesión cancelado" };
    }

    if (code === "auth/popup-blocked") {
      try {
        await signInWithRedirect(auth, provider);
        return { ok: true, via: "redirect" };
      } catch (redirectError) {
        return { ok: false, error: mapOAuthError(redirectError) };
      }
    }

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
  const code = getAuthErrorCode(error);
  const message =
    error instanceof Error ? error.message : "Error de autenticación";
  const lower = `${code} ${message}`.toLowerCase();

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    lower.includes("cancel") ||
    lower.includes("denied") ||
    lower.includes("closed")
  ) {
    return "Inicio de sesión cancelado";
  }

  if (code === "auth/popup-blocked" || (lower.includes("popup") && lower.includes("block"))) {
    return "El navegador bloqueó la ventana de inicio de sesión";
  }

  if (
    code === "auth/network-request-failed" ||
    lower.includes("network") ||
    lower.includes("fetch")
  ) {
    return "Error de conexión. Verificá tu internet e intentá de nuevo";
  }

  if (code === "auth/unauthorized-domain" || lower.includes("unauthorized-domain")) {
    return "Este dominio no está autorizado en Firebase Authentication.";
  }

  if (code === "auth/operation-not-allowed" || lower.includes("operation-not-allowed")) {
    return "Este proveedor no está habilitado en Firebase Authentication.";
  }

  if (code === "auth/account-exists-with-different-credential") {
    return "Ya existe una cuenta con este email usando otro método de acceso.";
  }

  return message;
}
