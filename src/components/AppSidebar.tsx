import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BaggageClaim,
  Home,
  Bot,
  LogOut,
  ListChecks,
  CloudSun,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const navigation: { name: string; href: string; icon: LucideIcon }[] = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Asistente IA", href: "/assistant", icon: Bot },
    { name: "Clima", href: "/weather", icon: CloudSun },
    { name: "Listas", href: "/checklists", icon: ListChecks },
    ...(isAdmin
      ? [{ name: "Administración", href: "/admin", icon: ShieldCheck }]
      : []),
  ];

  return (
    <aside className="hidden h-svh w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BaggageClaim size={18} />
        </div>
        <span className="text-lg font-bold">Travel Wolf</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
        {navigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link key={item.name} to={item.href}>
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
          onClick={() => {
            logout();
            toast.success("Sesión cerrada");
            navigate({ to: "/" });
          }}
          className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </div>
    </aside>
  );
}
