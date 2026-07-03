import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  searchDestinationCatalog,
  searchDestinations,
  type DestinationSuggestion,
} from "@/lib/destinations/search";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
};

const DEBOUNCE_MS = 280;

export function DestinationCombobox({
  value,
  onChange,
  disabled,
  placeholder = "Ej: Madrid, España",
  maxLength = 120,
}: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const updateSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const instant = searchDestinationCatalog(trimmed);
    setSuggestions(instant);

    setLoading(true);
    try {
      const merged = await searchDestinations(trimmed);
      setSuggestions(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void updateSuggestions(value);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, open, updateSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = (label: string) => {
    onChange(label);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && value.trim()) {
        setOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex].label);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showList = open && value.trim().length > 0 && (suggestions.length > 0 || loading);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          setOpen(true);
          if (value.trim()) {
            setSuggestions(searchDestinationCatalog(value));
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {showList && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"
        >
          {loading && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Buscando destinos…
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto p-1">
              {suggestions.map((item, index) => (
                <li key={item.label} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-muted/80",
                      index === activeIndex && "bg-muted",
                      item.kind === "country" && "font-medium",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(item.label)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <MapPin
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        item.kind === "country" ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.kind === "country" && (
                      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        País
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {loading && suggestions.length > 0 && (
            <div className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Ampliando resultados…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
