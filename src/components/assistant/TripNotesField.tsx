import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_NOTES = 12;
const MAX_NOTE_LENGTH = 120;

type Props = {
  notes: string[];
  onChange: (notes: string[]) => void;
  disabled?: boolean;
};

export function TripNotesField({ notes, onChange, disabled }: Props) {
  const updateNote = (index: number, value: string) => {
    const next = [...notes];
    next[index] = value;
    onChange(next);
  };

  const addNote = () => {
    if (notes.length >= MAX_NOTES) return;
    onChange([...notes, ""]);
  };

  const removeNote = (index: number) => {
    if (notes.length <= 1) {
      onChange([""]);
      return;
    }
    onChange(notes.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {notes.map((note, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={note}
            onChange={(e) => updateNote(index, e.target.value)}
            disabled={disabled}
            placeholder={
              index === 0
                ? "Ej: anteojos de sol, mate, pijama…"
                : "Otra cosa a tener en cuenta"
            }
            maxLength={MAX_NOTE_LENGTH}
            aria-label={`Nota ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-red-500"
            onClick={() => removeNote(index)}
            disabled={disabled || (notes.length === 1 && !note.trim())}
            aria-label={`Quitar nota ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addNote}
        disabled={disabled || notes.length >= MAX_NOTES}
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar nota
      </Button>

      {notes.length >= MAX_NOTES ? (
        <p className="text-[11px] text-muted-foreground">Máximo {MAX_NOTES} notas.</p>
      ) : null}
    </div>
  );
}

export function formatTripNotesForPrompt(notes: string[]): string | null {
  const active = notes.map((n) => n.trim()).filter(Boolean);
  if (active.length === 0) return null;
  return `Notas:\n${active.map((n) => `- ${n}`).join("\n")}`;
}
