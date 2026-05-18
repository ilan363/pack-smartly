import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { BaggageClaim, Home, Bot, Settings, LogOut, ListChecks, CloudSun } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_layout")({
  component: AppLayout,
});

function AppLayout() {
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Asistente IA", href: "/assistant", icon: Bot },
    { name: "Clima", href: "/weather", icon: CloudSun },
    { name: "Listas", href: "/checklists", icon: ListChecks },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BaggageClaim size={18} />
          </div>
          <span className="text-lg font-bold">Travel Wolf</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link key={item.name} to={item.href}>
                <span className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer rounded-md hover:bg-muted transition-colors">
            <Settings className="h-4 w-4" />
            Configuración
          </div>
          <Link to="/">
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 cursor-pointer rounded-md transition-colors mt-1">
              <LogOut className="h-4 w-4" />
              Salir
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background flex items-center px-6 md:hidden">
          <div className="flex items-center gap-2">
            <BaggageClaim className="h-5 w-5" />
            <span className="font-bold">Travel Wolf</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}