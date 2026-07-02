import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, CloudSun, AlertCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";
import { fetchWeather } from "@/lib/weather/client";

export const Route = createFileRoute("/_layout/weather")({
  component: WeatherPage,
});

const PRESETS = [
  "Mar del Plata",
  "Punta del Este",
  "Barcelona",
  "Tarifa, España",
  "Florianópolis",
  "Bariloche",
];

function WeatherPage() {
  const [query, setQuery] = useState("Mar del Plata");
  const [active, setActive] = useState("Mar del Plata");

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["weather", active],
    queryFn: ({ signal }) => fetchWeather({ query: active, days: 7, signal }),
    enabled: !!active,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CloudSun className="h-7 w-7 text-primary" />
            Clima del viaje
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pronóstico actualizado por destino: temperatura, lluvia, viento y olas.
          </p>
        </div>
      </div>

      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = query.trim();
            if (q) setActive(q);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscá un destino: Mar del Plata, Tarifa, Maui..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={120}
            />
          </div>
          <Button type="submit" disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {PRESETS.map((p) => (
            <Button
              key={p}
              variant={p === active ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setQuery(p);
                setActive(p);
              }}
              className="h-7 text-xs"
            >
              <MapPin className="h-3 w-3 mr-1" />
              {p}
            </Button>
          ))}
        </div>
      </Card>

      {isFetching && !data && (
        <Card className="p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Buscando pronóstico para "{active}"...</span>
        </Card>
      )}

      {error && (
        <Card className="p-6 border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">No pude traer el clima</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </Card>
      )}

      {data && <WeatherDashboard data={data} />}
    </div>
  );
}
