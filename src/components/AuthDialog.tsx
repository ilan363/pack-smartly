import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

type AuthTab = "login" | "register" | "admin";

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onAdminSuccess?: () => void;
  defaultTab?: AuthTab;
};

export function AuthDialog({
  open,
  onOpenChange,
  onSuccess,
  onAdminSuccess,
  defaultTab = "login",
}: AuthDialogProps) {
  const login = useAuthStore((s) => s.login);
  const loginAdmin = useAuthStore((s) => s.loginAdmin);
  const register = useAuthStore((s) => s.register);
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleLogin = () => {
    const res = login(email, password);
    if (res.ok) {
      toast.success("Sesión iniciada", { description: email });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(res.error);
    }
  };

  const handleAdminLogin = () => {
    const res = loginAdmin(email, password);
    if (res.ok) {
      toast.success("Acceso de administrador concedido");
      resetForm();
      onOpenChange(false);
      onAdminSuccess?.();
    } else {
      toast.error(res.error);
    }
  };

  const handleRegister = () => {
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    const res = register(email, password);
    if (res.ok) {
      toast.success("Cuenta creada", { description: email });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(res.error);
    }
  };

  const handleSubmit = () => {
    if (tab === "login") handleLogin();
    else if (tab === "admin") handleAdminLogin();
    else handleRegister();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {tab === "admin" ? "Panel de administración" : "Accedé a Travel Wolf"}
          </DialogTitle>
          <DialogDescription>
            {tab === "admin"
              ? "Acceso restringido. Solo el administrador autorizado puede ingresar."
              : "Iniciá sesión o creá una cuenta para organizar tus viajes."}
          </DialogDescription>
        </DialogHeader>

        {tab === "admin" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Área exclusiva para administradores</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de administrador</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com"
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              />
            </div>
          </div>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as AuthTab)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar contraseña</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        {tab !== "admin" && (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => setTab("admin")}
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Panel de administración
          </Button>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {tab === "admin" && (
            <Button variant="ghost" onClick={() => setTab("login")}>
              Volver
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {tab === "login" && "Ingresar"}
            {tab === "register" && "Crear cuenta"}
            {tab === "admin" && "Ingresar como admin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
