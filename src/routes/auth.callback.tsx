import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("auth.oauth.completing")}</p>
    </div>
  );
}
