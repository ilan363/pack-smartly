import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatAirportOption,
  getAirportByCode,
  IATA_AIRPORTS,
  searchIataAirports,
} from "@/lib/airports/iata";

type Props = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
};

const FILTERED_CAP = 500;

export function IataAirportCombobox({ value, onChange, disabled, id }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = getAirportByCode(value);

  const { options, total, capped } = useMemo(() => {
    const matches = searchIataAirports(search);
    const hasFilter = search.trim().length > 0;
    if (!hasFilter) {
      return { options: matches, total: matches.length, capped: false };
    }
    return {
      options: matches.slice(0, FILTERED_CAP),
      total: matches.length,
      capped: matches.length > FILTERED_CAP,
    };
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10 px-3",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {selected
              ? formatAirportOption(selected)
              : value
                ? value.toUpperCase()
                : "Elegí o buscá un aeropuerto"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 h-10"
            placeholder="Código, ciudad o país (ej: EZE, Miami, MAD)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border">
          {search.trim()
            ? `${total} resultado${total === 1 ? "" : "s"}`
            : `${IATA_AIRPORTS.length} aeropuertos · orden alfabético por código IATA`}
        </p>
        <div className="max-h-72 overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay aeropuertos con ese criterio.
            </p>
          ) : (
            options.map((airport) => {
              const active = value.toUpperCase() === airport.code;
              return (
                <button
                  key={airport.code}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80",
                    active && "bg-muted",
                  )}
                  onClick={() => {
                    onChange(airport.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{formatAirportOption(airport)}</span>
                </button>
              );
            })
          )}
          {capped && (
            <p className="px-2 py-2 text-[11px] text-muted-foreground border-t border-border mt-1">
              Mostrando {FILTERED_CAP} de {total}. Escribí más letras para acotar.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
