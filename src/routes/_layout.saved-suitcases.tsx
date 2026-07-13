import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  ClipboardList,
  MapPin,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createId,
  deleteSavedList,
  getSavedList,
  getSavedLists,
  packedWeight,
  saveList,
  uncheckedCount,
  type SavedList,
  type SavedListItem,
} from "@/lib/saved-lists";
import { requestNotificationPermission } from "@/lib/packing-reminders";
import { WeightExplainButton } from "@/components/WeightExplainButton";
import { useI18n } from "@/hooks/use-i18n";
import { formatAppDate } from "@/lib/i18n/format";
import { ITEM_CATEGORY_IDS } from "@/lib/i18n/categories";

export const Route = createFileRoute("/_layout/saved-suitcases")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: SavedSuitcasesPage,
});

function formatDateRange(locale: ReturnType<typeof useI18n>["locale"], from?: string, to?: string) {
  if (!from || !to) return null;
  const start = formatAppDate(locale, from, { day: "numeric", month: "short" });
  const end = formatAppDate(locale, to, { day: "numeric", month: "short", year: "numeric" });
  return `${start} → ${end}`;
}

function SavedListDetail({
  list,
  onBack,
  onUpdate,
  onDelete,
}: {
  list: SavedList;
  onBack: () => void;
  onUpdate: (list: SavedList) => void;
  onDelete: () => void;
}) {
  const { t, tc, locale } = useI18n();
  const [draft, setDraft] = useState(list);
  const [newItem, setNewItem] = useState<{ name: string; category: string; weight: string }>({
    name: "",
    category: ITEM_CATEGORY_IDS.at(-1) ?? "Otros",
    weight: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(list);
  }, [list.id]);

  const persist = useCallback(
    (next: SavedList) => {
      const updated = { ...next, updatedAt: new Date().toISOString() };
      setDraft(updated);
      saveList(updated);
      onUpdate(updated);
    },
    [onUpdate],
  );

  const toggleItem = (itemId: string, checked: boolean) => {
    persist({
      ...draft,
      items: draft.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
    });
  };

  const removeItem = (itemId: string) => {
    persist({
      ...draft,
      items: draft.items.filter((i) => i.id !== itemId),
    });
  };

  const updateItem = (itemId: string, patch: Partial<SavedListItem>) => {
    persist({
      ...draft,
      items: draft.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    });
  };

  const addItem = () => {
    const name = newItem.name.trim();
    const weight = parseFloat(newItem.weight);
    if (!name || Number.isNaN(weight) || weight <= 0) return;
    persist({
      ...draft,
      items: [
        ...draft.items,
        {
          id: createId(),
          name,
          category: newItem.category,
          weight,
          checked: false,
        },
      ],
    });
    setNewItem({ name: "", category: ITEM_CATEGORY_IDS.at(-1) ?? "Otros", weight: "" });
    toast.success(t("savedSuitcases.itemAdded"));
  };

  const grouped = useMemo(() => {
    const map = new Map<string, SavedListItem[]>();
    for (const item of draft.items) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return [...map.entries()];
  }, [draft.items]);

  const pending = uncheckedCount(draft);
  const packed = packedWeight(draft);
  const progress =
    draft.items.length > 0
      ? Math.round(
          (draft.items.filter((i) => i.checked).length / draft.items.length) * 100,
        )
      : 0;

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === "granted") {
      toast.success(t("savedSuitcases.notificationsEnabled"));
    } else {
      toast.info(t("savedSuitcases.notificationsBlocked"));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label={t("savedSuitcases.back")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{draft.destination}</h1>
          {formatDateRange(locale, draft.dateFrom, draft.dateTo) && (
            <p className="text-sm text-muted-foreground">{formatDateRange(locale, draft.dateFrom, draft.dateTo)}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleEnableNotifications}>
          <Bell className="h-4 w-4 mr-1" />
          {t("savedSuitcases.reminders")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold">{t("savedSuitcases.progressPacked", { progress })}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("savedSuitcases.progressPending", { packed: packed.toFixed(1), pending })}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {t("savedSuitcases.listWeight", { weight: draft.totalWeight })}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {draft.weather && (
            <p className="text-sm text-muted-foreground border-t border-border pt-3">
              <span className="font-medium text-foreground">{t("weather.title")}: </span>
              {draft.weather}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            {t("savedSuitcases.checklistTitle")}
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            {t("savedSuitcases.checklistHint")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pb-6">
          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("savedSuitcases.emptyItems")}
            </p>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {tc(category)}
                </h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        item.checked
                          ? "border-border bg-muted/30 opacity-75"
                          : "border-border bg-card"
                      }`}
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(v) => toggleItem(item.id, v === true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        {editingId === item.id ? (
                          <div className="space-y-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItem(item.id, { name: e.target.value })}
                              className="h-8"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step={0.1}
                                value={item.weight}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    weight: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="h-8 w-24"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingId(null)}
                              >
                                {t("savedSuitcases.done")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor={item.id}
                            className={`cursor-pointer block ${item.checked ? "line-through" : ""}`}
                          >
                            <span className="font-medium text-sm">{item.name}</span>
                            <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              {item.weight} {t("common.kg")}
                              <WeightExplainButton
                                name={item.name}
                                category={item.category}
                                weight={item.weight}
                                source="imported"
                              />
                            </span>
                          </label>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingId(item.id)}
                          aria-label={t("savedSuitcases.editAria")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          aria-label={t("savedSuitcases.deleteAria")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          <Separator />

          <div className="space-y-3">
            <p className="text-sm font-medium">{t("savedSuitcases.addGarment")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="new-name">{t("common.name")}</Label>
                <Input
                  id="new-name"
                  placeholder={t("suitcases.placeholderItem")}
                  value={newItem.name}
                  onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("common.category")}</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(v) => setNewItem((p) => ({ ...p, category: v }))}
                >
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
              <div className="space-y-2">
                <Label htmlFor="new-weight">{t("common.weight")} ({t("common.kg")})</Label>
                <Input
                  id="new-weight"
                  type="number"
                  step={0.1}
                  min={0.1}
                  value={newItem.weight}
                  onChange={(e) => setNewItem((p) => ({ ...p, weight: e.target.value }))}
                />
              </div>
            </div>
            <Button variant="secondary" onClick={addItem} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t("savedSuitcases.addItem")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full sm:w-auto"
        onClick={() => {
          if (confirm(t("savedSuitcases.deleteConfirm"))) onDelete();
        }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {t("savedSuitcases.deleteList")}
      </Button>
    </div>
  );
}

function SavedSuitcasesPage() {
  const { t, locale } = useI18n();
  const { id: selectedId } = Route.useSearch();
  const navigate = useNavigate();
  const [lists, setLists] = useState<SavedList[]>([]);

  const refresh = useCallback(() => {
    setLists(getSavedLists());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, selectedId]);

  const selected = selectedId ? getSavedList(selectedId) : undefined;

  if (selectedId && !selected) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t("savedSuitcases.notFound")}</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link to="/saved-suitcases" search={{ id: undefined }}>
            {t("savedSuitcases.back")}
          </Link>
        </Button>
      </div>
    );
  }

  if (selectedId && selected) {
    return (
      <SavedListDetail
        list={selected}
        onBack={() => navigate({ to: "/saved-suitcases", search: { id: undefined } })}
        onUpdate={refresh}
        onDelete={() => {
          deleteSavedList(selected.id);
          toast.success(t("savedSuitcases.deleted"));
          navigate({ to: "/saved-suitcases", search: { id: undefined } });
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("savedSuitcases.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("savedSuitcases.subtitle")}
        </p>
      </div>

      {lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-semibold text-lg">{t("savedSuitcases.empty")}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              {t("savedSuitcases.assistantHint")}
            </p>
            <Button className="mt-6" asChild>
              <Link to="/assistant">{t("savedSuitcases.goAssistant")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((list) => {
            const pending = uncheckedCount(list);
            const done = list.items.length - pending;
            return (
              <Card
                key={list.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate({ to: "/saved-suitcases", search: { id: list.id } })}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      {list.destination}
                    </CardTitle>
                    {pending > 0 && (
                      <Badge variant="secondary" className="shrink-0">
                        {pending} {t("savedSuitcases.pendingShort")}
                      </Badge>
                    )}
                  </div>
                  {formatDateRange(locale, list.dateFrom, list.dateTo) && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(locale, list.dateFrom, list.dateTo)}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("savedSuitcases.itemsMarked", {
                      done,
                      total: list.items.length,
                      weight: list.totalWeight,
                    })}
                  </p>
                  <div className="h-1.5 w-full rounded-full bg-muted mt-3 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${list.items.length ? (done / list.items.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
