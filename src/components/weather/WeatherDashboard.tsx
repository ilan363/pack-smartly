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
import { formatUpdatedAt, wmoToWeather } from "@/lib/weather/codes";
import { MetricCard } from "./MetricCard";
import { WindChart } from "./WindChart";
import { WaveChart } from "./WaveChart";
import { HourlyForecastTable } from "./HourlyForecastTable";
import { DailyForecastCards } from "./DailyForecastCards";
import { WeatherIcon } from "./WeatherIcon";
import { useI18n } from "@/hooks/use-i18n";

type Props = { data: WeatherForecastResponse };

export function WeatherDashboard({ data }: Props) {
  const { t, locale } = useI18n();
  const { spot, current, daily, hourly, provider, fetchedAt } = data;
  const currentCode = current.weatherCode ?? daily[0]?.weatherCode ?? 2;
  const { label: currentConditions, icon: currentIcon } = wmoToWeather(currentCode, locale);

  const dailyCards = daily.map((d) => {
    const { icon, label } = wmoToWeather(d.weatherCode ?? 2, locale);
    return {
      date: d.date,
      tempMin: d.tempMin,
      tempMax: d.tempMax,
      conditions: d.conditions ?? label,
      icon,
      precipitation: d.precipitation,
      windMax: d.windMax,
    };
  });

  return (
    <div className="space-y-4">
      {/* Hero — condición actual */}
      <Card className="p-5 md:p-6 border-border/80 bg-gradient-to-br from-sky-500/5 via-background to-background">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <WeatherIcon icon={currentIcon} size="xl" />
            <div>
              <p className="text-sm text-muted-foreground capitalize">{currentConditions}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-4xl md:text-5xl font-semibold tabular-nums tracking-tight">
                  {Math.round(current.temperature)}°
                </span>
                <span className="text-muted-foreground text-sm">C</span>
              </div>
              <h2 className="text-lg font-semibold mt-1 truncate">{spot.name}</h2>
              <p className="text-xs text-muted-foreground">
                {spot.country ?? ""}
                {spot.timezone ? ` · ${spot.timezone}` : ""}
              </p>
            </div>
          </div>

          <div className="sm:ml-auto flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Stat icon={Wind} label={t("weather.wind")} value={`${current.windSpeed} km/h`} />
            <Stat icon={Droplets} label={t("weather.rain")} value={`${current.precipitation} mm`} />
            {current.waveHeight != null && (
              <Stat icon={Waves} label={t("weather.waves")} value={`${current.waveHeight} m`} />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/60">
          <Badge variant="outline" className="text-[10px] font-normal capitalize">
            {provider}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{formatUpdatedAt(fetchedAt, locale)}</span>
        </div>
      </Card>

      {/* Pronóstico diario — minimalista */}
      <Card className="p-4 md:p-5 border-border/80">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold">{t("weather.nextDays")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("weather.tempRainWindByDate")}
            </p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {t("assistant.weatherDays", { days: daily.length })}
          </span>
        </div>
        <DailyForecastCards days={dailyCards} locale={locale} />
      </Card>

      {/* Detalle — colapsable */}
      <MetricsSection current={current} conditions={currentConditions} />

      <ChartSection title={t("weather.windGusts24h")}>
        <WindChart hourly={hourly} locale={locale} />
      </ChartSection>

      <ChartSection title={t("weather.waves24h")}>
        <WaveChart hourly={hourly} locale={locale} />
      </ChartSection>

      <ChartSection title={t("weather.hourly")}>
        <HourlyForecastTable hourly={hourly} hours={24} locale={locale} />
      </ChartSection>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
      <span className="text-foreground/80">{value}</span>
      <span className="text-[11px]">{label}</span>
    </span>
  );
}

function MetricsSection({
  current,
  conditions,
}: {
  current: WeatherForecastResponse["current"];
  conditions: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden border-border/80">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2 text-left">
              <Gauge className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">{t("weather.detailsNow")}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                · {t("weather.conditionsGusts", { conditions, gust: current.windGust })}
              </span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform shrink-0", open && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4 pt-0">
            <MetricCard icon={Thermometer} label={t("weather.temperature")} value={current.temperature} unit="°C" tone="primary" />
            <MetricCard icon={Wind} label={t("weather.wind")} value={current.windSpeed} unit="km/h" tone="info" />
            <MetricCard icon={Wind} label={t("weather.gusts")} value={current.windGust} unit="km/h" tone="warning" />
            <MetricCard
              icon={Navigation}
              label={t("weather.direction")}
              value={degToCompass(current.windDirection)}
              hint={`${current.windDirection}°`}
            />
            <MetricCard icon={Droplets} label={t("weather.precipitation")} value={current.precipitation} unit="mm" tone="info" />
            <MetricCard
              icon={Waves}
              label={t("weather.waveHeight")}
              value={current.waveHeight != null ? current.waveHeight : "—"}
              unit={current.waveHeight != null ? "m" : ""}
              tone="info"
            />
            <MetricCard
              icon={Timer}
              label={t("weather.wavePeriod")}
              value={current.wavePeriod != null ? current.wavePeriod : "—"}
              unit={current.wavePeriod != null ? "s" : ""}
            />
            <MetricCard
              icon={Navigation}
              label={t("weather.waveDirection")}
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
      <Card className="overflow-hidden border-border/80">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-4 py-3 h-auto rounded-none text-sm">
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
