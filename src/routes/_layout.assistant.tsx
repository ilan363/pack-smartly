import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Plus, Trash2, BookmarkPlus, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/_layout/assistant")({
  component: AssistantPage,
});

type SuggestionItem = { category: string; name: string; weight: number; quantity?: number };
type Suggestion = {
  destination: string;
  weather: string;
  days?: number;
  occasion?: string;
  items: SuggestionItem[];
  totalWeight: number;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestion?: Suggestion;
};

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "¡Hola! Soy tu asistente de equipaje. Contame sobre tu próximo viaje (destino, clima, días, eventos) y te armo la valija ideal.",
};

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
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const addSuitcase = useSuitcasesStore((s) => s.addSuitcase);
  const setActive = useSuitcasesStore((s) => s.setActive);

  // Editing the list before creation
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  // Naming/typing the suitcase on create
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

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Basado en tu viaje, armé una lista optimizada. Podés modificarla o crear directamente la valija.",
        suggestion: {
          destination: "Ushuaia, Argentina",
          weather: "Frío extremo, Nieve (-2°C a -8°C)",
          totalWeight: 8.5,
          items: [
            { category: "Remeras", name: "Remeras térmicas", weight: 0.3, quantity: 5 },
            { category: "Pantalones", name: "Pantalones impermeables", weight: 0.9, quantity: 2 },
            { category: "Abrigos", name: "Campera de nieve", weight: 2.0, quantity: 1 },
            { category: "Zapatillas", name: "Botas de trekking", weight: 1.5, quantity: 1 },
            { category: "Accesorios", name: "Guantes, bufanda, gorro", weight: 0.8, quantity: 1 },
            { category: "Higiene", name: "Kit básico", weight: 0.9, quantity: 1 },
          ],
        },
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1200);
  };

  const updateMessageSuggestion = (msgId: string, suggestion: Suggestion) => {
    const total = suggestion.items.reduce(
      (acc, it) => acc + it.weight * (it.quantity ?? 1),
      0,
    );
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, suggestion: { ...suggestion, totalWeight: total } } : m,
      ),
    );
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
          onClick={() => setMessages([INITIAL_MESSAGE])}
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
                    <div className="p-4 border-t border-border flex gap-2">
                      <Button className="w-full" size="sm" onClick={() => openCreate(msg)}>
                        Crear valija con esta lista
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
        </div>

        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2 mx-auto">
            <Input
              placeholder="Ej: Viajo 7 días a Bariloche en invierno..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="rounded-full bg-muted/30 border-border focus-visible:ring-primary/20 h-12"
            />
            <Button
              size="icon"
              className="rounded-full h-12 w-12 shrink-0 bg-primary hover:bg-primary/90"
              onClick={handleSend}
            >
              <Send className="h-5 w-5" />
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
