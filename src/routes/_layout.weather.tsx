import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, CloudSun, AlertCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";
import { fetchWeather, searchWeatherPlaces } from "@/lib/weather/client";
import type { GeocodePlace } from "@/lib/weather/geocode";

export const Route = createFileRoute("/_layout/weather")({
  component: WeatherPage,
});

const SUGGESTIONS = [
  "Miami",
  "Buenos Aires",
  "Barcelona",
  "Madrid",
  "Ciudad de México",
  "Río de Janeiro",
];

function WeatherPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("");
  const [candidates, setCandidates] = useState<GeocodePlace[]>([]);
  const [pickedPlace, setPickedPlace] = useState<GeocodePlace | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const applyPlace = (place: GeocodePlace) => {
    setPickedPlace(place);
    setActive(place.name);
    setQuery(place.name);
    setCandidates([]);
  };

  const runPlaceSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setQuery(q);
    setIsResolving(true);
    setCandidates([]);
    try {
      const places = await searchWeatherPlaces(q, 5);
      if (places.length === 1) {
        applyPlace(places[0]);
        return;
      }
      if (places.length > 1) {
        setCandidates(places);
        setActive("");
        setPickedPlace(null);
        return;
      }
      setPickedPlace(null);
      setActive(q);
    } finally {
      setIsResolving(false);
    }
  };

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["weather", active, pickedPlace?.id ?? null],
    queryFn: ({ signal }) =>
      pickedPlace
        ? fetchWeather({
            query: pickedPlace.name,
            lat: pickedPlace.latitude,
            lon: pickedPlace.longitude,
            days: 7,
            signal,
          })
        : fetchWeather({ query: active, days: 7, signal }),
    enabled: !!active,
    staleTime: 1000 * 60 * 10,
    retry: 0,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await runPlaceSearch(query);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CloudSun className="h-7 w-7 text-primary" />
            Clima del viaje
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Buscá por ciudad o barrio. Cada lugar tiene su propio clima (Miami, Buenos Aires, Bariloche…).
          </p>
        </div>
      </div>

      <Card className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Ciudad o lugar: Miami, Buenos Aires, Barcelona, Mar del Plata…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={120}
            />
          </div>
          <Button type="submit" disabled={isFetching || isResolving || !query.trim()}>
            {isFetching || isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        {candidates.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">Elegí la ciudad correcta:</p>
            <div className="flex flex-wrap gap-2">
              {candidates.map((place) => (
                <Button
                  key={place.id}
                  variant="secondary"
                  size="sm"
                  className="h-auto py-1.5 text-xs text-left"
                  onClick={() => applyPlace(place)}
                >
                  <MapPin className="h-3 w-3 mr-1 shrink-0" />
                  {place.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[11px] text-muted-foreground self-center mr-1">Ejemplos:</span>
          {SUGGESTIONS.map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => void runPlaceSearch(p)}
              className="h-7 text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
      </Card>

      {!active && !isFetching && !isResolving && !data && candidates.length === 0 && (
        <Card className="p-10 flex flex-col items-center gap-3 text-center text-muted-foreground border-dashed">
          <CloudSun className="h-10 w-10 text-primary/40" />
          <div>
            <p className="font-medium text-foreground">Buscá una ciudad</p>
            <p className="text-sm mt-1 max-w-md">
              Escribí el nombre de la ciudad donde vas a estar. Podés agregar el país para afinar,
              por ejemplo <span className="text-foreground">Barcelona, España</span>.
            </p>
          </div>
        </Card>
      )}

      {(isFetching || isResolving) && !data && active && (
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
