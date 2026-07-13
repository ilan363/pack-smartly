import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Locale } from "@/lib/i18n/locale-store";
import { dateLocaleFor } from "@/lib/i18n/format";
import { useI18n } from "@/hooks/use-i18n";
import type { WeatherHour } from "@/lib/weather/types";

type Props = { hourly: WeatherHour[]; hours?: number; locale?: Locale };

export function WindChart({ hourly, hours = 24, locale: localeProp }: Props) {
  const { t, locale: hookLocale } = useI18n();
  const locale = localeProp ?? hookLocale;
  const dateLocale = dateLocaleFor(locale);

  const data = useMemo(
    () =>
      hourly.slice(0, hours).map((h) => ({
        time: new Date(h.time).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }),
        [t("weather.chart.wind")]: h.windSpeed,
        [t("weather.chart.gusts")]: h.windGust,
      })),
    [hourly, hours, dateLocale, t],
  );

  const windKey = t("weather.chart.wind");
  const gustKey = t("weather.chart.gusts");

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="g-wind" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-gust" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(45 93% 58%)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(45 93% 58%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} unit=" km/h" width={56} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => `${v} km/h`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey={windKey} stroke="hsl(217 91% 60%)" fill="url(#g-wind)" strokeWidth={2} />
          <Area type="monotone" dataKey={gustKey} stroke="hsl(45 93% 58%)" fill="url(#g-gust)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
