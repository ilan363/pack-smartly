import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import { mapOAuthError, resolveOAuthCallbackSession } from "@/lib/oauth";
import { finalizeOAuthLogin } from "@/lib/oauth-session";

/** Handles rare redirect fallback after popup-blocked OAuth. */
export function useOAuthCallbackHandler() {
  const navigate = useNavigate();
  const { t, tAuthError } = useI18n();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void resolveOAuthCallbackSession()
      .then(async (credential) => {
        if (!credential) return;

        const result = await finalizeOAuthLogin(credential.user);
        if (!result.ok) {
          if (result.reason === "admin_oauth") {
            toast.error(tAuthError("auth.err.oauth_admin_password"));
          } else {
            toast.error(tAuthError("auth.err.oauth_invalid_email"));
          }
          return;
        }

        if (!result.synced) toast.warning(t("auth.registrySyncWarning"));
        toast.success(t("auth.oauth.success"), { description: result.email });
        navigate({ to: "/dashboard" });
      })
      .catch((error: unknown) => toast.error(mapOAuthError(error)));
  }, [navigate, t, tAuthError]);
}
