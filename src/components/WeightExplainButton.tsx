import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getWeightExplanation,
  type WeightExplainInput,
} from "@/lib/weight-explain";
import { useI18n } from "@/hooks/use-i18n";

export function WeightExplainButton(props: WeightExplainInput) {
  const { t, ti, locale } = useI18n();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
          aria-label={t("weight.explainAriaItem", {
            name: ti(props.name),
            weight: props.weight.toFixed(2),
          })}
        >
          <CircleAlert className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm leading-relaxed" side="top" align="end">
        <p className="mb-1 font-medium">{t("weight.explainTitle")}</p>
        <p className="text-muted-foreground">{getWeightExplanation(props, locale)}</p>
      </PopoverContent>
    </Popover>
  );
}
