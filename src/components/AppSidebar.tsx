import { Link, useLocation } from "@tanstack/react-router";
import {
  BaggageClaim,
  Home,
  Bot,
  Settings,
  LogOut,
  ListChecks,
  CloudSun,
  type LucideIcon,
} from "lucide-react";

const navigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Asistente IA", href: "/assistant", icon: Bot },
  { name: "Clima", href: "/weather", icon: CloudSun },
  { name: "Listas", href: "/checklists", icon: ListChecks },
];

export function AppSidebar() {
  const location = useLocation();

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
        <div className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Settings className="h-4 w-4" />
          Configuración
        </div>
        <Link to="/">
          <div className="mt-1 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10">
            <LogOut className="h-4 w-4" />
            Salir
          </div>
        </Link>
      </div>
    </aside>
  );
}
