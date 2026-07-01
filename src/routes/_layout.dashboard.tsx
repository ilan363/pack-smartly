import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Calendar, MapPin, BaggageClaim, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuitcasesStore, totalWeight } from "@/lib/suitcases-store";
import { AuthDialog } from "@/components/AuthDialog";
import { useAuthStore } from "@/lib/auth-store";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_layout/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const suitcases = useSuitcasesStore((s) => s.suitcases);
  const setActive = useSuitcasesStore((s) => s.setActive);
  const authedEmail = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const [loginOpen, setLoginOpen] = useState(false);

  const totalItems = suitcases.reduce(
    (acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0),
    0,
  );
  const destinations = Array.from(new Set(suitcases.map((s) => s.destination))).filter(Boolean);
  const upcomingDestination = destinations[0] ?? "Sin viaje próximo";

  const goToSuitcases = (id?: string) => {
    if (id) setActive(id);
    navigate({ to: "/suitcases" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-muted-foreground mt-1">
            Aquí está el resumen de tus próximos viajes y equipajes.
          </p>
        </div>
        {authedEmail ? (
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{authedEmail}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); toast.success("Sesión cerrada"); }}>
              <LogOut className="h-4 w-4 mr-1" /> Salir
            </Button>
          </div>
        ) : (
          <Button onClick={() => setLoginOpen(true)} variant="outline">
            <LogIn className="h-4 w-4 mr-2" />
            Iniciar sesión
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Viajes</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{destinations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valijas Activas</CardTitle>
            <BaggageClaim className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suitcases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prendas Empacadas</CardTitle>
            <span className="h-4 w-4 text-muted-foreground text-xs font-bold flex items-center justify-center">
              #
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold tracking-tight mt-8">Tu próximo viaje</h2>

      <Card className="overflow-hidden">
        <div className="bg-primary/5 border-b border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{upcomingDestination}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>{suitcases.length} valija(s) preparada(s)</span>
              </div>
            </div>
          </div>
          <Button onClick={() => goToSuitcases()}>Administrar Valijas</Button>
        </div>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <BaggageClaim className="h-4 w-4" /> Equipaje
              </h4>
              {suitcases.length === 0 && (
                <div className="p-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                  Aún no tenés valijas. Creá una desde "Mis Valijas".
                </div>
              )}
              {suitcases.map((s) => {
                const w = totalWeight(s.items);
                const pct = (w / s.maxWeight) * 100;
                const color =
                  pct > 90 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-primary";
                const textColor =
                  pct > 90
                    ? "text-red-500"
                    : pct > 75
                      ? "text-yellow-600 dark:text-yellow-500"
                      : "";
                return (
                  <button
                    key={s.id}
                    onClick={() => goToSuitcases(s.id)}
                    className="w-full text-left p-4 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex justify-between items-end mb-2">
                      <span className="font-medium">
                        {s.name}{" "}
                        <span className="text-muted-foreground text-xs capitalize">
                          ({s.type})
                        </span>
                      </span>
                      <span className={`text-sm font-medium ${textColor}`}>
                        {w.toFixed(1)} / {s.maxWeight} kg
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${color}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">Recomendaciones IA</h4>
              <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2 border border-border">
                <p>
                  🌤️ <strong>Clima esperado:</strong> Frío (2°C a -5°C). Posibles nevadas.
                </p>
                <p>
                  💡 <strong>Tip:</strong> Te falta empacar "Guantes impermeables" y tenés
                  exceso de "Remeras de algodón".
                </p>
                <Button
                  variant="link"
                  className="px-0 h-auto text-primary"
                  onClick={() => navigate({ to: "/assistant" })}
                >
                  Ver lista completa sugerida →
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AuthDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onAdminSuccess={() => navigate({ to: "/admin" })}
      />
    </div>
  );
}
