import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { CheckSquare, Square, Trash2, ListChecks, AlertCircle, Share2, Mail, MessageCircle, Copy, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { Checklist } from "@/lib/checklists-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useChecklistsStore } from "@/lib/checklists-store";

export const Route = createFileRoute("/_layout/checklists")({
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const checklists = useChecklistsStore((s) => s.checklists);
  const toggleItem = useChecklistsStore((s) => s.toggleItem);
  const removeChecklist = useChecklistsStore((s) => s.removeChecklist);

  // Reminder on mount: if any checklist has pending items, warn
  const reminders = useMemo(
    () =>
      checklists
        .map((c) => ({ c, pending: c.items.filter((i) => !i.checked) }))
        .filter((x) => x.pending.length > 0),
    [checklists],
  );

  useEffect(() => {
    if (reminders.length === 0) return;
    const t = setTimeout(() => {
      reminders.forEach(({ c, pending }) => {
        toast.warning(`Te faltan ${pending.length} items en "${c.title}"`, {
          description: pending
            .slice(0, 4)
            .map((p) => `• ${p.name}`)
            .join("\n") + (pending.length > 4 ? `\n+${pending.length - 4} más` : ""),
          duration: 6000,
        });
      });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listas guardadas</h1>
          <p className="text-muted-foreground mt-1">
            Marcá lo que ya guardaste en la valija. Te avisamos si te falta algo.
          </p>
        </div>
        <Link to="/assistant">
          <Button>Crear nueva lista</Button>
        </Link>
      </div>

      {checklists.length === 0 ? (
        <Card className="p-12 text-center">
          <ListChecks className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Aún no guardaste ninguna lista.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Pedile al Asistente IA que arme tu valija y guardala desde ahí.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {checklists.map((c) => {
            const done = c.items.filter((i) => i.checked).length;
            const pct = Math.round((done / c.items.length) * 100);
            const pending = c.items.length - done;
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-bold text-lg truncate">{c.title}</h2>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{c.destination}</Badge>
                      <Badge variant="outline">{c.days} días</Badge>
                      <Badge variant="outline">{c.occasion}</Badge>
                      <Badge variant="outline">{c.weather}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {done}/{c.items.length}
                      </div>
                      <div className="text-xs text-muted-foreground">{pct}%</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        removeChecklist(c.id);
                        toast.success("Lista eliminada");
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {pending > 0 && (
                  <div className="px-5 py-2 bg-amber-500/10 border-b border-border flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    Te faltan {pending} {pending === 1 ? "item" : "items"} por guardar.
                  </div>
                )}

                <div className="p-2">
                  {c.items.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => toggleItem(c.id, it.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 text-left transition-colors"
                    >
                      {it.checked ? (
                        <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={`flex-1 text-sm ${
                          it.checked
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {it.name}
                        {it.quantity > 1 ? ` (x${it.quantity})` : ""}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {it.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {(it.weight * it.quantity).toFixed(2)} kg
                      </span>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
