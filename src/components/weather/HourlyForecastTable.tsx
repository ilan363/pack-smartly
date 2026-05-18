import { Wind, Droplets, Waves, Thermometer, Navigation } from "lucide-react";
import { degToCompass, type WeatherHour } from "@/lib/weather/types";

type Props = { hourly: WeatherHour[]; hours?: number };

export function HourlyForecastTable({ hourly, hours = 24 }: Props) {
  const rows = hourly.slice(0, hours);
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Hora</th>
            <th className="px-3 py-2 text-left font-semibold"><Thermometer className="inline h-3 w-3 mr-1" />Temp</th>
            <th className="px-3 py-2 text-left font-semibold"><Wind className="inline h-3 w-3 mr-1" />Viento</th>
            <th className="px-3 py-2 text-left font-semibold">Ráfagas</th>
            <th className="px-3 py-2 text-left font-semibold"><Navigation className="inline h-3 w-3 mr-1" />Dir</th>
            <th className="px-3 py-2 text-left font-semibold"><Droplets className="inline h-3 w-3 mr-1" />Lluvia</th>
            <th className="px-3 py-2 text-left font-semibold"><Waves className="inline h-3 w-3 mr-1" />Olas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => {
            const d = new Date(h.time);
            const label = d.toLocaleString("es-AR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <tr key={h.time} className={i % 2 ? "bg-muted/20" : ""}>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{label}</td>
                <td className="px-3 py-2 tabular-nums">{h.temperature}°C</td>
                <td className="px-3 py-2 tabular-nums">{h.windSpeed} km/h</td>
                <td className="px-3 py-2 tabular-nums text-amber-600 dark:text-amber-400">{h.windGust} km/h</td>
                <td className="px-3 py-2 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Navigation className="h-3 w-3" style={{ transform: `rotate(${h.windDirection}deg)` }} />
                    {degToCompass(h.windDirection)}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{h.precipitation} mm</td>
                <td className="px-3 py-2 tabular-nums">
                  {h.waveHeight != null ? `${h.waveHeight} m` : "—"}
                  {h.wavePeriod != null ? ` · ${h.wavePeriod}s` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
