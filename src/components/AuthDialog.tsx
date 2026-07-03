import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
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

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  placeholder?: string;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  placeholder,
  onKeyDown,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <button
          type="button"
          onClick={onToggleShow}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
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

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (tab === "login") handleLogin();
    else if (tab === "admin") handleAdminLogin();
    else handleRegister();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-md:fixed max-md:inset-0 max-md:left-0 max-md:top-0 max-md:flex max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:flex-col max-md:overflow-y-auto max-md:rounded-none max-md:border-0 max-md:p-6 max-md:pt-14 max-md:data-[state=closed]:slide-out-to-bottom max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:zoom-out-100 max-md:data-[state=open]:zoom-in-100 max-md:[&>button]:right-4 max-md:[&>button]:top-4 max-md:[&>button]:size-10 max-md:[&>button]:opacity-100 max-md:[&>button_svg]:size-5"
      >
        <form
          className="flex flex-1 flex-col gap-4"
          onSubmit={(e) => handleSubmit(e)}
        >
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
            <PasswordField
              id="admin-password"
              label="Contraseña"
              value={password}
              onChange={setPassword}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((prev) => !prev)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
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
              <PasswordField
                id="login-password"
                label="Contraseña"
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((prev) => !prev)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
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
              <PasswordField
                id="register-password"
                label="Contraseña"
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((prev) => !prev)}
                placeholder="Mínimo 6 caracteres"
              />
              <PasswordField
                id="register-confirm-password"
                label="Confirmar contraseña"
                value={confirmPassword}
                onChange={setConfirmPassword}
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
            </TabsContent>
          </Tabs>
        )}

        {tab !== "admin" && (
          <div className="flex justify-center px-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full max-w-xs justify-center text-center text-muted-foreground hover:text-foreground"
              onClick={() => setTab("admin")}
            >
              <ShieldCheck className="mr-2 h-4 w-4 shrink-0" />
              Panel de administración
            </Button>
          </div>
        )}

        <DialogFooter className="mt-auto gap-2 pt-4 sm:gap-0">
          {tab === "admin" && (
            <Button type="button" variant="ghost" onClick={() => setTab("login")}>
              Volver
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button type="submit">
            {tab === "login" && "Ingresar"}
            {tab === "register" && "Crear cuenta"}
            {tab === "admin" && "Ingresar como admin"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
