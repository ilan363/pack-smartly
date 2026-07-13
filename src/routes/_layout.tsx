import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BaggageClaim, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { AppSidebar, MobileAppSidebar, MobileBottomNav } from "@/components/AppSidebar";
import { useI18n } from "@/hooks/use-i18n";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { useChatStore } from "@/lib/chat-store";

export const Route = createFileRoute("/_layout")({
  component: AppLayout,
});

function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  const locale = useLocaleStore((s) => s.locale);
  const syncWelcomeLocale = useChatStore((s) => s.syncWelcomeLocale);

  useEffect(() => {
    syncWelcomeLocale();
  }, [locale, syncWelcomeLocale]);

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar />
      <MobileAppSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:hidden">
          <div className="flex items-center gap-2">
            <BaggageClaim className="h-5 w-5" />
            <span className="font-bold">Travel Wolf</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("nav.openMenu")}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="hidden shrink-0 items-center justify-end border-b border-border bg-background px-6 py-3 md:flex">
          <LanguageSwitcher />
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-20 sm:p-6 md:p-8 md:pb-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
