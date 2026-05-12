import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Calendar, MapPin, BaggageClaim } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_layout/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
        <p className="text-muted-foreground mt-1">Aquí está el resumen de tus próximos viajes y equipajes.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Viajes</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valijas Activas</CardTitle>
            <BaggageClaim className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prendas Empacadas</CardTitle>
            <span className="h-4 w-4 text-muted-foreground text-xs font-bold flex items-center justify-center">#</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
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
              <h3 className="text-xl font-bold">Bariloche, Argentina</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>15 Jul - 22 Jul (7 días)</span>
              </div>
            </div>
          </div>
          <Button>Administrar Valijas</Button>
        </div>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <BaggageClaim className="h-4 w-4" /> Equipaje
              </h4>
              <div className="p-4 border border-border rounded-lg bg-card">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-medium">Valija Principal (Bodega)</span>
                  <span className="text-sm">18 / 23 kg</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary w-[78%]" />
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg bg-card">
                <div className="flex justify-between items-end mb-2">
                  <span className="font-medium">Mochila (Cabina)</span>
                  <span className="text-sm text-yellow-600 font-medium">9.5 / 10 kg</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[95%]" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                Recomendaciones IA
              </h4>
              <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-2 border border-border">
                <p>🌤️ <strong>Clima esperado:</strong> Frío (2°C a -5°C). Posibles nevadas.</p>
                <p>💡 <strong>Tip:</strong> Te falta empacar "Guantes impermeables" y tienes exceso de "Remeras de algodón".</p>
                <Button variant="link" className="px-0 h-auto text-primary">Ver lista completa sugerida →</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}