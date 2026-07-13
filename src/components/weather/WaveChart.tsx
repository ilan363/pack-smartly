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
import type { Locale } from "@/lib/i18n/locale-store";
import { dateLocaleFor } from "@/lib/i18n/format";
import { useI18n } from "@/hooks/use-i18n";
import type { WeatherHour } from "@/lib/weather/types";

type Props = { hourly: WeatherHour[]; hours?: number; locale?: Locale };

export function WaveChart({ hourly, hours = 24, locale: localeProp }: Props) {
  const { t, locale: hookLocale } = useI18n();
  const locale = localeProp ?? hookLocale;
  const dateLocale = dateLocaleFor(locale);

  const heightKey = t("weather.chart.height");
  const periodKey = t("weather.chart.period");

  const data = useMemo(() => {
    return hourly.slice(0, hours).map((h) => ({
      time: new Date(h.time).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }),
      [heightKey]: h.waveHeight ?? 0,
      [periodKey]: h.wavePeriod ?? 0,
    }));
  }, [hourly, hours, dateLocale, heightKey, periodKey]);

  const hasWaves = data.some((d) => (d[heightKey] as number) > 0 || (d[periodKey] as number) > 0);
  if (!hasWaves) {
    return (
      <div className="h-56 w-full flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        {t("weather.chart.noWaves")}
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
          <Bar yAxisId="left" dataKey={heightKey} name={heightKey} fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey={periodKey} name={periodKey} stroke="hsl(280 70% 60%)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
