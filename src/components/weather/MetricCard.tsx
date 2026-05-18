import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: "default" | "primary" | "warning" | "info";
  className?: string;
};

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  warning: "text-amber-500",
  info: "text-sky-500",
};

export function MetricCard({ icon: Icon, label, value, unit, hint, tone = "default", className }: Props) {
  return (
    <Card className={cn("p-4 flex flex-col gap-1.5 bg-card", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", TONES[tone])} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold tabular-nums", TONES[tone])}>{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </Card>
  );
}
