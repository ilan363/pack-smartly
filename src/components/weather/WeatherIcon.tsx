import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudSun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { iconTone, type WeatherIconKind } from "@/lib/weather/codes";

type Props = {
  icon: WeatherIconKind;
  code?: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZE = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-14 w-14",
};

export function WeatherIcon({ icon, className, size = "md" }: Props) {
  const Icon =
    icon === "sun"
      ? Sun
      : icon === "cloud"
        ? Cloud
        : icon === "rain"
          ? CloudRain
          : icon === "snow"
            ? CloudSnow
            : icon === "storm"
              ? CloudLightning
              : CloudSun;

  return (
    <Icon
      className={cn(SIZE[size], iconTone(icon), "stroke-[1.5]", className)}
      aria-hidden
    />
  );
}
