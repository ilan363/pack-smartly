import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BaggageClaim,
  Plane,
  Shield,
  FileText,
  Sliders,
  CloudSun,
  Scale,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { LegalModal, type LegalModalType } from "@/components/legal/LegalModal";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

interface AirlineSpec {
  name: string;
  cabinMaxKg: number;
  cabinDimensions: string;
  holdMaxKg: number;
  holdDimensions: string;
  excessFeePerKg: number;
}

const AIRLINES: AirlineSpec[] = [
  {
    name: "Iberia",
    cabinMaxKg: 10,
    cabinDimensions: "56 x 40 x 25 cm",
    holdMaxKg: 23,
    holdDimensions: "158 cm lineales",
    excessFeePerKg: 15,
  },
  {
    name: "Aerolíneas Argentinas",
    cabinMaxKg: 8,
    cabinDimensions: "55 x 35 x 25 cm",
    holdMaxKg: 15,
    holdDimensions: "158 cm lineales",
    excessFeePerKg: 12,
  },
  {
    name: "LATAM Airlines",
    cabinMaxKg: 10,
    cabinDimensions: "55 x 35 x 25 cm",
    holdMaxKg: 23,
    holdDimensions: "158 cm lineales",
    excessFeePerKg: 18,
  },
  {
    name: "Ryanair",
    cabinMaxKg: 10,
    cabinDimensions: "55 x 40 x 20 cm",
    holdMaxKg: 20,
    holdDimensions: "119 x 119 x 81 cm",
    excessFeePerKg: 20,
  },
  {
    name: "Delta Air Lines",
    cabinMaxKg: 10,
    cabinDimensions: "56 x 35 x 23 cm",
    holdMaxKg: 23,
    holdDimensions: "157 cm lineales",
    excessFeePerKg: 25,
  },
];

interface DemoItem {
  id: string;
  name: string;
  category: string;
  weightKg: number;
  qty: number;
  maxQty: number;
}

const INITIAL_DEMO_ITEMS: DemoItem[] = [
  { id: "1", name: "Remeras y tops de algodón", category: "Ropa", weightKg: 0.2, qty: 4, maxQty: 8 },
  { id: "2", name: "Pantalones y jeans", category: "Ropa", weightKg: 0.65, qty: 2, maxQty: 5 },
  { id: "3", name: "Calzado deportivo", category: "Calzado", weightKg: 0.85, qty: 1, maxQty: 3 },
  { id: "4", name: "Abrigo o campera liviana", category: "Ropa", weightKg: 1.2, qty: 1, maxQty: 2 },
  { id: "5", name: "Neceser con líquidos normados", category: "Aseo", weightKg: 0.75, qty: 1, maxQty: 2 },
  { id: "6", name: "Notebook y cargador USB-C", category: "Tecnología", weightKg: 1.8, qty: 1, maxQty: 2 },
];

function InteractiveLuggageSimulator() {
  const [selectedAirlineIndex, setSelectedAirlineIndex] = useState(0);
  const [luggageType, setLuggageType] = useState<"cabin" | "hold">("cabin");
  const [items, setItems] = useState<DemoItem[]>(INITIAL_DEMO_ITEMS);

  const airline = AIRLINES[selectedAirlineIndex];
  const maxLimit = luggageType === "cabin" ? airline.cabinMaxKg : airline.holdMaxKg;
  const dimensions = luggageType === "cabin" ? airline.cabinDimensions : airline.holdDimensions;

  const currentWeight = useMemo(() => {
    const raw = items.reduce((acc, it) => acc + it.weightKg * it.qty, 0);
    return Math.round(raw * 100) / 100;
  }, [items]);

  const tareWeight = luggageType === "cabin" ? 2.2 : 3.8; // Estimated empty suitcase weight
  const grossWeight = Math.round((currentWeight + tareWeight) * 100) / 100;
  const remainingWeight = Math.max(0, Math.round((maxLimit - grossWeight) * 100) / 100);
  const excessWeight = Math.max(0, Math.round((grossWeight - maxLimit) * 100) / 100);
  const percentage = Math.min(100, Math.round((grossWeight / maxLimit) * 100));

  const changeQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const next = Math.max(0, Math.min(it.maxQty, it.qty + delta));
        return { ...it, qty: next };
      })
    );
  };

  const statusColor =
    excessWeight > 0
      ? "text-red-600 dark:text-red-400"
      : percentage > 85
      ? "text-amber-600 dark:text-amber-400"
      : "text-primary";

  const progressBg =
    excessWeight > 0
      ? "bg-red-500"
      : percentage > 85
      ? "bg-amber-500"
      : "bg-primary";

  return (
    <div className="w-full max-w-5xl mx-auto rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* Simulation Header */}
      <div className="border-b border-border bg-muted/40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Simulador Técnico de Franquicia
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mt-0.5">
            Calibración de Equipaje en Tiempo Real
          </h3>
        </div>

        {/* Segmented Control (Apple Style) */}
        <div className="inline-flex rounded-md border border-border bg-background p-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setLuggageType("cabin")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              luggageType === "cabin"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Equipaje de Mano ({airline.cabinMaxKg} kg)
          </button>
          <button
            type="button"
            onClick={() => setLuggageType("hold")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              luggageType === "hold"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Equipaje en Bodega ({airline.holdMaxKg} kg)
          </button>
        </div>
      </div>

      {/* Simulator Body */}
      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Airline selection & Pack items list */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Aerolínea Reguladora
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AIRLINES.map((a, i) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setSelectedAirlineIndex(i)}
                  className={`p-2.5 text-left text-xs rounded-md border transition-colors ${
                    i === selectedAirlineIndex
                      ? "border-primary bg-primary text-primary-foreground font-medium"
                      : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="font-semibold truncate">{a.name}</div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      i === selectedAirlineIndex
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    Límite: {luggageType === "cabin" ? a.cabinMaxKg : a.holdMaxKg} kg
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Artículos Empacados
              </label>
              <span className="text-xs text-muted-foreground">
                Tolerancia de tara: {tareWeight} kg
              </span>
            </div>

            <div className="space-y-2 border border-border rounded-md divide-y divide-border bg-background">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.category} • {(item.weightKg * item.qty).toFixed(2)} kg
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Disminuir"
                      onClick={() => changeQty(item.id, -1)}
                      disabled={item.qty === 0}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label="Aumentar"
                      onClick={() => changeQty(item.id, 1)}
                      disabled={item.qty >= item.maxQty}
                      className="h-7 w-7 rounded border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Technical Gauge & Compliance Summary */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="rounded-md border border-border bg-muted/20 p-5 space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Peso Bruto Estimado
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-4xl font-bold tabular-nums tracking-tight ${statusColor}`}>
                    {grossWeight.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">/ {maxLimit}.0 kg</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado IATA
                </span>
                <div className="mt-1">
                  {excessWeight > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-500/10 px-2 py-0.5 rounded">
                      Exceso de {excessWeight.toFixed(2)} kg
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Autorizado ({remainingWeight.toFixed(2)} kg libres)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Apple-style Linear Weight Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${progressBg}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>0 kg</span>
                <span>{maxLimit / 2} kg</span>
                <span>{maxLimit} kg máx</span>
              </div>
            </div>

            {/* Specs Table */}
            <div className="pt-2 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensiones autorizadas:</span>
                <span className="font-medium text-foreground">{dimensions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peso neto prendas:</span>
                <span className="font-medium text-foreground">{currentWeight.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valija vacía (tara):</span>
                <span className="font-medium text-foreground">{tareWeight.toFixed(2)} kg</span>
              </div>
              {excessWeight > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold pt-1 border-t border-border">
                  <span>Costo extra estimado en mostrador:</span>
                  <span>~ ${(excessWeight * airline.excessFeePerKg).toFixed(0)} USD</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-background space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Comprobación Automática
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La simulación demuestra cómo Travel Wolf calcula volumetría y previene cargos por exceso
              antes de llegar al mostrador de facturación del aeropuerto.
            </p>
            <div className="pt-1">
              <Link to="/suitcases">
                <Button size="sm" className="w-full h-8 text-xs font-medium">
                  Crear mi valija real
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnicalSpecsMatrix() {
  const specs = [
    {
      title: "Algoritmo Volumétrico",
      detail: "Cálculo matemático de masa textil por categoría, reduciendo el margen de error de pesaje doméstico a menos del 4%.",
    },
    {
      title: "Matriz IATA Global",
      detail: "Integración de franquicias oficiales de equipaje para más de 40 aerolíneas en rutas de cabina y bodega internacional.",
    },
    {
      title: "Previsión Meteorológica",
      detail: "Análisis climático directo a través de Open-Meteo para adaptar la selección de prendas a la temperatura real de destino.",
    },
    {
      title: "Persistencia Segura",
      detail: "Almacenamiento en sandbox local sin recolección de datos sensibles, garantizando privacidad total y acceso sin conexión.",
    },
  ];

  return (
    <section className="mt-28">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Arquitectura del Sistema
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
          Precisión sin adornos innecesarios
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Construido con estándares de ingeniería de software para viajeros que valoran la exactitud y el tiempo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {specs.map((spec) => (
          <div
            key={spec.title}
            className="p-5 rounded-lg border border-border bg-card text-left flex flex-col justify-between"
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                {spec.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                {spec.detail}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Especificación técnica</span>
              <span className="font-semibold text-primary">v2.4</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingNavbar({ onOpenAuth }: { onOpenAuth: (tab: "login" | "register") => void }) {
  const { t } = useI18n();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <BaggageClaim size={16} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Travel Wolf
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <Link to="/suitcases" className="hover:text-foreground transition-colors">
            Valijas
          </Link>
          <Link to="/assistant" className="hover:text-foreground transition-colors">
            Asistente
          </Link>
          <Link to="/weather" className="hover:text-foreground transition-colors">
            Clima
          </Link>
          <Link to="/checklists" className="hover:text-foreground transition-colors">
            Listas
          </Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">
            Contacto
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenAuth("login")}
            className="h-8 text-xs font-medium"
          >
            {t("nav.signIn")}
          </Button>
          <Link to="/dashboard">
            <Button size="sm" className="h-8 px-3.5 text-xs font-medium">
              Comenzar
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function LandingFooter({ onOpenLegal }: { onOpenLegal: (type: LegalModalType) => void }) {
  return (
    <footer className="mt-32 border-t border-border bg-muted/20 py-12 px-6">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <BaggageClaim size={14} />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">Travel Wolf</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Plataforma de cálculo volumétrico de equipaje y planificación técnica para viajes internacionales.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
            Herramientas
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/suitcases" className="hover:text-foreground transition-colors">
                Gestión de Valijas
              </Link>
            </li>
            <li>
              <Link to="/assistant" className="hover:text-foreground transition-colors">
                Asistente Técnico
              </Link>
            </li>
            <li>
              <Link to="/weather" className="hover:text-foreground transition-colors">
                Monitoreo Climático
              </Link>
            </li>
            <li>
              <Link to="/checklists" className="hover:text-foreground transition-colors">
                Listas de Verificación
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
            Cumplimiento Legal
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <button
                type="button"
                onClick={() => onOpenLegal("terms")}
                className="hover:text-foreground transition-colors text-left"
              >
                Términos del Servicio
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onOpenLegal("privacy")}
                className="hover:text-foreground transition-colors text-left"
              >
                Política de Privacidad
              </button>
            </li>
            <li>
              <span className="text-muted-foreground/80">Normativas IATA / OACI</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
            Contacto
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <a href="mailto:josemanbrut@gmail.com" className="hover:text-foreground transition-colors">
                josemanbrut@gmail.com
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/travel_wolf1"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors"
              >
                @travel_wolf1
              </a>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Soporte y Preguntas Frecuentes
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>© 2026 Travel Wolf. Todos los derechos reservados.</span>
        <span>Diseño minimalista de alta precisión. Estilo Apple.</span>
      </div>
    </footer>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [legalModalType, setLegalModalType] = useState<LegalModalType>(null);

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <LandingNavbar onOpenAuth={openAuth} />

      <main className="mx-auto max-w-6xl px-6 pt-28 pb-16 flex-1 w-full">
        {/* Apple Minimalist Hero */}
        <section className="text-center max-w-3xl mx-auto mt-8 mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Sistema de Gestión de Equipaje y Control de Peso
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Equipaje calibrado al gramo.
            <br />
            <span className="text-muted-foreground font-medium">
              Viajes sin sorpresas en el aeropuerto.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground mt-6 leading-relaxed max-w-2xl mx-auto">
            Calcula el peso reglamentario por aerolínea, anticipa las condiciones climáticas en tu destino
            y optimiza cada artículo con exactitud matemática.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link to="/dashboard">
              <Button size="lg" className="h-10 px-6 text-sm font-medium">
                Organizar mi viaje
              </Button>
            </Link>
            <Link to="/assistant">
              <Button variant="outline" size="lg" className="h-10 px-6 text-sm font-medium">
                Ver asistente técnico
              </Button>
            </Link>
          </div>
        </section>

        {/* Real Product Demo Section (Anti-Vibecoding #18) */}
        <section className="mt-8">
          <InteractiveLuggageSimulator />
        </section>

        {/* Architectural Tech Specs Section */}
        <TechnicalSpecsMatrix />
      </main>

      <LandingFooter onOpenLegal={setLegalModalType} />

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
        onSuccess={() => navigate({ to: "/dashboard" })}
        onAdminSuccess={() => navigate({ to: "/admin" })}
      />

      <LegalModal
        openType={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}
