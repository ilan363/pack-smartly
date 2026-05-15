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

export const Route = createFileRoute("/_layout/suitcases")({
  component: SuitcasesPage,
});

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

function SuitcasesPage() {
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
    weight: 0,
  });

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
    if (!newItem.name || !newItem.category || newItem.weight <= 0) {
      toast.error("Completá nombre, categoría y peso.");
      return;
    }
    addItem(active.id, newItem);
    setNewItem({ name: "", category: "", quantity: 1, weight: 0 });
    toast.success(`"${newItem.name}" agregado a ${active.name}`);
  };

  const handleDeleteSuitcase = () => {
    if (confirm(`¿Eliminar la valija "${active.name}"?`)) {
      removeSuitcase(active.id);
      toast.success("Valija eliminada");
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
          <p className="text-muted-foreground text-sm">Viaje a {active.destination}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setSuitcaseDialog({ mode: "edit", id: active.id })}>
            <Edit2 className="h-4 w-4 mr-2" /> Editar
          </Button>
          <Button variant="outline" onClick={handleDeleteSuitcase}>
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar
          </Button>
          <Button onClick={() => setSuitcaseDialog({ mode: "create" })}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Valija
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
              ? `Excedido por ${(currentWeight - active.maxWeight).toFixed(2)} kg`
              : `${(active.maxWeight - currentWeight).toFixed(2)} kg libres`}
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${statusColor} transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {percentage > 90 && (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-3 bg-red-500/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            Atención: Estás muy cerca del límite de peso permitido.
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold">Prendas y Objetos</h2>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left font-medium p-4">Item</th>
                    <th className="text-left font-medium p-4">Categoría</th>
                    <th className="text-right font-medium p-4">Cant.</th>
                    <th className="text-right font-medium p-4">Peso (c/u)</th>
                    <th className="text-right font-medium p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {active.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                    >
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="font-normal">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">{item.quantity}</td>
                      <td className="p-4 text-right text-muted-foreground">
                        {item.weight} kg
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
                            toast.success(`"${item.name}" eliminado`);
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
                        No hay prendas en esta valija.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold">Agregar Item</h2>
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Ej: Remera blanca"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={newItem.category}
                onValueChange={(v) => setNewItem({ ...newItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
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
                <label className="text-sm font-medium">Peso (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={newItem.weight || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <Button className="w-full mt-2" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> Agregar a valija
            </Button>
          </Card>
        </div>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
            <DialogDescription>Modificá los datos del objeto.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={editingItem.category}
                  onValueChange={(v) => setEditingItem({ ...editingItem, category: v })}
                >
                  <SelectTrigger>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cantidad</label>
                  <Input
                    type="number"
                    min="1"
                    value={editingItem.quantity}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Peso (kg)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingItem.weight}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        weight: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
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
                toast.success("Item actualizado");
              }}
            >
              Guardar
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
          toast.success(`Valija "${data.name}" creada`);
        }}
        onUpdate={(id, data) => {
          updateSuitcase(id, data);
          toast.success("Valija actualizada");
        }}
        getInitial={(id) => suitcases.find((s) => s.id === id)}
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
  const addSuitcase = useSuitcasesStore((s) => s.addSuitcase);
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Luggage className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold">No tenés valijas todavía</h2>
      <p className="text-muted-foreground mt-2">Creá tu primera valija para empezar a organizar tu equipaje.</p>
      <Button className="mt-6" onClick={onCreate}>
        <Plus className="h-4 w-4 mr-2" /> Crear valija
      </Button>
      <SuitcaseDialog
        dialog={dialog}
        onClose={onClose}
        onCreate={(d) => {
          addSuitcase(d);
          toast.success(`Valija "${d.name}" creada`);
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
};

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
  const initial =
    dialog?.mode === "edit" ? getInitial(dialog.id) : undefined;

  const [form, setForm] = useState<SuitcaseFormData>({
    name: "",
    destination: "",
    type: "cabina",
    maxWeight: 10,
  });

  // Re-seed form when dialog opens
  const dialogKey = dialog ? `${dialog.mode}-${dialog.mode === "edit" ? dialog.id : "new"}` : null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (dialogKey !== seededKey) {
    setSeededKey(dialogKey);
    if (dialog?.mode === "edit" && initial) {
      setForm(initial);
    } else if (dialog?.mode === "create") {
      setForm({ name: "", destination: "", type: "cabina", maxWeight: 10 });
    }
  }

  const submit = () => {
    if (!form.name.trim() || !form.destination.trim() || form.maxWeight <= 0) {
      toast.error("Completá nombre, destino y peso máximo.");
      return;
    }
    if (dialog?.mode === "edit") onUpdate(dialog.id, form);
    else onCreate(form);
    onClose();
  };

  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog?.mode === "edit" ? "Editar valija" : "Nueva valija"}
          </DialogTitle>
          <DialogDescription>
            Configurá el nombre, destino, tipo y límite de peso.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input
              placeholder="Valija de cabina"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Destino</label>
            <Input
              placeholder="Bariloche"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
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
            Cancelar
          </Button>
          <Button onClick={submit}>
            {dialog?.mode === "edit" ? "Guardar" : "Crear valija"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
