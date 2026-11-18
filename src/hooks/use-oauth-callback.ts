import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import { ADMIN_EMAIL, useAuthStore } from "@/lib/auth-store";
import {
  mapOAuthError,
  resolveOAuthCallbackSession,
  resolveOAuthProviderFromUser,
  signOutFirebase,
} from "@/lib/oauth";
import { syncUserToRegistry } from "@/lib/user-registry";

export function useOAuthCallbackHandler() {
  const navigate = useNavigate();
  const { t, tAuthError } = useI18n();
  const setFirebaseSession = useAuthStore((state) => state.setFirebaseSession);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    void resolveOAuthCallbackSession()
      .then(async (credential) => {
        if (!credential) return;
        const user = credential.user;

        if (!user.email) {
          toast.error("No se obtuvo el correo de la cuenta.");
          return;
        }

        const provider = resolveOAuthProviderFromUser(user);
        if (user.email.trim().toLowerCase() === ADMIN_EMAIL) {
          await signOutFirebase();
          toast.error(tAuthError("auth.err.oauth_admin_password"));
          return;
        }

        const synced = await syncUserToRegistry(user, provider ?? "email");
        if (!synced) toast.warning(t("auth.registrySyncWarning"));

        setFirebaseSession(user.email, provider);
        window.history.replaceState({}, "", "/dashboard");
        toast.success(t("auth.oauth.success"), { description: user.email });
        navigate({ to: "/dashboard" });
      })
      .catch((error: unknown) => toast.error(mapOAuthError(error)));
  }, [navigate, setFirebaseSession, t, tAuthError]);
}
