import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BaggageClaim, Bot, CheckCircle2, CloudLightning } from "lucide-react";
import { useState } from "react";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function Navbar() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register" | "admin">("login");

  const openAuth = (tab: "login" | "register" | "admin") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BaggageClaim size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight">Travel Wolf</span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => openAuth("login")}
            >
              Ingresar
            </Button>
          </div>
        </div>
      </nav>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
        onSuccess={() => navigate({ to: "/dashboard" })}
        onAdminSuccess={() => navigate({ to: "/admin" })}
      />
    </>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-6 pt-32 pb-16">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mt-12 mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-muted-foreground mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Organización inteligente de equipaje
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-7xl mb-6 text-foreground"
          >
            Viaja sin peso extra, <br className="hidden sm:block" />
            <span className="text-muted-foreground">organiza con inteligencia.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl text-lg text-muted-foreground mb-10"
          >
            Calcula el peso, optimiza el espacio y recibe recomendaciones impulsadas por IA 
            según tu destino, clima y tipo de viaje.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link to="/dashboard">
              <Button size="lg" className="rounded-full h-12 px-8 text-base group">
                Organizar mi viaje
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="grid gap-8 md:grid-cols-3 mb-32">
          <FeatureCard 
            icon={<BaggageClaim className="h-6 w-6" />}
            title="Gestión de Valijas"
            description="Controla el peso y capacidad en tiempo real. Alertas visuales para evitar excesos antes de llegar al aeropuerto."
            delay={0.4}
          />
          <FeatureCard 
            icon={<Bot className="h-6 w-6" />}
            title="Asistente de IA"
            description="Dile a dónde viajas y la IA creará tu lista ideal considerando el clima, días y eventos especiales."
            delay={0.5}
          />
          <FeatureCard 
            icon={<CloudLightning className="h-6 w-6" />}
            title="Rápido & Moderno"
            description="Interfaz minimalista diseñada para que organizar tu equipaje sea rápido, claro y sin estrés."
            delay={0.6}
          />
        </section>
        
        {/* Preview / Mockup Section */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          <div className="border-b border-border bg-muted/30 p-4 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <div className="ml-4 h-6 w-48 rounded-md bg-muted" />
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-8 items-center bg-background">
            <div>
              <h3 className="text-2xl font-bold mb-4">Todo bajo control</h3>
              <ul className="space-y-4">
                {[
                  "Tarjetas visuales por valija",
                  "Categorización de prendas",
                  "Indicadores de capacidad",
                  "Recomendaciones climáticas"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-6">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="font-semibold">Valija Principal</div>
                  <div className="text-sm text-muted-foreground">Cabina (10kg max)</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">8.5 kg</div>
                  <div className="text-sm text-green-600 font-medium">1.5 kg libres</div>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden mb-6">
                <div className="h-full bg-primary w-[85%]" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Remeras (5)</span>
                  <span className="text-muted-foreground">1.2 kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pantalones (2)</span>
                  <span className="text-muted-foreground">1.8 kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Zapatillas (1)</span>
                  <span className="text-muted-foreground">0.8 kg</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-foreground">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
}