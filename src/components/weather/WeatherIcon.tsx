import {
  IconSun,
  IconCloud,
  IconCloudRain,
  IconSnowflake,
  IconAlertTriangle,
  IconCloudSun,
} from "@/components/ui/icons";
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
      ? IconSun
      : icon === "cloud"
        ? IconCloud
        : icon === "rain"
          ? IconCloudRain
          : icon === "snow"
            ? IconSnowflake
            : icon === "storm"
              ? IconAlertTriangle
              : IconCloudSun;

  return (
    <Icon
      className={cn(SIZE[size], iconTone(icon), className)}
      aria-hidden
    />
  );
}
