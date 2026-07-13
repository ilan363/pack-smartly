import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OAuthProviderIcon } from "@/components/OAuthProviderIcons";
import {
  OAUTH_PROVIDERS,
  signInWithOAuthProvider,
  type OAuthProviderId,
} from "@/lib/oauth";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";

export function OAuthButtons() {
  const { t } = useI18n();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProviderId | null>(null);

  const handleOAuth = async (providerId: OAuthProviderId) => {
    setLoadingProvider(providerId);

    try {
      const result = await signInWithOAuthProvider(providerId);
      if (!result.ok) {
        toast.error(result.error);
        setLoadingProvider(null);
      }
      // On success the browser redirects to the provider; keep loading state.
    } catch {
      toast.error(t("auth.oauthFailed"));
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
          {t("auth.oauthContinue")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OAUTH_PROVIDERS.map((provider) => {
          const isLoading = loadingProvider === provider.id;
          const isDisabled = loadingProvider !== null;

          return (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              className="h-10 w-full justify-start gap-3 border-border bg-background px-3 font-normal shadow-sm transition-colors hover:bg-muted/50"
              disabled={isDisabled}
              onClick={() => handleOAuth(provider.id)}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <OAuthProviderIcon provider={provider.id} className="h-5 w-5 shrink-0" />
              )}
              <span className="truncate">{provider.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
