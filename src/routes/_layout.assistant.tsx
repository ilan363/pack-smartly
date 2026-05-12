import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_layout/assistant")({
  component: AssistantPage,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestion?: {
    destination: string;
    weather: string;
    items: { category: string; name: string; weight: number }[];
    totalWeight: number;
  };
};

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content: "¡Hola! Soy tu asistente de equipaje. Cuéntame sobre tu próximo viaje (destino, clima, cantidad de días, eventos) y te armaré la valija ideal.",
};

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Basado en tu viaje a Ushuaia en invierno por 5 días, he preparado una lista optimizada para el frío. Te sugiero llevar ropa térmica en capas y calzado impermeable.",
        suggestion: {
          destination: "Ushuaia, Argentina",
          weather: "Frío extremo, Nieve (-2°C a -8°C)",
          totalWeight: 8.5,
          items: [
            { category: "Remeras", name: "Remeras térmicas (5)", weight: 1.5 },
            { category: "Pantalones", name: "Pantalones impermeables (2)", weight: 1.8 },
            { category: "Abrigos", name: "Campera de nieve (1)", weight: 2.0 },
            { category: "Zapatillas", name: "Botas de trekking (1)", weight: 1.5 },
            { category: "Accesorios", name: "Guantes, Bufanda, Gorro", weight: 0.8 },
            { category: "Higiene", name: "Kit básico", weight: 0.9 },
          ]
        }
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asistente IA</h1>
          <p className="text-muted-foreground mt-1">Arma tu valija automáticamente</p>
        </div>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva consulta
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-background border-border shadow-sm">
        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border"
              }`}>
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`px-4 py-3 rounded-2xl ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-muted/50 text-foreground border border-border rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
                
                {msg.suggestion && (
                  <div className="mt-2 w-full border border-border rounded-xl bg-card overflow-hidden text-sm">
                    <div className="bg-primary/5 p-4 border-b border-border">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Lista sugerida: {msg.suggestion.destination}
                      </div>
                      <div className="text-muted-foreground">Clima: {msg.suggestion.weather}</div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Prendas recomendadas</div>
                      {msg.suggestion.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-5">{item.category}</Badge>
                            <span>{item.name}</span>
                          </div>
                          <span className="text-muted-foreground text-xs">{item.weight} kg</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-muted/30 p-4 border-t border-border flex justify-between items-center">
                      <span className="font-medium">Peso estimado:</span>
                      <span className="font-bold text-primary">{msg.suggestion.totalWeight} kg</span>
                    </div>
                    <div className="p-4 border-t border-border flex gap-2">
                      <Button className="w-full" size="sm">Crear valija con esta lista</Button>
                      <Button variant="outline" size="sm">Modificar</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
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
            <Badge variant="secondary" className="cursor-pointer hover:bg-muted font-normal" onClick={() => setInput("Voy a una boda en la playa")}>
              Voy a una boda en la playa
            </Badge>
            <Badge variant="secondary" className="cursor-pointer hover:bg-muted font-normal" onClick={() => setInput("Solo llevo equipaje de mano")}>
              Solo equipaje de mano
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}