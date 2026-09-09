import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BaggageClaim, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { AppSidebar, MobileAppSidebar, MobileBottomNav } from "@/components/AppSidebar";
import { useI18n } from "@/hooks/use-i18n";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { useChatStore } from "@/lib/chat-store";
import { useAuthStore } from "@/lib/auth-store";

export const Route = createFileRoute("/_layout")({
  component: AppLayout,
});

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  const locale = useLocaleStore((s) => s.locale);
  const syncWelcomeLocale = useChatStore((s) => s.syncWelcomeLocale);
  const isLoggedIn = Boolean(useAuthStore((s) => s.email));

  useEffect(() => {
    syncWelcomeLocale();
  }, [locale, syncWelcomeLocale]);

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      {isLoggedIn ? <AppSidebar /> : null}
      {isLoggedIn ? (
        <MobileAppSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:hidden">
          <div className="flex items-center gap-2">
            <BaggageClaim className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">Travel Wolf</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("nav.openMenu")}
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </header>

        <div className="hidden h-14 shrink-0 items-center justify-end border-b border-border bg-background px-6 md:flex">
          <LanguageSwitcher />
        </div>

        <main
          className={`min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-8 ${
            isLoggedIn ? "pb-20 md:pb-8" : "pb-4 md:pb-8"
          }`}
        >
          <Outlet />
        </main>
        {isLoggedIn ? <MobileBottomNav /> : null}
      </div>
    </div>
  );
}
