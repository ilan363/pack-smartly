import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Plus, Trash2, BookmarkPlus, Loader2, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudSun } from "lucide-react";
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
    const a = new Date(form.from).getTime();
    const b = new Date(form.to).getTime();
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
    const occasion = form.occasion.trim();
    const notes = form.notes.trim();
    const userText = [
      `Destino: ${destination}`,
      `Desde: ${form.from}`,
      `Hasta: ${form.to}`,
      `Días: ${days}`,
      occasion ? `Ocasión: ${occasion}` : null,
      notes ? `Notas: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    addMessage({ id: Date.now().toString(), role: "user", content: userText });
    setLoading(true);

    try {
      const res = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userText,
          destination,
          days,
          occasion: occasion || undefined,
          from: form.from,
          to: form.to,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        if (res.status === 429) {
          toast.error("Demasiadas consultas, esperá un momento.");
        } else if (res.status === 402) {
          toast.error("Sin créditos de IA. Agregalos en Settings → Usage.");
        } else {
          toast.error(err.error || "No pude generar la lista");
        }
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Tuve un problema generando la lista. ¿Probamos de nuevo?",
        });
        return;
      }
      const data = (await res.json()) as {
        destination: string;
        weather: string;
        days: number;
        occasion: string;
        items: SuggestionItem[];
        forecast?: import("@/lib/chat-store").ForecastDay[];
      };
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
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asistente IA</h1>
          <p className="text-muted-foreground mt-1">Arma tu valija automáticamente</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => resetChat()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva consulta
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-background border-border shadow-sm">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground border border-border"
                }`}
              >
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div
                className={`flex flex-col gap-2 max-w-[80%] ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/50 text-foreground border border-border rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                </div>

                {msg.suggestion && (
                  <div className="mt-2 w-full border border-border rounded-xl bg-card overflow-hidden text-sm">
                    <div className="bg-primary/5 p-4 border-b border-border">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Lista sugerida: {msg.suggestion.destination}
                      </div>
                      <div className="text-muted-foreground">
                        Clima: {msg.suggestion.weather}
                      </div>
                    </div>
                    {msg.suggestion.forecast && msg.suggestion.forecast.length > 0 && (
                      <div className="p-4 border-b border-border bg-muted/20">
                        <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                          Cronograma del clima ({msg.suggestion.forecast.length} día{msg.suggestion.forecast.length === 1 ? "" : "s"})
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {msg.suggestion.forecast.map((f) => {
                            const Icon = f.icon === "sun" ? Sun : f.icon === "cloud" ? Cloud : f.icon === "rain" ? CloudRain : f.icon === "snow" ? CloudSnow : f.icon === "storm" ? CloudLightning : CloudSun;
                            const tone = f.icon === "snow" ? "text-sky-500" : f.icon === "rain" || f.icon === "storm" ? "text-blue-500" : f.icon === "cloud" ? "text-muted-foreground" : "text-amber-500";
                            return (
                              <div key={f.day} className="border border-border rounded-lg p-2 bg-background flex flex-col items-center text-center">
                                <div className="text-[11px] font-semibold text-muted-foreground">Día {f.day}</div>
                                <div className="text-[10px] text-muted-foreground">{f.label}</div>
                                <Icon className={`h-6 w-6 my-1 ${tone}`} />
                                <div className="text-sm font-bold">{f.tempMax}° / <span className="text-muted-foreground font-medium">{f.tempMin}°</span></div>
                                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{f.conditions}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="p-4 space-y-3">
                      <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Prendas recomendadas
                      </div>
                      {msg.suggestion.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-5">
                              {item.category}
                            </Badge>
                            <span>
                              {item.name}
                              {item.quantity && item.quantity > 1
                                ? ` (x${item.quantity})`
                                : ""}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {(item.weight * (item.quantity ?? 1)).toFixed(2)} kg
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted/30 p-4 border-t border-border flex justify-between items-center">
                      <span className="font-medium">Peso estimado:</span>
                      <span className="font-bold text-primary">
                        {msg.suggestion.totalWeight.toFixed(2)} kg
                      </span>
                    </div>
                    <div className="p-4 border-t border-border flex flex-wrap gap-2">
                      <Button className="flex-1 min-w-[180px]" size="sm" onClick={() => openCreate(msg)}>
                        Crear valija con esta lista
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => saveAsChecklist(msg)}
                      >
                        <BookmarkPlus className="h-4 w-4 mr-1" />
                        Guardar lista
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMsgId(msg.id)}
                      >
                        Modificar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
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

        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2 mx-auto">
            <Input
              placeholder="Ej: Voy 3 días a un casamiento en España..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              className="rounded-full bg-muted/30 border-border focus-visible:ring-primary/20 h-12"
            />
            <Button
              size="icon"
              className="rounded-full h-12 w-12 shrink-0 bg-primary hover:bg-primary/90"
              onClick={handleSend}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <div className="text-center mt-3 flex justify-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-muted font-normal"
              onClick={() => setInput("Voy a una boda en la playa")}
            >
              Voy a una boda en la playa
            </Badge>
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-muted font-normal"
              onClick={() => setInput("Solo llevo equipaje de mano")}
            >
              Solo equipaje de mano
            </Badge>
          </div>
        </div>
      </Card>

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
