import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BaggageClaim,
  CloudSun,
  ListChecks,
  Luggage,
  Scale,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AuthDialog } from "@/components/AuthDialog";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { LegalModal, type LegalModalType } from "@/components/legal/LegalModal";
import { useI18n } from "@/hooks/use-i18n";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const HOW_IT_WORKS_STEPS: {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    step: 1,
    title: "Entrá a Travel Wolf",
    description: "Creá tu cuenta o iniciá sesión para guardar viajes, valijas y listas.",
    icon: UserRound,
  },
  {
    step: 2,
    title: "Armá tu valija",
    description: "Sumá lo que vas a llevar y mirá el peso estimado mientras empacás.",
    icon: Luggage,
  },
  {
    step: 3,
    title: "Contrastá el límite",
    description: "Compará tu equipaje con la franquicia de cabina o bodega de tu aerolínea.",
    icon: Scale,
  },
  {
    step: 4,
    title: "Mirá el clima",
    description: "Revisá el pronóstico del destino para ajustar ropa y accesorios a tiempo.",
    icon: CloudSun,
  },
  {
    step: 5,
    title: "Cerrá con listas",
    description: "Usá el asistente y las checklists para no olvidarte nada antes de viajar.",
    icon: ListChecks,
  },
];

function HowItWorksCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const sync = () => setCurrent(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);

    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Cómo trabajar con Travel Wolf
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Cinco pasos simples: de la cuenta al aeropuerto, sin excedentes ni olvidos.
        </p>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false }}
        className="relative mx-auto w-full max-w-4xl px-10 sm:px-12"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {HOW_IT_WORKS_STEPS.map((item) => (
            <CarouselItem key={item.step} className="basis-[85%] pl-3 sm:basis-1/2 sm:pl-4 lg:basis-1/3">
              <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Paso {item.step}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="left-0 border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30" />
        <CarouselNext className="right-0 border-border bg-card text-foreground hover:bg-secondary disabled:opacity-30" />
      </Carousel>

      <div className="mt-6 flex items-center justify-center gap-2" aria-label="Progreso de pasos">
        {HOW_IT_WORKS_STEPS.map((item, index) => (
          <button
            key={item.step}
            type="button"
            aria-label={`Ir al paso ${item.step}`}
            aria-current={index === current ? "true" : undefined}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === current ? "w-6 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40",
            )}
          />
        ))}
      </div>
    </section>
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
  const isLoggedIn = Boolean(useAuthStore((s) => s.email));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0c2461]/55 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[#0c2461]">
            <BaggageClaim size={16} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            Travel Wolf
          </span>
        </div>

        {isLoggedIn ? (
          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-white/70">
            <Link to="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link to="/suitcases" className="hover:text-white transition-colors">
              Valijas
            </Link>
            <Link to="/assistant" className="hover:text-white transition-colors">
              Asistente
            </Link>
            <Link to="/weather" className="hover:text-white transition-colors">
              Clima
            </Link>
            <Link to="/checklists" className="hover:text-white transition-colors">
              Listas
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contacto
            </Link>
          </div>
        ) : (
          <div className="hidden md:block" />
        )}

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {isLoggedIn ? (
            <Link to="/dashboard">
              <Button size="sm" className="h-8 px-3.5 text-xs font-medium bg-white text-[#0c2461] hover:bg-white/90">
                Comenzar
              </Button>
            </Link>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenAuth("login")}
                className="h-8 text-xs font-medium text-white hover:bg-white/10 hover:text-white"
              >
                {t("nav.signIn")}
              </Button>
              <Button
                size="sm"
                className="h-8 px-3.5 text-xs font-medium bg-white text-[#0c2461] hover:bg-white/90"
                onClick={() => onOpenAuth("register")}
              >
                Comenzar
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function CinematicHero({ onOpenAuth }: { onOpenAuth: (tab: "login" | "register") => void }) {
  const isLoggedIn = Boolean(useAuthStore((s) => s.email));

  return (
    <section className="relative isolate min-h-[100svh] w-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <img
          src="/1024.jpg"
          alt=""
          className="hero-ken-burns h-full w-full object-cover object-center"
        />
      </div>

      {/* Cinematic grade: navy wash + vignette + bottom fade into page */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(12,36,97,0.18)_0%,rgba(12,36,97,0.55)_55%,rgba(8,20,55,0.82)_100%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0c2461]/70 via-[#0c2461]/35 to-[#0c2461]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c2461] to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-end px-6 pb-20 pt-28 sm:justify-center sm:pb-24 sm:pt-20">
        <div className="hero-copy-in max-w-3xl">
          <p className="mb-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Travel Wolf
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-white/95 sm:text-5xl lg:text-[3.5rem] leading-[1.08] text-balance">
            Equipaje calibrado al gramo.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Calculá el peso por aerolínea y viajá sin sorpresas en el aeropuerto.
          </p>

          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="h-11 w-full px-7 text-sm font-semibold bg-white text-[#0c2461] hover:bg-white/90 sm:w-auto"
                >
                  Organizar mi viaje
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                className="h-11 px-7 text-sm font-semibold bg-white text-[#0c2461] hover:bg-white/90"
                onClick={() => onOpenAuth("register")}
              >
                Organizar mi viaje
              </Button>
            )}
            {isLoggedIn ? (
              <Link to="/assistant">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-11 w-full border-white/30 bg-white/5 px-7 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  Ver asistente técnico
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="h-11 border-white/30 bg-white/5 px-7 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/10 hover:text-white"
                onClick={() => onOpenAuth("login")}
              >
                Ver asistente técnico
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
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

      <CinematicHero onOpenAuth={openAuth} />

      <main className="mx-auto max-w-6xl px-6 pb-16 flex-1 w-full">
        <HowItWorksCarousel />

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
