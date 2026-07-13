import { Droplets, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale-store";
import { formatWeatherDate } from "@/lib/weather/codes";
import { useI18n } from "@/hooks/use-i18n";
import { WeatherIcon } from "./WeatherIcon";
import type { WeatherIconKind } from "@/lib/weather/codes";

export type DailyForecastCardData = {
  date: string;
  dayNumber?: number;
  tempMin: number;
  tempMax: number;
  conditions: string;
  icon: WeatherIconKind;
  precipitation?: number;
  windMax?: number;
};

type Props = {
  days: DailyForecastCardData[];
  compact?: boolean;
  layout?: "grid" | "scroll";
  className?: string;
  locale?: Locale;
};

export function DailyForecastCards({
  days,
  compact,
  layout = "grid",
  className,
  locale: localeProp,
}: Props) {
  const cardClass = cn(
    "border border-border rounded-2xl bg-card/80",
    "flex flex-col items-center text-center transition-colors hover:bg-muted/30",
    compact ? "p-2.5 sm:p-3" : "p-3 sm:p-3.5",
  );

  if (layout === "scroll") {
    return (
      <div className={cn("min-w-0 w-full max-w-full overflow-hidden", className)}>
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory scrollbar-thin">
          {days.map((d) => (
            <article
              key={`${d.date}-${d.dayNumber ?? 0}`}
              className={cn(cardClass, "snap-start shrink-0", compact ? "min-w-[100px]" : "min-w-[116px]")}
            >
              <ForecastCardContent d={d} compact={compact} locale={localeProp} />
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        compact
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7",
        className,
      )}
    >
      {days.map((d) => (
        <article key={`${d.date}-${d.dayNumber ?? 0}`} className={cardClass}>
          <ForecastCardContent d={d} compact={compact} locale={localeProp} />
        </article>
      ))}
    </div>
  );
}

function ForecastCardContent({
  d,
  compact,
  locale: localeProp,
}: {
  d: DailyForecastCardData;
  compact?: boolean;
  locale?: Locale;
}) {
  const { t, locale: hookLocale } = useI18n();
  const locale = localeProp ?? hookLocale;

  return (
    <>
      {d.dayNumber != null && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
          {t("weather.dayNumber", { day: d.dayNumber })}
        </span>
      )}
      <span className="text-[11px] font-medium text-muted-foreground capitalize mt-0.5 leading-tight">
        {formatWeatherDate(d.date, "short", locale)}
      </span>
      <WeatherIcon icon={d.icon} size={compact ? "md" : "lg"} className="my-1.5 sm:my-2" />
      <div className="text-sm sm:text-base font-semibold tabular-nums leading-none">
        {Math.round(d.tempMax)}°
        <span className="text-muted-foreground font-normal text-xs sm:text-sm">
          {" "}
          / {Math.round(d.tempMin)}°
        </span>
      </div>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
        {d.conditions}
      </p>
      {(d.precipitation != null && d.precipitation > 0) || d.windMax != null ? (
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground w-full">
          {d.precipitation != null && d.precipitation > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Droplets className="h-3 w-3 shrink-0" />
              {d.precipitation.toFixed(1)} mm
            </span>
          )}
          {d.windMax != null && (
            <span className="inline-flex items-center gap-0.5">
              <Wind className="h-3 w-3 shrink-0" />
              {Math.round(d.windMax)} km/h
            </span>
          )}
        </div>
      ) : null}
    </>
  );
}
