import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BaggageClaim,
  Home,
  Bot,
  LogOut,
  ListChecks,
  CloudSun,
  MessageCircle,
  ShieldCheck,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
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
  icon: LucideIcon;
}[] = [
  { nameKey: "nav.dashboard", shortNameKey: "nav.dashboardShort", href: "/dashboard", icon: Home },
  { nameKey: "nav.assistant", shortNameKey: "nav.assistantShort", href: "/assistant", icon: Bot },
  { nameKey: "nav.weather", shortNameKey: "nav.weatherShort", href: "/weather", icon: CloudSun },
  { nameKey: "nav.checklists", shortNameKey: "nav.checklistsShort", href: "/checklists", icon: ListChecks },
  { nameKey: "nav.contact", shortNameKey: "nav.contactShort", href: "/contact", icon: MessageCircle },
];

function SidebarBrand() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BaggageClaim size={18} />
      </div>
      <span className="text-lg font-bold">Travel Wolf</span>
    </div>
  );
}

type SidebarContentProps = {
  onNavigate?: () => void;
};

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { t } = useI18n();

  const items = isAdmin
    ? [
        ...navigation,
        {
          nameKey: "nav.admin" as const,
          shortNameKey: "nav.adminShort" as const,
          href: "/admin",
          icon: ShieldCheck,
        },
      ]
    : navigation;

  const closeAndRun = (action: () => void) => {
    action();
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const name = t(item.nameKey);
          return (
            <Link key={item.href} to={item.href} onClick={onNavigate}>
              <span
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border p-4">
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
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
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
          className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.signOut")}
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
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
      <SheetContent side="left" className="flex w-[min(100vw-2rem,16rem)] flex-col p-0 sm:max-w-xs">
        <SheetTitle className="sr-only">{t("nav.menuTitle")}</SheetTitle>
        <SidebarBrand />
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { t } = useI18n();

  const items = isAdmin
    ? [
        ...navigation,
        {
          nameKey: "nav.admin" as const,
          shortNameKey: "nav.adminShort" as const,
          href: "/admin",
          icon: ShieldCheck,
        },
      ]
    : navigation;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      aria-label={t("nav.main")}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5px]")} />
              <span className="truncate w-full text-center">{t(item.shortNameKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
