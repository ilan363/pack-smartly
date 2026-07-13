import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, AlertCircle, Luggage } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useSuitcasesStore,
  totalWeight,
  type Item,
  type SuitcaseType,
} from "@/lib/suitcases-store";
import { ExcessBaggageEstimateCard } from "@/components/suitcases/ExcessBaggageEstimate";
import { IataAirportCombobox } from "@/components/suitcases/IataAirportCombobox";
import { WeightExplainButton } from "@/components/WeightExplainButton";
import {
  estimateLineWeightKg,
  estimateUnitWeightKg,
} from "@/lib/weight-explain";
import { useI18n } from "@/hooks/use-i18n";
import { ITEM_CATEGORY_IDS } from "@/lib/i18n/categories";

export const Route = createFileRoute("/_layout/suitcases")({
  component: SuitcasesPage,
});

function EditItemForm({
  item,
  onChange,
}: {
  item: Item;
  onChange: (item: Item) => void;
}) {
  const { t, tc, ti } = useI18n();
  const unitWeight = estimateUnitWeightKg(item.name, item.category);
  const lineWeight = estimateLineWeightKg(item.name, item.category, item.quantity);

  const patch = (partial: Partial<Pick<Item, "name" | "category" | "quantity">>) => {
    const next = { ...item, ...partial };
    onChange({
      ...next,
      weight: estimateUnitWeightKg(next.name, next.category),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("common.name")}</label>
        <Input
          value={item.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("common.category")}</label>
        <Select value={item.category} onValueChange={(v) => patch({ category: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ITEM_CATEGORY_IDS.map((c) => (
              <SelectItem key={c} value={c}>
                {tc(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("common.quantity")}</label>
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => patch({ quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("common.weightTotal")} ({t("common.kg")})</label>
          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
            {lineWeight.toFixed(2)} {t("common.kg")}
            {item.quantity > 1 && (
              <span className="text-muted-foreground"> ({unitWeight.toFixed(2)} {t("common.kg")} {t("common.unitEach")})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuitcasesPage() {
  const { t, tc, ti } = useI18n();
  const suitcases = useSuitcasesStore((s) => s.suitcases);
  const activeId = useSuitcasesStore((s) => s.activeSuitcaseId);
  const setActive = useSuitcasesStore((s) => s.setActive);
  const addSuitcase = useSuitcasesStore((s) => s.addSuitcase);
  const updateSuitcase = useSuitcasesStore((s) => s.updateSuitcase);
  const removeSuitcase = useSuitcasesStore((s) => s.removeSuitcase);
  const addItem = useSuitcasesStore((s) => s.addItem);
  const updateItem = useSuitcasesStore((s) => s.updateItem);
  const removeItem = useSuitcasesStore((s) => s.removeItem);

  const active = useMemo(
    () => suitcases.find((s) => s.id === activeId) ?? suitcases[0],
    [suitcases, activeId],
  );

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: 1,
  });

  const newItemEstimatedTotal = useMemo(() => {
    if (!newItem.category) return 0;
    return estimateLineWeightKg(newItem.name, newItem.category, newItem.quantity);
  }, [newItem.name, newItem.category, newItem.quantity]);

  const newItemUnitWeight = useMemo(() => {
    if (!newItem.category) return 0;
    return estimateUnitWeightKg(newItem.name, newItem.category);
  }, [newItem.name, newItem.category]);

  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [suitcaseDialog, setSuitcaseDialog] = useState<
    | { mode: "create" }
    | { mode: "edit"; id: string }
    | null
  >(null);

  if (!active) {
    return (
      <EmptyState
        onCreate={() => setSuitcaseDialog({ mode: "create" })}
        dialog={suitcaseDialog}
        onClose={() => setSuitcaseDialog(null)}
      />
    );
  }

  const currentWeight = totalWeight(active.items);
  const percentage = (currentWeight / active.maxWeight) * 100;

  let statusColor = "bg-primary";
  let statusText = "text-primary";
  if (percentage > 90) {
    statusColor = "bg-red-500";
    statusText = "text-red-500";
  } else if (percentage > 75) {
    statusColor = "bg-yellow-500";
    statusText = "text-yellow-600 dark:text-yellow-500";
  }

  const handleAddItem = () => {
    if (!newItem.name.trim() || !newItem.category) {
      toast.error(t("suitcases.errItem"));
      return;
    }
    const quantity = Math.max(1, newItem.quantity);
    const weightPerUnit = estimateUnitWeightKg(newItem.name, newItem.category);
    addItem(active.id, {
      name: newItem.name.trim(),
      category: newItem.category,
      quantity,
      weight: weightPerUnit,
    });
    setNewItem({ name: "", category: "", quantity: 1 });
    toast.success(t("suitcases.itemAdded", { name: newItem.name.trim(), suitcase: active.name }));
  };

  const handleDeleteSuitcase = () => {
    if (confirm(t("suitcases.confirmDelete", { name: active.name }))) {
      removeSuitcase(active.id);
      toast.success(t("suitcases.deleted"));
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={active.id} onValueChange={(v) => setActive(v)}>
            <SelectTrigger className="w-[260px] h-12 text-base font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {suitcases.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <Luggage className="h-4 w-4" /> {s.name}
                    <Badge variant="outline" className="ml-1 text-[10px] capitalize">
                      {s.type}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-sm">{t("suitcases.tripTo", { destination: active.destination })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setSuitcaseDialog({ mode: "edit", id: active.id })}>
            <Edit2 className="h-4 w-4 mr-2" /> {t("suitcases.edit")}
          </Button>
          <Button variant="outline" onClick={handleDeleteSuitcase}>
            <Trash2 className="h-4 w-4 mr-2" /> {t("suitcases.delete")}
          </Button>
          <Button onClick={() => setSuitcaseDialog({ mode: "create" })}>
            <Plus className="h-4 w-4 mr-2" /> {t("suitcases.newSuitcase")}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="p-6">
        <div className="flex justify-between items-end mb-2">
          <div className="text-2xl font-bold flex items-center gap-2">
            {currentWeight.toFixed(2)} kg{" "}
            <span className="text-muted-foreground text-sm font-normal">
              / {active.maxWeight} kg
            </span>
          </div>
          <div className={`font-semibold ${statusText}`}>
            {percentage > 100
              ? t("suitcases.exceededBy", { kg: (currentWeight - active.maxWeight).toFixed(2) })
              : t("suitcases.freeKg", { kg: (active.maxWeight - currentWeight).toFixed(2) })}
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${statusColor} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {percentage > 100 ? (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-3 bg-red-500/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {t("suitcases.overWeightHint")}
          </div>
        ) : percentage > 90 ? (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-3 bg-red-500/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            {t("suitcases.nearLimitHint")}
          </div>
        ) : null}
      </Card>

      {percentage > 100 && (
        <ExcessBaggageEstimateCard suitcase={active} currentWeight={currentWeight} />
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">{t("suitcases.itemsTitle")}</h2>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium p-4">{t("suitcases.item")}</th>
                    <th className="text-left font-medium p-4">{t("common.category")}</th>
                    <th className="text-right font-medium p-4">{t("common.quantity")}</th>
                    <th className="text-right font-medium p-4">{t("common.weightTotal")}</th>
                    <th className="text-right font-medium p-4">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {active.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-4 font-medium">{ti(item.name)}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="font-normal">
                          {tc(item.category)}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">{item.quantity}</td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <div className="text-muted-foreground">
                            {(item.weight * item.quantity).toFixed(2)} {t("common.kg")}
                            {item.quantity > 1 && (
                              <span className="block text-[11px] text-muted-foreground/80">
                                ({item.weight.toFixed(2)} {t("common.kg")} {t("common.unitEach")})
                              </span>
                            )}
                          </div>
                          <WeightExplainButton
                            name={item.name}
                            category={item.category}
                            weight={item.weight}
                            quantity={item.quantity}
                            source="assistant"
                          />
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => {
                            removeItem(active.id, item.id);
                            toast.success(t("suitcases.itemRemoved", { name: ti(item.name) }));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {active.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {t("suitcases.emptyItems")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t("suitcases.addItem")}</h2>
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.name")}</label>
              <Input
                placeholder={t("suitcases.placeholderItem")}
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("common.category")}</label>
              <Select
                value={newItem.category}
                onValueChange={(v) => setNewItem({ ...newItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("suitcases.chooseCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORY_IDS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tc(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.quantity")}</label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("common.weightTotal")} ({t("common.kg")})</label>
                <div
                  className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm"
                  aria-live="polite"
                >
                  {newItem.category ? (
                    <span>
                      {newItemEstimatedTotal.toFixed(2)} {t("common.kg")}
                      {newItem.quantity > 1 && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({newItemUnitWeight.toFixed(2)} {t("common.kg")} {t("common.unitEach")})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t("suitcases.chooseCategory")}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("suitcases.weightAuto")}
                </p>
              </div>
            </div>
            <Button className="w-full mt-2" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> {t("suitcases.addToSuitcase")}
            </Button>
          </Card>
        </div>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.edit")} {t("suitcases.item")}</DialogTitle>
            <DialogDescription>{t("suitcases.editItemDesc")}</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <EditItemForm
              item={editingItem}
              onChange={setEditingItem}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!editingItem) return;
                updateItem(active.id, editingItem.id, {
                  name: editingItem.name,
                  category: editingItem.category,
                  quantity: editingItem.quantity,
                  weight: editingItem.weight,
                });
                setEditingItem(null);
                toast.success(t("suitcases.itemUpdated"));
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suitcase Dialog */}
      <SuitcaseDialog
        dialog={suitcaseDialog}
        onClose={() => setSuitcaseDialog(null)}
        onCreate={(data) => {
          const id = addSuitcase(data);
          setActive(id);
          toast.success(t("suitcases.created", { name: data.name }));
        }}
        onUpdate={(id, data) => {
          updateSuitcase(id, data);
          toast.success(t("suitcases.updated"));
        }}
        getInitial={(id) => {
          const s = suitcases.find((sc) => sc.id === id);
          return s ? suitcaseToForm(s) : undefined;
        }}
      />
    </div>
  );
}

function EmptyState({
  onCreate,
  dialog,
  onClose,
}: {
  onCreate: () => void;
  dialog: { mode: "create" } | { mode: "edit"; id: string } | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const addSuitcase = useSuitcasesStore((s) => s.addSuitcase);
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Luggage className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold">{t("suitcases.emptyTitle")}</h2>
      <p className="text-muted-foreground mt-2">{t("suitcases.emptyDesc")}</p>
      <Button className="mt-6" onClick={onCreate}>
        <Plus className="h-4 w-4 mr-2" /> {t("suitcases.createSuitcase")}
      </Button>
      <SuitcaseDialog
        dialog={dialog}
        onClose={onClose}
        onCreate={(d) => {
          addSuitcase(d);
          toast.success(t("suitcases.created", { name: d.name }));
        }}
        onUpdate={() => {}}
        getInitial={() => undefined}
      />
    </div>
  );
}

type SuitcaseFormData = {
  name: string;
  destination: string;
  type: SuitcaseType;
  maxWeight: number;
  originAirport: string;
  departureDate: string;
};

function defaultDepartureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function suitcaseToForm(s: import("@/lib/suitcases-store").Suitcase): SuitcaseFormData {
  return {
    name: s.name,
    destination: s.destination,
    type: s.type,
    maxWeight: s.maxWeight,
    originAirport: s.originAirport ?? "",
    departureDate: s.departureDate ?? defaultDepartureDate(),
  };
}

function SuitcaseDialog({
  dialog,
  onClose,
  onCreate,
  onUpdate,
  getInitial,
}: {
  dialog: { mode: "create" } | { mode: "edit"; id: string } | null;
  onClose: () => void;
  onCreate: (data: SuitcaseFormData) => void;
  onUpdate: (id: string, data: SuitcaseFormData) => void;
  getInitial: (id: string) => SuitcaseFormData | undefined;
}) {
  const { t } = useI18n();
  const initial =
    dialog?.mode === "edit" ? getInitial(dialog.id) : undefined;

  const [form, setForm] = useState<SuitcaseFormData>({
    name: "",
    destination: "",
    type: "cabina",
    maxWeight: 10,
    originAirport: "",
    departureDate: defaultDepartureDate(),
  });

  // Re-seed form when dialog opens
  const dialogKey = dialog ? `${dialog.mode}-${dialog.mode === "edit" ? dialog.id : "new"}` : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (dialogKey !== seededKey) {
    setSeededKey(dialogKey);
    if (dialog?.mode === "edit" && initial) {
      setForm(initial);
    } else if (dialog?.mode === "create") {
      setForm({
        name: "",
        destination: "",
        type: "cabina",
        maxWeight: 10,
        originAirport: "",
        departureDate: defaultDepartureDate(),
      });
    }
  }

  const submit = () => {
    if (!form.name.trim() || !form.destination.trim() || form.maxWeight <= 0) {
      toast.error(t("suitcases.errForm"));
      return;
    }
    if (dialog?.mode === "edit") {
      onUpdate(dialog.id, {
        ...form,
        originAirport: form.originAirport.trim().toUpperCase(),
      });
    } else {
      onCreate({
        ...form,
        originAirport: form.originAirport.trim().toUpperCase(),
      });
    }
    onClose();
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog?.mode === "edit" ? t("suitcases.editSuitcase") : t("suitcases.newSuitcaseDialog")}
          </DialogTitle>
          <DialogDescription>
            {t("suitcases.dialogDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("common.name")}</label>
            <Input
              placeholder={t("suitcases.placeholderName")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("assistant.destination")}</label>
            <Input
              placeholder={t("suitcases.placeholderDestination")}
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="origin-iata">
                {t("suitcases.originAirport")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t("suitcases.originAirportHint")})
                </span>
              </label>
              <IataAirportCombobox
                id="origin-iata"
                value={form.originAirport}
                onChange={(code) => setForm({ ...form, originAirport: code })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("suitcases.departureDate")}</label>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("suitcases.type")}</label>
              <Select
                value={form.type}
                onValueChange={(v: SuitcaseType) =>
                  setForm({ ...form, type: v, maxWeight: v === "cabina" ? 10 : 23 })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cabina">{t("suitcaseType.cabin")}</SelectItem>
                  <SelectItem value="bodega">{t("suitcaseType.hold")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("suitcases.maxWeightKg")}</label>
              <Input
                type="number"
                step="0.5"
                value={form.maxWeight}
                onChange={(e) =>
                  setForm({ ...form, maxWeight: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit}>
            {dialog?.mode === "edit" ? t("common.save") : t("suitcases.createSuitcase")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
