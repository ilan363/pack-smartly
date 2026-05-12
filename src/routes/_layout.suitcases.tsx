import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_layout/suitcases")({
  component: SuitcasesPage,
});

type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  weight: number; // in kg
};

function SuitcasesPage() {
  const [items, setItems] = useState<Item[]>([
    { id: "1", name: "Remera térmica", category: "Remeras", quantity: 3, weight: 0.15 },
    { id: "2", name: "Pantalón de nieve", category: "Pantalones", quantity: 1, weight: 0.8 },
    { id: "3", name: "Botas", category: "Zapatillas", quantity: 1, weight: 1.2 },
    { id: "4", name: "Laptop", category: "Electrónica", quantity: 1, weight: 1.5 },
  ]);

  const [newItem, setNewItem] = useState({ name: "", category: "", quantity: 1, weight: 0 });

  const maxWeight = 10;
  const currentWeight = items.reduce((acc, item) => acc + (item.weight * item.quantity), 0);
  const percentage = (currentWeight / maxWeight) * 100;

  let statusColor = "bg-primary";
  let statusText = "bg-primary";
  if (percentage > 90) {
    statusColor = "bg-red-500";
    statusText = "text-red-500";
  } else if (percentage > 75) {
    statusColor = "bg-yellow-500";
    statusText = "text-yellow-600 dark:text-yellow-500";
  }

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || newItem.weight <= 0) return;
    setItems([...items, { ...newItem, id: Math.random().toString() }]);
    setNewItem({ name: "", category: "", quantity: 1, weight: 0 });
  };

  const handleRemove = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Valija de Cabina</h1>
          <p className="text-muted-foreground mt-1">Viaje a Bariloche</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Editar Valija</Button>
        </div>
      </div>

      {/* Progress Section */}
      <Card className="p-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {currentWeight.toFixed(2)} kg <span className="text-muted-foreground text-sm font-normal">/ {maxWeight} kg</span>
            </div>
          </div>
          <div className={`font-semibold ${statusText}`}>
            {percentage > 100 ? "Excedido" : `${(maxWeight - currentWeight).toFixed(2)} kg libres`}
          </div>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${statusColor} transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
        {percentage > 90 && (
          <div className="flex items-center gap-2 text-red-500 text-sm mt-3 bg-red-500/10 p-2 rounded-md">
            <AlertCircle className="h-4 w-4" />
            Atención: Estás muy cerca del límite de peso permitido para cabina.
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
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className="font-normal">{item.category}</Badge>
                      </td>
                      <td className="p-4 text-right">{item.quantity}</td>
                      <td className="p-4 text-right text-muted-foreground">{item.weight} kg</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => handleRemove(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
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
                onChange={e => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select 
                value={newItem.category} 
                onValueChange={v => setNewItem({...newItem, category: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Remeras">Remeras</SelectItem>
                  <SelectItem value="Pantalones">Pantalones</SelectItem>
                  <SelectItem value="Abrigos">Abrigos</SelectItem>
                  <SelectItem value="Zapatillas">Zapatillas</SelectItem>
                  <SelectItem value="Higiene">Higiene</SelectItem>
                  <SelectItem value="Electrónica">Electrónica</SelectItem>
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
                  onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso (kg)</label>
                <Input 
                  type="number" 
                  step="0.1"
                  value={newItem.weight || ""}
                  onChange={e => setNewItem({...newItem, weight: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <Button className="w-full mt-2" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> Agregar a valija
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}