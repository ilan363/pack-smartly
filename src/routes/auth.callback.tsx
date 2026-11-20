import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const email = useAuthStore((state) => state.email);

  useEffect(() => {
    // Root already runs the OAuth redirect handler; this page is only a
    // loading shell. Leave once session resolves or after a short timeout.
    if (email) {
      navigate({ to: "/dashboard" });
      return;
    }

    const timeout = window.setTimeout(() => {
      const signedIn = Boolean(useAuthStore.getState().email);
      navigate({ to: signedIn ? "/dashboard" : "/" });
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [email, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("auth.oauth.completing")}</p>
    </div>
  );
}
