import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Plus, Trash2, BookmarkPlus, Loader2, CloudSun, ChevronDown } from "lucide-react";
import { DailyForecastCards } from "@/components/weather/DailyForecastCards";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { generatePackSuggestion } from "@/lib/pack-service";

export const Route = createFileRoute("/_layout/assistant")({
  component: AssistantPage,
});

type SuggestionItem = { category: string; name: string; weight: number; quantity?: number };
type Suggestion = ChatSuggestion;
type Message = ChatMessage;

const CATEGORIES = [
  "Remeras",
  "Pantalones",
  "Abrigos",
  "Zapatillas",
  "Accesorios",
  "Higiene",
  "Electrónica",
  "Otros",
];

function AssistantPage() {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateSuggestionInStore = useChatStore((s) => s.updateSuggestion);
  const resetChat = useChatStore((s) => s.reset);
  const [form, setForm] = useState({
    destination: "",
    from: "",
    to: "",
    occasion: "",
    notes: "",
    suitcaseCapacityKg: 23,
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

  const handleSend = async () => {
    if (loading) return;
    const destination = form.destination.trim();
    if (!destination) {
      toast.error("Indicá el destino");
      return;
    }
    if (!form.from || !form.to) {
      toast.error("Indicá las fechas del viaje");
      return;
    }
    const days = computeDays();
    if (days <= 0) {
      toast.error("Las fechas no son válidas");
      return;
    }
    if (!Number.isFinite(form.suitcaseCapacityKg) || form.suitcaseCapacityKg < 5) {
      toast.error("Indicá la capacidad de la valija (mín. 5 kg)");
      return;
    }
    const occasion = form.occasion.trim();
    const notes = form.notes.trim();
    const userText = [
      `Destino: ${destination}`,
      `Desde: ${form.from}`,
      `Hasta: ${form.to}`,
      `Días: ${days}`,
      `Capacidad de valija: ${Math.round(form.suitcaseCapacityKg)} kg`,
      occasion ? `Ocasión: ${occasion}` : null,
      notes ? `Notas: ${notes}` : null,
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
        },
      });
      const totalWeight = data.items.reduce(
        (acc, it) => acc + it.weight * (it.quantity ?? 1),
        0,
      );
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Armé una valija para ${data.days} día${data.days === 1 ? "" : "s"} en ${data.destination} (${data.occasion}). Mirá el cronograma del clima abajo.`,
        suggestion: {
          destination: data.destination,
          weather: data.weather,
          days: data.days,
          occasion: data.occasion,
          items: data.items,
          totalWeight,
          suitcaseCapacityKg: data.suitcaseCapacityKg,
          forecast: data.forecast,
        },
      });
    } catch {
      toast.error("No pude conectar con el asistente.");
    } finally {
      setLoading(false);
    }
  };

  const saveAsChecklist = (msg: Message) => {
    if (!msg.suggestion) return;
    const s = msg.suggestion;
    const id = addChecklist({
      title: `${s.destination}${s.days ? ` · ${s.days}d` : ""}${s.occasion ? ` · ${s.occasion}` : ""}`,
      destination: s.destination,
      days: s.days ?? 1,
      weather: s.weather,
      occasion: s.occasion ?? "Viaje",
      items: s.items.map((it) => ({
        name: it.name,
        category: it.category,
        quantity: it.quantity ?? 1,
        weight: it.weight,
      })),
    });
    toast.success("Lista guardada", {
      description: "La podés tachar a medida que la metes en la valija.",
      action: { label: "Ver", onClick: () => navigate({ to: "/checklists" }) },
    });
    return id;
  };


  const updateMessageSuggestion = (msgId: string, suggestion: Suggestion) => {
    const total = suggestion.items.reduce(
      (acc, it) => acc + it.weight * (it.quantity ?? 1),
      0,
    );
    updateSuggestionInStore(msgId, { ...suggestion, totalWeight: total });
  };

  const editingMsg = messages.find((m) => m.id === editingMsgId);
  const createMsg = messages.find((m) => m.id === createMsgId);

  const openCreate = (msg: Message) => {
    if (!msg.suggestion) return;
    setCreateForm({
      name: `Valija ${msg.suggestion.destination.split(",")[0]}`,
      type: "cabina",
      maxWeight: 10,
    });
    setCreateMsgId(msg.id);
  };

  const confirmCreate = () => {
    if (!createMsg?.suggestion) return;
    if (!createForm.name.trim() || createForm.maxWeight <= 0) {
      toast.error("Completá nombre y peso máximo.");
      return;
    }
    const id = addSuitcase({
      name: createForm.name,
      destination: createMsg.suggestion.destination,
      type: createForm.type,
      maxWeight: createForm.maxWeight,
      items: createMsg.suggestion.items.map((it) => ({
        name: it.name,
        category: it.category,
        quantity: it.quantity ?? 1,
        weight: it.weight,
      })),
    });
    setActive(id);
    setCreateMsgId(null);
    toast.success(`Valija "${createForm.name}" creada con ${createMsg.suggestion.items.length} items`);
    navigate({ to: "/suitcases" });
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asistente IA</h1>
          <p className="text-muted-foreground mt-1">Arma tu valija automáticamente</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => resetChat()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva consulta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        {/* LEFT: Form */}
        <Card className="p-5 lg:sticky lg:top-4 bg-background border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold leading-tight">Nuevo viaje</div>
              <div className="text-xs text-muted-foreground">Completá los datos y armo todo</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destino</label>
              <Input
                placeholder="Ej: Madrid, España"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                disabled={loading}
                className="mt-1"
                maxLength={120}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desde</label>
                <Input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} disabled={loading} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hasta</label>
                <Input type="date" value={form.to} min={form.from || undefined} onChange={(e) => setForm({ ...form, to: e.target.value })} disabled={loading} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ocasión</label>
              <Input placeholder="Casamiento, trabajo, playa..." value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} disabled={loading} className="mt-1" maxLength={120} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacidad de la valija (kg)</label>
              <Input
                type="number"
                min={5}
                max={60}
                step={0.5}
                value={form.suitcaseCapacityKg}
                onChange={(e) =>
                  setForm({
                    ...form,
                    suitcaseCapacityKg: parseFloat(e.target.value) || 0,
                  })
                }
                disabled={loading}
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Ej: cabina 10–12 kg · bodega 20–23 kg
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas (opcional)</label>
              <Input placeholder="Algo más a tener en cuenta" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={loading} className="mt-1" maxLength={300} />
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
            {form.from && form.to && computeDays() > 0
              ? `${computeDays()} día${computeDays() === 1 ? "" : "s"} de viaje`
              : "Completá las fechas para calcular los días"}
          </div>

          <Button className="w-full mt-4 bg-primary hover:bg-primary/90" onClick={handleSend} disabled={loading} size="lg">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Armando...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Armar valija</>
            )}
          </Button>
        </Card>

        {/* RIGHT: Conversation + Results */}
        <div ref={scrollRef} className="space-y-6 min-h-[60vh]">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-4">
              <div className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"}`}>
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`px-4 py-3 rounded-2xl max-w-[85%] text-sm whitespace-pre-line ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted/50 text-foreground border border-border rounded-tl-sm"}`}>
                  {msg.content}
                </div>
              </div>

              {msg.suggestion && (
                <div className="space-y-4">
                  {/* HEADER summary */}
                  <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold">Lista sugerida</div>
                        <h2 className="text-2xl font-bold mt-1">{msg.suggestion.destination}</h2>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary">{msg.suggestion.days} día{msg.suggestion.days === 1 ? "" : "s"}</Badge>
                          <Badge variant="secondary">{msg.suggestion.occasion}</Badge>
                          {msg.suggestion.suitcaseCapacityKg ? (
                            <Badge variant="secondary">{msg.suggestion.suitcaseCapacityKg} kg</Badge>
                          ) : null}
                          <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20">{msg.suggestion.items.length} items</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3 max-w-xl">{msg.suggestion.weather}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Peso total</div>
                        <div className="text-3xl font-bold text-primary">{msg.suggestion.totalWeight.toFixed(2)}<span className="text-base font-medium text-muted-foreground ml-1">kg</span></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                      <Button onClick={() => openCreate(msg)} className="flex-1 min-w-[180px]">
                        Crear valija con esta lista
                      </Button>
                      <Button variant="secondary" onClick={() => saveAsChecklist(msg)}>
                        <BookmarkPlus className="h-4 w-4 mr-1" /> Guardar lista
                      </Button>
                      <Button variant="outline" onClick={() => setEditingMsgId(msg.id)}>
                        Modificar
                      </Button>
                    </div>
                  </Card>

                  {/* WEATHER SCHEDULE — prominent */}
                  {msg.suggestion.forecast && msg.suggestion.forecast.length > 0 && (
                    <Card className="overflow-hidden border-border">
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group border-b border-border">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                              <CloudSun className="h-5 w-5" />
                            </div>
                            <div className="text-left">
                              <div className="font-bold">Clima del viaje</div>
                              <div className="text-xs text-muted-foreground">
                                Pronóstico por fecha · {msg.suggestion.forecast.length} día
                                {msg.suggestion.forecast.length === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 pt-2">
                            <DailyForecastCards
                              compact
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
                  <Card className="overflow-hidden border-border">
                    <Collapsible defaultOpen>
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <div className="font-bold">Prendas recomendadas</div>
                            <div className="text-xs text-muted-foreground">{msg.suggestion.items.length} items agrupados por categoría</div>
                          </div>
                        </div>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=closed]:rotate-[-90deg]" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {CATEGORIES.map((cat) => {
                            const items = msg.suggestion!.items.filter((it) => it.category === cat);
                            if (items.length === 0) return null;
                            const catWeight = items.reduce((a, it) => a + it.weight * (it.quantity ?? 1), 0);
                            return (
                              <div key={cat} className="border border-border rounded-xl bg-muted/20 overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[11px]">{cat}</Badge>
                                    <span className="text-xs text-muted-foreground">{items.length}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-muted-foreground">{catWeight.toFixed(2)} kg</span>
                                </div>
                                <ul className="divide-y divide-border">
                                  {items.map((it, i) => (
                                    <li key={i} className="flex justify-between items-center px-3 py-2 text-sm">
                                      <span className="truncate pr-2">
                                        {it.name}
                                        {it.quantity && it.quantity > 1 ? <span className="text-muted-foreground"> × {it.quantity}</span> : null}
                                      </span>
                                      <span className="text-xs text-muted-foreground shrink-0">{(it.weight * (it.quantity ?? 1)).toFixed(2)} kg</span>
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
                Armando tu valija...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modify suggestion dialog */}
      <Dialog open={!!editingMsgId} onOpenChange={(o) => !o && setEditingMsgId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modificar lista sugerida</DialogTitle>
            <DialogDescription>
              Ajustá los items antes de crear la valija.
            </DialogDescription>
          </DialogHeader>
          {editingMsg?.suggestion && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {editingMsg.suggestion.items.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center border border-border rounded-md p-2"
                >
                  <Input
                    className="col-span-4"
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
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-2"
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
                    className="col-span-2"
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
                    className="col-span-1 text-muted-foreground hover:text-red-500"
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
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const items = [
                    ...editingMsg.suggestion!.items,
                    { name: "Nuevo item", category: "Otros", quantity: 1, weight: 0.2 },
                  ];
                  updateMessageSuggestion(editingMsg.id, {
                    ...editingMsg.suggestion!,
                    items,
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Agregar item
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMsgId(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() => {
                setEditingMsgId(null);
                toast.success("Lista actualizada");
              }}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create suitcase dialog */}
      <Dialog open={!!createMsgId} onOpenChange={(o) => !o && setCreateMsgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear valija</DialogTitle>
            <DialogDescription>
              Asigná un nombre, tipo y peso máximo. Los items sugeridos se cargarán
              automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
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
                    <SelectItem value="cabina">Cabina</SelectItem>
                    <SelectItem value="bodega">Bodega</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso máx. (kg)</label>
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
              Cancelar
            </Button>
            <Button onClick={confirmCreate}>Crear y abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
