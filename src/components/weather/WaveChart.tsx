import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { WeatherHour } from "@/lib/weather/types";

type Props = { hourly: WeatherHour[]; hours?: number };

export function WaveChart({ hourly, hours = 24 }: Props) {
  const data = useMemo(() => {
    return hourly.slice(0, hours).map((h) => ({
      time: new Date(h.time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      altura: h.waveHeight ?? 0,
      periodo: h.wavePeriod ?? 0,
    }));
  }, [hourly, hours]);

  const hasWaves = data.some((d) => d.altura > 0 || d.periodo > 0);
  if (!hasWaves) {
    return (
      <div className="h-56 w-full flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sin datos de olas para este punto (probablemente tierra adentro).
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} unit=" m" width={48} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} unit=" s" width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="altura" name="Altura (m)" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="periodo" name="Período (s)" stroke="hsl(280 70% 60%)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
