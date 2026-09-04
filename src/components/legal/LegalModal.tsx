import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, FileText } from "lucide-react";

export type LegalModalType = "terms" | "privacy" | null;

interface LegalModalProps {
  openType: LegalModalType;
  onClose: () => void;
}

export function LegalModal({ openType, onClose }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(openType || "terms");

  // Keep state in sync with prop if it changes
  if (openType && openType !== activeTab && (openType === "terms" || openType === "privacy")) {
    setActiveTab(openType);
  }

  const isOpen = openType !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-border bg-card">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
              Información Legal y Cumplimiento
            </DialogTitle>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "terms"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Términos del Servicio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "privacy"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Política de Privacidad
            </button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-muted-foreground leading-relaxed">
          {activeTab === "terms" ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  1. Objeto y Alcance del Servicio
                </h3>
                <p>
                  Travel Wolf proporciona herramientas analíticas para la planificación, organización volumétrica y
                  estimación de peso de equipaje de viaje. La aplicación es de uso personal y profesional con fines orientativos.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  2. Exactitud de Pesajes y Responsabilidad de Franquicia
                </h3>
                <p>
                  Los algoritmos de cálculo estiman el peso de prendas y artículos con base en densidades promedio textiles
                  y estándares de la industria aeroportuaria. El usuario reconoce que las básculas certificadas de las aerolíneas
                  en el mostrador de facturación constituyen la única autoridad vinculante. Travel Wolf no asume responsabilidad
                  civil ni económica por penalizaciones, tasas por exceso de equipaje o denegaciones de embarque.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  3. Normativas de Artículos Prohibidos
                </h3>
                <p>
                  Es exclusiva responsabilidad del viajero consultar y acatar las directrices vigentes de la Organización de
                  Aviación Civil Internacional (OACI) y de las aerolíneas operadoras relativas al transporte de baterías de litio,
                  líquidos, geles, aerosoles y sustancias peligrosas en cabina o bodega.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  4. Propiedad Intelectual
                </h3>
                <p>
                  El diseño visual, arquitectura de software, marcas, logotipos y algoritmos son propiedad de Travel Wolf
                  y están protegidos por las leyes internacionales de derechos de autor y propiedad intelectual.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  5. Modificaciones del Servicio
                </h3>
                <p>
                  Nos reservamos el derecho de actualizar, optimizar o retirar características técnicas del sistema en cualquier
                  momento sin previo aviso, garantizando la integridad de los datos almacenados localmente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  1. Principio de Privacidad por Diseño
                </h3>
                <p>
                  Travel Wolf opera bajo una filosofía estricta de mínima recolección de datos. Tus listas de equipaje,
                  planes de viaje y configuraciones de valijas se guardan primordialmente en el almacenamiento local seguro de tu
                  navegador (Local Storage cifrado por sandbox).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  2. Datos Técnicos y Meteorología
                </h3>
                <p>
                  Para proveer previsiones climáticas en tiempo real, se envían únicamente las coordenadas geográficas del destino
                  a servidores de Open-Meteo mediante peticiones cifradas TLS 1.3. Ningún identificador personal es asociado a estas consultas.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  3. Cero Venta de Información Personal
                </h3>
                <p>
                  Travel Wolf no vende, alquila, comercializa ni transfiere información personal a terceros ni a redes de
                  publicidad programática. No utilizamos cookies de rastreo intrusivas ni huellas digitales (fingerprinting).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  4. Control Total y Derecho al Olvido
                </h3>
                <p>
                  Puedes eliminar de forma instantánea e irreversible la totalidad de tus valijas, registros y sesiones en cualquier
                  momento utilizando el botón de "Reiniciar todo" ubicado en la barra lateral de la aplicación.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground text-base mb-1">
                  5. Contacto sobre Privacidad
                </h3>
                <p>
                  Para consultas sobre el tratamiento de datos y normativas GDPR / CCPA, puedes comunicarte directamente con el responsable técnico a través de{" "}
                  <a href="mailto:josemanbrut@gmail.com" className="text-foreground underline underline-offset-4">
                    josemanbrut@gmail.com
                  </a>.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 px-6 border-t border-border bg-muted/30 flex justify-between items-center text-xs text-muted-foreground">
          <span>Actualizado: Septiembre 2026 • Travel Wolf Core</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Comprendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
