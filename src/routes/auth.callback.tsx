import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { parseOAuthCallbackError, resolveOAuthProviderFromUser } from "@/lib/oauth";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const setOAuthSession = useAuthStore((s) => s.setOAuthSession);
  const { t, tAuthError } = useI18n();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const completeAuth = async () => {
      const callbackError = parseOAuthCallbackError();
      if (callbackError) {
        toast.error(callbackError);
        navigate({ to: "/" });
        return;
      }

      if (!isSupabaseConfigured()) {
        toast.error(t("auth.oauth.not_configured"));
        navigate({ to: "/" });
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        toast.error(t("auth.oauth.failed"));
        navigate({ to: "/" });
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.user.email) {
        toast.error(t("auth.oauth.failed"));
        navigate({ to: "/" });
        return;
      }

      const email = data.session.user.email;
      const provider = resolveOAuthProviderFromUser(data.session.user);
      const result = setOAuthSession(email, provider);

      if (!result.ok) {
        await supabase.auth.signOut();
        toast.error(tAuthError(result.error));
        navigate({ to: "/" });
        return;
      }

      toast.success(t("auth.oauth.success"), { description: email });
      navigate({ to: "/dashboard" });
    };

    void completeAuth();
  }, [navigate, setOAuthSession, t, tAuthError]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("auth.oauth.completing")}</p>
    </div>
  );
}
