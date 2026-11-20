import type { User } from "firebase/auth";
import { ADMIN_EMAIL, useAuthStore } from "@/lib/auth-store";
import {
  resolveOAuthProviderFromUser,
  signOutFirebase,
  type OAuthProviderId,
} from "@/lib/oauth";
import { syncUserToRegistry } from "@/lib/user-registry";

export type FinalizeOAuthResult =
  | {
      ok: true;
      email: string;
      provider: OAuthProviderId | null;
      synced: boolean;
    }
  | { ok: false; reason: "missing_email" | "admin_oauth" };

/** Completa sesión OAuth: valida admin, sincroniza Firestore y actualiza el store. */
export async function finalizeOAuthLogin(
  user: User,
): Promise<FinalizeOAuthResult> {
  if (!user.email) {
    await signOutFirebase();
    return { ok: false, reason: "missing_email" };
  }

  if (user.email.trim().toLowerCase() === ADMIN_EMAIL) {
    await signOutFirebase();
    return { ok: false, reason: "admin_oauth" };
  }

  const provider = resolveOAuthProviderFromUser(user);
  const synced = await syncUserToRegistry(user, provider ?? "email");
  useAuthStore.getState().setFirebaseSession(user.email, provider);

  return {
    ok: true,
    email: user.email,
    provider,
    synced,
  };
}
