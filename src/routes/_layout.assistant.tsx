import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Plus, Trash2, BookmarkPlus, Loader2, CloudSun, ChevronDown, AlertTriangle } from "lucide-react";
import { DailyForecastCards } from "@/components/weather/DailyForecastCards";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSuitcasesStore, type SuitcaseType } from "@/lib/suitcases-store";
import { useChecklistsStore } from "@/lib/checklists-store";
import { useChatStore, type ChatMessage, type ChatSuggestion } from "@/lib/chat-store";
import { generatePackSuggestion, defaultShoppingReserveKg, resolvePackingCapacity, computeWeightExcessKg } from "@/lib/pack-service";
import { DestinationCombobox } from "@/components/assistant/DestinationCombobox";
import { TripNotesField, formatTripNotesForPrompt } from "@/components/assistant/TripNotesField";
import { WeightExplainButton } from "@/components/WeightExplainButton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { ITEM_CATEGORY_IDS } from "@/lib/i18n/categories";

export const Route = createFileRoute("/_layout/assistant")({
  component: AssistantPage,
});

type SuggestionItem = { category: string; name: string; weight: number; quantity?: number };
type Suggestion = ChatSuggestion;
type Message = ChatMessage;

function buildSuitcaseFromSuggestion(
  suggestion: ChatSuggestion,
  opts: {
    name: string;
    type?: SuitcaseType;
    maxWeight?: number;
    departureDate?: string;
  },
) {
  const capacity = suggestion.suitcaseCapacityKg ?? 23;
  return {
    name: opts.name,
    destination: suggestion.destination,
    type: opts.type ?? (capacity <= 12 ? "cabina" : "bodega"),
    maxWeight: opts.maxWeight ?? capacity,
    departureDate: opts.departureDate,
    items: suggestion.items.map((it) => ({
      name: it.name,
      category: it.category,
      quantity: it.quantity ?? 1,
      weight: it.weight,
    })),
  };
}

function AssistantPage() {
  const { t, tc, ti, to, locale } = useI18n();
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateSuggestionInStore = useChatStore((s) => s.updateSuggestion);
  const resetChat = useChatStore((s) => s.reset);
  const [form, setForm] = useState({
    destination: "",
    from: "",
    to: "",
    occasion: "",
    notes: [""],
    suitcaseCapacityKg: 23,
    sharedSuitcase: false,
    sharedPeople: 2,
    capacityMode: "fill" as "fill" | "reserve",
    shoppingReserveKg: defaultShoppingReserveKg(23),
  });
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const addSuitcase = useSuitcasesStore((s) => s.addSuitcase);
  const setActive = useSuitcasesStore((s) => s.setActive);
  const addChecklist = useChecklistsStore((s) => s.addChecklist);

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [createMsgId, setCreateMsgId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<{
    name: string;
    type: SuitcaseType;
    maxWeight: number;
  }>({ name: "", type: "cabina", maxWeight: 10 });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const computeDays = () => {
    if (!form.from || !form.to) return 0;
    const a = new Date(`${form.from}T12:00:00`).getTime();
    const b = new Date(`${form.to}T12:00:00`).getTime();
    if (isNaN(a) || isNaN(b) || b < a) return 0;
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  };

  const packingPreview = resolvePackingCapacity({
    suitcaseCapacityKg: form.suitcaseCapacityKg,
    capacityMode: form.capacityMode,
    shoppingReserveKg: form.shoppingReserveKg,
  });

  const handleSend = async () => {
    if (loading) return;
    const destination = form.destination.trim();
    if (!destination) {
      toast.error(t("assistant.errDestination"));
      return;
    }
    if (!form.from || !form.to) {
      toast.error(t("assistant.errDates"));
      return;
    }
    const days = computeDays();
    if (days <= 0) {
      toast.error(t("assistant.errInvalidDates"));
      return;
    }
    if (!Number.isFinite(form.suitcaseCapacityKg) || form.suitcaseCapacityKg < 5) {
      toast.error(t("assistant.errCapacity"));
      return;
    }
    if (form.sharedSuitcase) {
      if (!Number.isFinite(form.sharedPeople) || form.sharedPeople < 2) {
        toast.error(t("assistant.errSharedMin"));
        return;
      }
      if (form.sharedPeople > 8) {
        toast.error(t("assistant.errSharedMax", { count: 8 }));
        return;
      }
    }
    const occasion = form.occasion.trim();
    const notesBlock = formatTripNotesForPrompt(form.notes, t("assistant.notes"));
    const capacityLine =
      form.capacityMode === "reserve"
        ? t("assistant.packingPreviewReserve", {
            reserveKg: form.shoppingReserveKg,
            packingLimitKg: packingPreview?.packingLimitKg ?? 0,
          })
        : t("assistant.packingPreviewFill", {
            capacityKg: Math.round(form.suitcaseCapacityKg),
            packingLimitKg: packingPreview?.packingLimitKg ?? 0,
          });
    const userText = [
      `${t("assistant.destination")}: ${destination}`,
      `${t("assistant.from")}: ${form.from}`,
      `${t("assistant.to")}: ${form.to}`,
      `${t(days === 1 ? "assistant.tripDaysOne" : "assistant.tripDaysMany", { count: days })}`,
      capacityLine,
      `${t("assistant.sharedSuitcase")}: ${form.sharedSuitcase ? t("common.yes") : t("common.no")}`,
      form.sharedSuitcase
        ? `${t("assistant.peopleCount")}: ${Math.round(form.sharedPeople)}`
        : null,
      occasion ? `${t("assistant.occasion")}: ${occasion}` : null,
      notesBlock,
    ]
      .filter(Boolean)
      .join("\n");

    addMessage({ id: Date.now().toString(), role: "user", content: userText });
    setLoading(true);

    try {
      const { suggestion: data } = await generatePackSuggestion({
        prompt: userText,
        suitcaseCapacityKg: Math.round(form.suitcaseCapacityKg),
        trip: {
          destination,
          days,
          dateFrom: form.from,
          dateTo: form.to,
          occasion: occasion || undefined,
          notes: form.notes.map((n) => n.trim()).filter(Boolean),
          sharedSuitcase: form.sharedSuitcase,
          sharedPeople: form.sharedSuitcase ? Math.round(form.sharedPeople) : undefined,
          capacityMode: form.capacityMode,
          shoppingReserveKg:
            form.capacityMode === "reserve" ? form.shoppingReserveKg : undefined,
          locale,
        },
      });
      const totalWeight = data.items.reduce(
        (acc, it) => acc + it.weight * (it.quantity ?? 1),
        0,
      );
      const weightExcessKg =
        data.weightExcessKg ?? computeWeightExcessKg(totalWeight, data.suitcaseCapacityKg);
      const overCapacityNote =
        weightExcessKg && data.suitcaseCapacityKg
          ? `\n\n⚠️ ${t("assistant.overCapacityDetail", {
              total: totalWeight.toFixed(2),
              capacity: data.suitcaseCapacityKg,
              excess: weightExcessKg.toFixed(2),
            })}`
          : "";
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.occasion
          ? `${t("assistant.summaryWithOccasion", {
              daysLabel: t(data.days === 1 ? "assistant.tripDaysOne" : "assistant.tripDaysMany", {
                count: data.days,
              }),
              destination: data.destination,
              occasion: data.occasion,
            })}${overCapacityNote}`
          : `${t("assistant.summaryNoOccasion", {
              daysLabel: t(data.days === 1 ? "assistant.tripDaysOne" : "assistant.tripDaysMany", {
                count: data.days,
              }),
              destination: data.destination,
            })}${overCapacityNote}`,
        suggestion: {
          destination: data.destination,
          weather: data.weather,
          days: data.days,
          occasion: data.occasion,
          items: data.items,
          totalWeight,
          suitcaseCapacityKg: data.suitcaseCapacityKg,
          capacityMode: data.capacityMode,
          shoppingReserveKg: data.shoppingReserveKg,
          packingLimitKg: data.packingLimitKg,
          weightExcessKg,
          forecast: data.forecast,
        },
      });
    } catch {
      toast.error(t("assistant.errConnect"));
    } finally {
      setLoading(false);
    }
  };

  const saveAsChecklist = (msg: Message) => {
    if (!msg.suggestion) return;
    const s = msg.suggestion;
    const suitcaseName = t("assistant.defaultTrip", { destination: s.destination.split(",")[0] });
    addChecklist({
      title: `${s.destination}${s.days ? ` · ${s.days}d` : ""}${s.occasion ? ` · ${s.occasion}` : ""}`,
      destination: s.destination,
      days: s.days ?? 1,
      weather: s.weather,
      occasion: s.occasion ?? t("common.trip"),
      items: s.items.map((it) => ({
        name: it.name,
        category: it.category,
        quantity: it.quantity ?? 1,
        weight: it.weight,
      })),
    });
    const suitcaseId = addSuitcase(
      buildSuitcaseFromSuggestion(s, {
        name: suitcaseName,
        departureDate: form.from || undefined,
      }),
    );
    setActive(suitcaseId);
    toast.success(t("assistant.listSaved"), {
      description: t("assistant.listSavedDesc"),
      action: { label: t("assistant.viewDashboard"), onClick: () => navigate({ to: "/dashboard" }) },
    });
  };


  const updateMessageSuggestion = (msgId: string, suggestion: Suggestion) => {
    const total = suggestion.items.reduce(
      (acc, it) => acc + it.weight * (it.quantity ?? 1),
      0,
    );
    const weightExcessKg = computeWeightExcessKg(total, suggestion.suitcaseCapacityKg);
    updateSuggestionInStore(msgId, { ...suggestion, totalWeight: total, weightExcessKg });
  };

  const editingMsg = messages.find((m) => m.id === editingMsgId);
  const createMsg = messages.find((m) => m.id === createMsgId);

  const openCreate = (msg: Message) => {
    if (!msg.suggestion) return;
    setCreateForm({
      name: t("assistant.defaultTrip", { destination: msg.suggestion.destination.split(",")[0] }),
      type: (msg.suggestion.suitcaseCapacityKg ?? 23) <= 12 ? "cabina" : "bodega",
      maxWeight: msg.suggestion.suitcaseCapacityKg ?? 23,
    });
    setCreateMsgId(msg.id);
  };

  const confirmCreate = () => {
    if (!createMsg?.suggestion) return;
    if (!createForm.name.trim() || createForm.maxWeight <= 0) {
      toast.error(t("assistant.errNameMaxWeight"));
      return;
    }
    const id = addSuitcase(
      buildSuitcaseFromSuggestion(createMsg.suggestion, {
        name: createForm.name,
        type: createForm.type,
        maxWeight: createForm.maxWeight,
        departureDate: form.from || undefined,
      }),
    );
    setActive(id);
    setCreateMsgId(null);
    toast.success(
      t("assistant.createSuitcaseSuccess", {
        name: createForm.name,
        count: createMsg.suggestion.items.length,
      }),
    );
    navigate({ to: "/suitcases" });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden pb-6 md:pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("assistant.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t("assistant.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => resetChat()} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t("assistant.newChat")}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* LEFT: Form */}
        <Card className="min-w-0 border-border bg-background p-4 shadow-sm sm:p-5 lg:sticky lg:top-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold leading-tight">{t("assistant.newTrip")}</div>
              <div className="text-xs text-muted-foreground">{t("assistant.newTripHint")}</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("assistant.destination")}</label>
              <div className="mt-1">
                <DestinationCombobox
                  value={form.destination}
                  onChange={(destination) => setForm({ ...form, destination })}
                  disabled={loading}
                  placeholder={t("assistant.destinationPlaceholder")}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <div className="min-w-0">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("assistant.from")}</label>
                <Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} disabled={loading} className="mt-1" />
              </div>
              <div className="min-w-0">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("assistant.to")}</label>
                <Input type="date" value={form.to} min={form.from || undefined} onChange={(e) => setForm({ ...form, to: e.target.value })} disabled={loading} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("assistant.occasion")}</label>
              <Input placeholder={t("assistant.occasionPlaceholder")} value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} disabled={loading} className="mt-1" maxLength={120} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("assistant.capacity")} ({t("common.kg")})</label>
              <Input
                type="number"
                min={5}
                max={60}
                step={0.5}
                value={form.suitcaseCapacityKg}
                onChange={(e) => {
                  const nextCapacity = parseFloat(e.target.value) || 0;
                  setForm({
                    ...form,
                    suitcaseCapacityKg: nextCapacity,
                    shoppingReserveKg: defaultShoppingReserveKg(nextCapacity),
                  });
                }}
                disabled={loading}
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {t("assistant.capacityExamples")}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("assistant.sharedSuitcase")}
              </label>
              <div className="mt-1.5 flex gap-2">
                {([true, false] as const).map((option) => (
                  <Button
                    key={option ? "shared-yes" : "shared-no"}
                    type="button"
                    variant={form.sharedSuitcase === option ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    disabled={loading}
                    onClick={() =>
                      setForm({
                        ...form,
                        sharedSuitcase: option,
                        sharedPeople: option ? Math.max(2, form.sharedPeople) : 2,
                      })
                    }
                  >
                    {option ? t("common.yes") : t("common.no")}
                  </Button>
                ))}
              </div>
              {form.sharedSuitcase && (
                <div className="mt-2">
                  <label className="text-xs text-muted-foreground">{t("assistant.peopleCount")}</label>
                  <Input
                    type="number"
                    min={2}
                    max={8}
                    step={1}
                    value={form.sharedPeople}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sharedPeople: parseInt(e.target.value, 10) || 2,
                      })
                    }
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("assistant.spaceUsage")}
              </label>
              <RadioGroup
                value={form.capacityMode}
                onValueChange={(value) =>
                  setForm({
                    ...form,
                    capacityMode: value as "fill" | "reserve",
                    shoppingReserveKg:
                      value === "reserve"
                        ? defaultShoppingReserveKg(form.suitcaseCapacityKg)
                        : form.shoppingReserveKg,
                  })
                }
                disabled={loading}
                className="mt-2 space-y-2"
              >
                <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                  <RadioGroupItem value="fill" id="capacity-fill" className="mt-0.5" />
                  <Label htmlFor="capacity-fill" className="font-normal cursor-pointer leading-snug">
                    <span className="font-medium text-foreground">{t("assistant.fillSuitcase")}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t("assistant.fillSuitcaseHint")}
                    </span>
                  </Label>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-border p-3">
                  <RadioGroupItem value="reserve" id="capacity-reserve" className="mt-0.5" />
                  <Label htmlFor="capacity-reserve" className="font-normal cursor-pointer leading-snug">
                    <span className="font-medium text-foreground">{t("assistant.reserveSpace")}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {t("assistant.reserveSpaceHint")}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
              {form.capacityMode === "reserve" ? (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("assistant.reserveKg")} ({t("common.kg")})
                  </label>
                  <Input
                    type="number"
                    min={2}
                    max={Math.max(2, form.suitcaseCapacityKg - 3)}
                    step={0.5}
                    value={form.shoppingReserveKg}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shoppingReserveKg: parseFloat(e.target.value) || 0,
                      })
                    }
                    disabled={loading}
                    className="mt-1"
                  />
                </div>
              ) : null}
              {packingPreview ? (
                <div className="text-xs text-muted-foreground mt-2">
                  {form.capacityMode === "fill"
                    ? t("assistant.packingPreviewFill", {
                        capacityKg: packingPreview.capacityKg,
                        packingLimitKg: packingPreview.packingLimitKg,
                      })
                    : t("assistant.packingPreviewReserve", {
                        reserveKg: packingPreview.reserveKg,
                        packingLimitKg: packingPreview.packingLimitKg,
                      })}
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("assistant.notes")}
              </label>
              <p className="text-[11px] text-muted-foreground mt-0.5 mb-1.5">
                {t("assistant.notesHint")}
              </p>
              <TripNotesField
                notes={form.notes}
                onChange={(notes) => setForm({ ...form, notes })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
            {form.from && form.to && computeDays() > 0
              ? t(computeDays() === 1 ? "assistant.tripDaysOne" : "assistant.tripDaysMany", {
                  count: computeDays(),
                })
              : t("assistant.completeDates")}
          </div>

          <Button className="w-full mt-4 bg-primary hover:bg-primary/90" onClick={handleSend} disabled={loading} size="lg">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("assistant.packing")}</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> {t("assistant.buildSuitcase")}</>
            )}
          </Button>
        </Card>

        {/* RIGHT: Conversation + Results */}
        <div ref={scrollRef} className="min-w-0 space-y-4 sm:space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="min-w-0 space-y-3 sm:space-y-4">
              <div className={`flex min-w-0 gap-2 sm:gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"}`}>
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`min-w-0 max-w-[calc(100%-2.5rem)] px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-sm whitespace-pre-line break-words ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 text-foreground border border-border rounded-tl-sm"}`}>
                  {msg.content}
                </div>
              </div>

              {msg.suggestion && (
                <div className="min-w-0 space-y-3 sm:space-y-4">
                  {/* HEADER summary */}
                  <Card className="min-w-0 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 sm:p-5">
                    {msg.suggestion.weightExcessKg && msg.suggestion.suitcaseCapacityKg ? (
                      <Alert variant="destructive" className="mb-4 border-destructive/40 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{t("assistant.weightExcessTitle")}</AlertTitle>
                        <AlertDescription>
                          {t("assistant.overCapacityDetail", {
                            total: msg.suggestion.totalWeight.toFixed(2),
                            capacity: msg.suggestion.suitcaseCapacityKg,
                            excess: msg.suggestion.weightExcessKg.toFixed(2),
                          })}
                          {" "}
                          {t("assistant.noAutoReduce")}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold">{t("assistant.suggestedList")}</div>
                        <h2 className="mt-1 text-xl font-bold break-words sm:text-2xl">{msg.suggestion.destination}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <Badge variant="secondary">
                            {t((msg.suggestion.days ?? 1) === 1 ? "assistant.tripDaysOne" : "assistant.tripDaysMany", {
                              count: msg.suggestion.days ?? 1,
                            })}
                          </Badge>
                          <Badge variant="secondary">{to(msg.suggestion.occasion ?? "")}</Badge>
                          {msg.suggestion.suitcaseCapacityKg ? (
                            <Badge variant="secondary">{msg.suggestion.suitcaseCapacityKg} {t("common.kg")}</Badge>
                          ) : null}
                          {msg.suggestion.capacityMode === "reserve" && msg.suggestion.shoppingReserveKg ? (
                            <Badge variant="secondary">
                              {msg.suggestion.shoppingReserveKg} {t("assistant.freeKg")}
                            </Badge>
                          ) : null}
                          <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">
                            {msg.suggestion.items.length} {t("common.items")}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground sm:mt-3">{msg.suggestion.weather}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold sm:mb-0">{t("assistant.totalWeight")}</div>
                        <div className={`text-2xl font-bold sm:text-3xl ${msg.suggestion.weightExcessKg ? "text-destructive" : "text-primary"}`}>
                          {msg.suggestion.totalWeight.toFixed(2)}
                          <span className="ml-1 text-sm font-medium text-muted-foreground sm:text-base">{t("common.kg")}</span>
                          {msg.suggestion.suitcaseCapacityKg ? (
                            <span className="block text-xs font-normal text-muted-foreground sm:text-sm">
                              {t("assistant.ofCapacity", { capacity: msg.suggestion.suitcaseCapacityKg })}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap">
                      <Button onClick={() => openCreate(msg)} className="w-full sm:flex-1 sm:min-w-[180px]">
                        {t("assistant.createSuitcase")}
                      </Button>
                      <Button variant="secondary" onClick={() => saveAsChecklist(msg)} className="w-full sm:w-auto">
                        <BookmarkPlus className="h-4 w-4 mr-1" /> {t("assistant.saveList")}
                      </Button>
                      <Button variant="outline" onClick={() => setEditingMsgId(msg.id)} className="w-full sm:w-auto">
                        {t("assistant.modify")}
                      </Button>
                    </div>
                  </Card>

                  {/* WEATHER SCHEDULE */}
                  {msg.suggestion.forecast && msg.suggestion.forecast.length > 0 && (
                    <Card className="min-w-0 overflow-hidden border-border">
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-3 transition-colors hover:bg-muted/30 sm:p-4 border-b border-border">
                          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center sm:h-9 sm:w-9">
                              <CloudSun className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="font-bold text-sm sm:text-base">{t("assistant.weatherTrip")}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {t("assistant.weatherDays", { days: msg.suggestion.forecast.length })}
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="min-w-0 overflow-hidden p-3 sm:p-4">
                            <DailyForecastCards
                              compact
                              layout="scroll"
                              locale={locale}
                              days={msg.suggestion.forecast.map((f) => ({
                                date: f.date ?? f.label,
                                dayNumber: f.day,
                                tempMin: f.tempMin,
                                tempMax: f.tempMax,
                                conditions: f.conditions,
                                icon: f.icon,
                                precipitation: f.precipitation,
                                windMax: f.windMax,
                              }))}
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  )}

                  {/* ITEMS — grouped by category */}
                  <Card className="min-w-0 overflow-hidden border-border">
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-3 transition-colors hover:bg-muted/30 sm:p-4 border-b border-border">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center sm:h-9 sm:w-9">
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="font-bold text-sm sm:text-base">{t("assistant.itemsRecommended")}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {t("assistant.itemsGroupedByCategory", { count: msg.suggestion.items.length })}
                            </div>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2">
                          {ITEM_CATEGORY_IDS.map((cat) => {
                            const items = msg.suggestion!.items.filter((it) => it.category === cat);
                            if (items.length === 0) return null;
                            const catWeight = items.reduce((a, it) => a + it.weight * (it.quantity ?? 1), 0);
                            return (
                              <div key={cat} className="border border-border rounded-xl bg-muted/20 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[11px]">{tc(cat)}</Badge>
                                    <span className="text-xs text-muted-foreground">{items.length}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-muted-foreground">{catWeight.toFixed(2)} {t("common.kg")}</span>
                                </div>
                                <ul className="divide-y divide-border">
                                  {items.map((it, i) => (
                                    <li key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                                      <span className="truncate pr-2">
                                        {ti(it.name)}
                                        {it.quantity && it.quantity > 1 ? <span className="text-muted-foreground"> × {it.quantity}</span> : null}
                                      </span>
                                      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                                        {(it.weight * (it.quantity ?? 1)).toFixed(2)} {t("common.kg")}
                                        <WeightExplainButton
                                          name={it.name}
                                          category={it.category}
                                          weight={it.weight}
                                          quantity={it.quantity ?? 1}
                                          source="assistant"
                                        />
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center bg-muted text-foreground border border-border">
                <Bot size={16} />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-muted/50 text-foreground border border-border rounded-tl-sm flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("assistant.packing")}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modify suggestion dialog */}
      <Dialog open={!!editingMsgId} onOpenChange={(o) => !o && setEditingMsgId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("assistant.modifySuggestedTitle")}</DialogTitle>
            <DialogDescription>
              {t("assistant.modifySuggestedDesc")}
            </DialogDescription>
          </DialogHeader>
          {editingMsg?.suggestion && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto overflow-x-hidden pr-1">
              {editingMsg.suggestion.items.map((it, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-md border border-border p-2 sm:grid sm:grid-cols-12 sm:items-center sm:gap-2 sm:space-y-0"
                >
                  <Input
                    className="sm:col-span-4"
                    value={it.name}
                    onChange={(e) => {
                      const items = [...editingMsg.suggestion!.items];
                      items[idx] = { ...it, name: e.target.value };
                      updateMessageSuggestion(editingMsg.id, {
                        ...editingMsg.suggestion!,
                        items,
                      });
                    }}
                  />
                  <Select
                    value={it.category}
                    onValueChange={(v) => {
                      const items = [...editingMsg.suggestion!.items];
                      items[idx] = { ...it, category: v };
                      updateMessageSuggestion(editingMsg.id, {
                        ...editingMsg.suggestion!,
                        items,
                      });
                    }}
                  >
                    <SelectTrigger className="sm:col-span-3">
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
                  <div className="flex gap-2 sm:contents">
                    <Input
                      className="flex-1 sm:col-span-2"
                      type="number"
                      min={1}
                      value={it.quantity ?? 1}
                    onChange={(e) => {
                      const items = [...editingMsg.suggestion!.items];
                      items[idx] = { ...it, quantity: parseInt(e.target.value) || 1 };
                      updateMessageSuggestion(editingMsg.id, {
                        ...editingMsg.suggestion!,
                        items,
                      });
                    }}
                    />
                    <Input
                      className="flex-1 sm:col-span-2"
                      type="number"
                      step="0.1"
                      value={it.weight}
                    onChange={(e) => {
                      const items = [...editingMsg.suggestion!.items];
                      items[idx] = { ...it, weight: parseFloat(e.target.value) || 0 };
                      updateMessageSuggestion(editingMsg.id, {
                        ...editingMsg.suggestion!,
                        items,
                      });
                    }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-red-500 sm:col-span-1"
                    onClick={() => {
                      const items = editingMsg.suggestion!.items.filter((_, i) => i !== idx);
                      updateMessageSuggestion(editingMsg.id, {
                        ...editingMsg.suggestion!,
                        items,
                      });
                    }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const items = [
                    ...editingMsg.suggestion!.items,
                    { name: t("assistant.newItem"), category: ITEM_CATEGORY_IDS.at(-1) ?? "Otros", quantity: 1, weight: 0.2 },
                  ];
                  updateMessageSuggestion(editingMsg.id, {
                    ...editingMsg.suggestion!,
                    items,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> {t("assistant.addItem")}
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMsgId(null)}>
              {t("common.close")}
            </Button>
            <Button
              onClick={() => {
                setEditingMsgId(null);
                toast.success(t("assistant.listUpdated"));
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create suitcase dialog */}
      <Dialog open={!!createMsgId} onOpenChange={(o) => !o && setCreateMsgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assistant.createSuitcaseTitle")}</DialogTitle>
            <DialogDescription>
              {t("assistant.createSuitcaseDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("assistant.suitcaseName")}</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("assistant.suitcaseType")}</label>
                <Select
                  value={createForm.type}
                  onValueChange={(v: SuitcaseType) =>
                    setCreateForm({
                      ...createForm,
                      type: v,
                      maxWeight: v === "cabina" ? 10 : 23,
                    })
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
                <label className="text-sm font-medium">{t("assistant.maxWeight")} ({t("common.kg")})</label>
                <Input
                  type="number"
                  step="0.5"
                  value={createForm.maxWeight}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      maxWeight: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateMsgId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmCreate}>{t("assistant.createAndOpen")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
