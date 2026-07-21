import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/hooks/use-i18n";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  parseOAuthCallbackError,
  resolveOAuthCallbackSession,
  resolveOAuthProviderFromUser,
} from "@/lib/oauth";

function hasOAuthCallbackParams(): boolean {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.has("code") || searchParams.has("error");
}

let oauthCallbackHandled = false;

/**
 * Completes Supabase OAuth when the provider redirects back with ?code= or ?error=.
 * Runs on any route so production can use "/" (nginx) instead of "/auth/callback".
 */
export function useOAuthCallbackHandler() {
  const navigate = useNavigate();
  const setOAuthSession = useAuthStore((s) => s.setOAuthSession);
  const { t, tAuthError } = useI18n();

  useEffect(() => {
    if (!hasOAuthCallbackParams()) return;
    if (oauthCallbackHandled) return;
    oauthCallbackHandled = true;

    const completeAuth = async () => {
      const callbackError = parseOAuthCallbackError();
      if (callbackError) {
        toast.error(callbackError);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      if (!isSupabaseConfigured()) {
        toast.error(t("auth.oauth.not_configured"));
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        toast.error(t("auth.oauth.failed"));
        return;
      }

      const sessionResult = await resolveOAuthCallbackSession(supabase);

      if (!sessionResult.ok) {
        toast.error(sessionResult.error);
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const email = sessionResult.session.user.email!;
      const provider = resolveOAuthProviderFromUser(sessionResult.session.user);
      const result = setOAuthSession(email, provider);

      if (!result.ok) {
        await supabase.auth.signOut();
        toast.error(tAuthError(result.error));
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      window.history.replaceState({}, "", "/dashboard");
      toast.success(t("auth.oauth.success"), { description: email });
      navigate({ to: "/dashboard" });
    };

    void completeAuth();
  }, [navigate, setOAuthSession, t, tAuthError]);
}
