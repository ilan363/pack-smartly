import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BaggageClaim,
  Home,
  Bot,
  LogOut,
  ListChecks,
  CloudSun,
  ShieldCheck,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { logoutWithOAuth } from "@/hooks/use-supabase-auth-sync";
import { resetAppState } from "@/lib/reset-app";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const navigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Asistente IA", href: "/assistant", icon: Bot },
  { name: "Clima", href: "/weather", icon: CloudSun },
  { name: "Listas", href: "/checklists", icon: ListChecks },
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

  const items = isAdmin
    ? [...navigation, { name: "Administración", href: "/admin", icon: ShieldCheck }]
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
          return (
            <Link key={item.name} to={item.href} onClick={onNavigate}>
              <span
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
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
              toast.success("Todo reiniciado", {
                description: "Valijas, listas y conversación volvieron al estado inicial.",
              });
              navigate({ to: "/dashboard" });
            })
          }
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
          Reiniciar todo
        </button>
        <button
          type="button"
          onClick={() =>
            closeAndRun(() => {
              void logoutWithOAuth();
              toast.success("Sesión cerrada");
              navigate({ to: "/" });
            })
          }
          className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Salir
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-64 flex-col p-0 sm:max-w-xs">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <SidebarBrand />
        <SidebarContent onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
