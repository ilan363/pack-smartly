import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  IconLuggage,
  IconBot,
  IconCloudSun,
  IconListChecks,
  IconMessageCircle,
  IconShieldCheck,
  IconRefreshCw,
  IconLogOut,
  IconBaggageClaim,
} from "@/components/ui/icons";
import { useAuthStore } from "@/lib/auth-store";
import { logoutWithOAuth } from "@/hooks/use-supabase-auth-sync";
import { resetAppState } from "@/lib/reset-app";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import type { TranslationKey } from "@/lib/i18n/translations";

const navigation: {
  nameKey: TranslationKey;
  shortNameKey: TranslationKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { nameKey: "nav.dashboard", shortNameKey: "nav.dashboardShort", href: "/dashboard", icon: IconLuggage },
  { nameKey: "nav.assistant", shortNameKey: "nav.assistantShort", href: "/assistant", icon: IconBot },
  { nameKey: "nav.weather", shortNameKey: "nav.weatherShort", href: "/weather", icon: IconCloudSun },
  { nameKey: "nav.checklists", shortNameKey: "nav.checklistsShort", href: "/checklists", icon: IconListChecks },
  { nameKey: "nav.contact", shortNameKey: "nav.contactShort", href: "/contact", icon: IconMessageCircle },
];

function SidebarBrand() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-subtle">
        <IconBaggageClaim className="h-4 w-4" />
      </div>
      <span className="text-sm font-semibold tracking-tight text-foreground">Travel Wolf</span>
    </div>
  );
}

type SidebarContentProps = {
  onNavigate?: () => void;
};

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(useAuthStore((s) => s.email));
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { t } = useI18n();

  const items = !isLoggedIn
    ? []
    : isAdmin
      ? [
          ...navigation,
          {
            nameKey: "nav.admin" as const,
            shortNameKey: "nav.adminShort" as const,
            href: "/admin",
            icon: IconShieldCheck,
          },
        ]
      : navigation;

  const closeAndRun = (action: () => void) => {
    action();
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const name = t(item.nameKey);
          return (
            <Link key={item.href} to={item.href} onClick={onNavigate}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer select-none",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-subtle"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {name}
              </span>
            </Link>
          );
        })}
      </nav>

      {isLoggedIn ? (
        <div className="shrink-0 border-t border-border/70 p-3 space-y-1">
          <button
            type="button"
            onClick={() =>
              closeAndRun(() => {
                resetAppState();
                toast.success(t("nav.resetSuccess"), {
                  description: t("nav.resetDescription"),
                });
                navigate({ to: "/dashboard" });
              })
            }
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <IconRefreshCw className="h-4 w-4" />
            {t("nav.resetAll")}
          </button>
          <button
            type="button"
            onClick={() =>
              closeAndRun(() => {
                void logoutWithOAuth();
                toast.success(t("nav.logoutSuccess"));
                navigate({ to: "/" });
              })
            }
            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <IconLogOut className="h-4 w-4" />
            {t("nav.signOut")}
          </button>
        </div>
      ) : null}
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden h-svh w-60 shrink-0 flex-col border-r border-border/70 bg-card md:flex">
      <SidebarBrand />
      <SidebarContent />
    </aside>
  );
}

type MobileAppSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileAppSidebar({ open, onOpenChange }: MobileAppSidebarProps) {
  const { t } = useI18n();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-[min(100vw-2rem,16rem)] flex-col p-0 sm:max-w-xs border-r border-border">
        <SheetTitle className="sr-only">{t("nav.menuTitle")}</SheetTitle>
        <SidebarBrand />
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const isLoggedIn = Boolean(useAuthStore((s) => s.email));
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { t } = useI18n();

  if (!isLoggedIn) return null;

  const items = isAdmin
    ? [
        ...navigation,
        {
          nameKey: "nav.admin" as const,
          shortNameKey: "nav.adminShort" as const,
          href: "/admin",
          icon: IconShieldCheck,
        },
      ]
    : navigation;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 md:hidden"
      aria-label={t("nav.main")}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 text-[11px] font-medium transition-colors",
                isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.25px]")} />
              <span className="truncate w-full text-center">{t(item.shortNameKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
