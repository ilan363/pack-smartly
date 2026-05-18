import { useState } from "react";
import {
  Thermometer, Wind, Waves, Droplets, Navigation, Gauge, Timer, ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { degToCompass, type WeatherForecastResponse } from "@/lib/weather/types";
import { MetricCard } from "./MetricCard";
import { WindChart } from "./WindChart";
import { WaveChart } from "./WaveChart";
import { HourlyForecastTable } from "./HourlyForecastTable";

type Props = { data: WeatherForecastResponse };

export function WeatherDashboard({ data }: Props) {
  const { spot, current, daily, hourly, provider, fetchedAt } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{spot.name}</h2>
            <p className="text-sm text-muted-foreground">
              {spot.country ?? ""}{spot.timezone ? ` · ${spot.timezone}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="capitalize">{provider}</Badge>
            <span className="text-[10px] text-muted-foreground">
              {new Date(fetchedAt).toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </Card>

      {/* Métricas — colapsable */}
      <MetricsSection current={current} />

      {/* Gráficos — colapsable */}
      <ChartSection title="Viento y ráfagas (24h)" defaultOpen>
        <WindChart hourly={hourly} />
      </ChartSection>

      <ChartSection title="Olas (24h)">
        <WaveChart hourly={hourly} />
      </ChartSection>

      {/* Tabla horaria — colapsable */}
      <ChartSection title="Pronóstico horario detallado">
        <HourlyForecastTable hourly={hourly} hours={24} />
      </ChartSection>

      {/* Resumen diario */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
          Próximos días
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {daily.map((d) => {
            const date = new Date(d.date);
            return (
              <div key={d.date} className="border border-border rounded-lg p-3 text-center bg-background">
                <div className="text-xs font-semibold text-muted-foreground">
                  {date.toLocaleDateString("es-AR", { weekday: "short" })}
                </div>
                <div className="text-xs text-muted-foreground mb-1">
                  {date.getDate()}/{date.getMonth() + 1}
                </div>
                <div className="text-lg font-bold tabular-nums">
                  {d.tempMax}° <span className="text-muted-foreground text-sm font-medium">{d.tempMin}°</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                  <span><Wind className="inline h-3 w-3" /> {d.windMax} · ráf {d.gustMax}</span>
                  <span><Droplets className="inline h-3 w-3" /> {d.precipitation} mm</span>
                  {d.waveMax != null && <span><Waves className="inline h-3 w-3" /> {d.waveMax} m</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function MetricsSection({ current }: { current: WeatherForecastResponse["current"] }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="font-semibold">Condiciones actuales</span>
              <span className="text-xs text-muted-foreground">
                · {current.temperature}°C · viento {current.windSpeed} km/h
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 pt-0">
            <MetricCard icon={Thermometer} label="Temperatura" value={current.temperature} unit="°C" tone="primary" />
            <MetricCard icon={Wind} label="Viento" value={current.windSpeed} unit="km/h" tone="info" />
            <MetricCard icon={Wind} label="Ráfagas" value={current.windGust} unit="km/h" tone="warning" />
            <MetricCard
              icon={Navigation}
              label="Dirección"
              value={degToCompass(current.windDirection)}
              hint={`${current.windDirection}°`}
            />
            <MetricCard icon={Droplets} label="Precipitación" value={current.precipitation} unit="mm" tone="info" />
            <MetricCard
              icon={Waves}
              label="Altura ola"
              value={current.waveHeight != null ? current.waveHeight : "—"}
              unit={current.waveHeight != null ? "m" : ""}
              tone="info"
            />
            <MetricCard
              icon={Timer}
              label="Período ola"
              value={current.wavePeriod != null ? current.wavePeriod : "—"}
              unit={current.wavePeriod != null ? "s" : ""}
            />
            <MetricCard
              icon={Navigation}
              label="Dirección ola"
              value={current.waveDirection != null ? degToCompass(current.waveDirection) : "—"}
              hint={current.waveDirection != null ? `${current.waveDirection}°` : undefined}
            />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ChartSection({
  title, children, defaultOpen = false,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto rounded-none">
            <span className="font-semibold">{title}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
