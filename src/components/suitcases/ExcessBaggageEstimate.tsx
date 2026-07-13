import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Info, Loader2, Plane, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Suitcase } from "@/lib/suitcases-store";
import {
  estimateExcessBaggageCost,
  formatMoney,
} from "@/lib/amadeus/excess-baggage-estimate";
import { useI18n } from "@/hooks/use-i18n";

type Props = {
  suitcase: Suitcase;
  currentWeight: number;
};

export function ExcessBaggageEstimateCard({ suitcase, currentWeight }: Props) {
  const { t } = useI18n();
  const excessKg = Math.max(0, currentWeight - suitcase.maxWeight);
  const enabled = excessKg > 0;
  const missingOrigin = !suitcase.originAirport?.trim();

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [
      "excess-baggage",
      suitcase.id,
      excessKg.toFixed(2),
      suitcase.destination,
      suitcase.originAirport,
      suitcase.departureDate,
      suitcase.type,
    ],
    queryFn: () =>
      estimateExcessBaggageCost({
        destination: suitcase.destination,
        excessKg,
        suitcaseType: suitcase.type,
        originAirport: suitcase.originAirport,
        departureDate: suitcase.departureDate,
      }),
    enabled,
    staleTime: 1000 * 60 * 15,
    retry: 0,
  });

  if (!enabled) return null;

  return (
    <Card className="p-5 border-red-500/30 bg-red-500/5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="font-semibold text-red-700 dark:text-red-400">
              {t("excess.title")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("excess.desc", { kg: excessKg.toFixed(2) })}
            </p>
            {missingOrigin && (
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {t("excess.noOrigin")}
              </p>
            )}
          </div>

          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("excess.loading")}
            </div>
          )}

          {error && !isFetching && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("excess.error")}{" "}
              <button
                type="button"
                className="underline font-medium"
                onClick={() => refetch()}
              >
                {t("common.retry")}
              </button>
            </div>
          )}

          {data && !isFetching && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl font-bold tabular-nums">
                  {formatMoney(data.estimatedCost, data.currency)}
                </span>
                <Badge variant={data.source === "amadeus" ? "default" : "secondary"}>
                  {data.source === "amadeus" ? "Amadeus" : t("excess.sourceLocal")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("excess.perKg", { price: formatMoney(data.pricePerKg, data.currency) })}
                {data.bagUnitPrice != null
                  ? t("excess.extraBag", { price: formatMoney(data.bagUnitPrice, data.currency) })
                  : null}
              </p>
              {(data.routeLabel || data.airline) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5" />
                  {data.routeLabel}
                  {data.airline ? ` · ${data.airline}` : ""}
                </p>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                {data.note}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
