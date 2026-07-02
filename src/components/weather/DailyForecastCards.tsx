import { Droplets, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWeatherDate } from "@/lib/weather/codes";
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
  className?: string;
};

export function DailyForecastCards({ days, compact, className }: Props) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin",
        className,
      )}
    >
      {days.map((d) => (
        <article
          key={`${d.date}-${d.dayNumber ?? 0}`}
          className={cn(
            "snap-start shrink-0 border border-border rounded-2xl bg-card/80",
            "flex flex-col items-center text-center transition-colors hover:bg-muted/30",
            compact ? "min-w-[108px] p-3" : "min-w-[124px] p-3.5",
          )}
        >
          {d.dayNumber != null && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              Día {d.dayNumber}
            </span>
          )}
          <span className="text-[11px] font-medium text-muted-foreground capitalize mt-0.5">
            {formatWeatherDate(d.date)}
          </span>
          <WeatherIcon icon={d.icon} size={compact ? "md" : "lg"} className="my-2" />
          <div className="text-base font-semibold tabular-nums leading-none">
            {Math.round(d.tempMax)}°
            <span className="text-muted-foreground font-normal text-sm">
              {" "}
              / {Math.round(d.tempMin)}°
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mt-1.5 line-clamp-2 min-h-[2rem]">
            {d.conditions}
          </p>
          {(d.precipitation != null && d.precipitation > 0) || d.windMax != null ? (
            <div className="mt-2 flex flex-col gap-0.5 text-[10px] text-muted-foreground w-full">
              {d.precipitation != null && d.precipitation > 0 && (
                <span className="inline-flex items-center justify-center gap-1">
                  <Droplets className="h-3 w-3 shrink-0" />
                  {d.precipitation.toFixed(1)} mm
                </span>
              )}
              {d.windMax != null && (
                <span className="inline-flex items-center justify-center gap-1">
                  <Wind className="h-3 w-3 shrink-0" />
                  {Math.round(d.windMax)} km/h
                </span>
              )}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
