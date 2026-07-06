import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveOAuthProviderFromUser, signOutOAuth } from "@/lib/oauth";

/**
 * Keeps the Zustand session in sync with Supabase OAuth sessions across reloads.
 * Does not affect email/password sessions stored only in Zustand.
 */
export function useSupabaseAuthSync() {
  const setOAuthSession = useAuthStore((s) => s.setOAuthSession);
  const clearOAuthSession = useAuthStore((s) => s.clearOAuthSession);
  const initialSyncDone = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session?.user.email) {
        const provider = resolveOAuthProviderFromUser(session.user);
        setOAuthSession(session.user.email, provider);
        return;
      }

      if (useAuthStore.getState().oauthProvider) {
        clearOAuthSession();
      }
    };

    if (!initialSyncDone.current) {
      initialSyncDone.current = true;
      void syncSession();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user.email) {
        const provider = resolveOAuthProviderFromUser(session.user);
        setOAuthSession(session.user.email, provider);
        return;
      }

      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        if (useAuthStore.getState().oauthProvider) {
          clearOAuthSession();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [clearOAuthSession, setOAuthSession]);
}

export async function logoutWithOAuth(): Promise<void> {
  const { oauthProvider, logout } = useAuthStore.getState();
  logout();
  if (oauthProvider) {
    await signOutOAuth();
  }
}
