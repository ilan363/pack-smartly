import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
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
import { OAuthButtons } from "@/components/OAuthButtons";
import { ADMIN_EMAIL, useAuthStore } from "@/lib/auth-store";
import { mapFirebaseAuthError } from "@/lib/firebase-auth-errors";
import { auth } from "@/integrations/firebase/client";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { finalizeOAuthLogin } from "@/lib/oauth-session";
import { syncUserToRegistry } from "@/lib/user-registry";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { IconEye, IconEyeOff, IconShieldCheck } from "@/components/ui/icons";

type AuthTab = "login" | "register" | "admin" | "forgot";

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  showLabel: string;
  hideLabel: string;
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
  showLabel,
  hideLabel,
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
          className="text-muted-foreground transition-colors hover:text-foreground p-1"
          aria-label={showPassword ? hideLabel : showLabel}
        >
          {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
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
  const setFirebaseSession = useAuthStore((state) => state.setFirebaseSession);
  const { t, tAuthError } = useI18n();
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleLogin = async () => {
    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      toast.error(tAuthError("auth.err.use_admin_login"));
      return;
    }

    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      setFirebaseSession(credential.user.email ?? email, null);
      const synced = await syncUserToRegistry(credential.user, "email");
      if (!synced) {
        toast.warning(t("auth.registrySyncWarning"));
      }
      toast.success(t("auth.loginSuccess"), { description: email });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(tAuthError(mapFirebaseAuthError(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminLogin = async () => {
    setSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      if (credential.user.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        toast.error(tAuthError("auth.err.access_denied"));
        return;
      }

      setFirebaseSession(credential.user.email, null);
      const synced = await syncUserToRegistry(credential.user, "email");
      if (!synced) toast.warning(t("auth.registrySyncWarning"));
      toast.success(t("auth.adminSuccess"));
      resetForm();
      onOpenChange(false);
      onAdminSuccess?.();
    } catch (error) {
      toast.error(tAuthError(mapFirebaseAuthError(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      toast.error(tAuthError("auth.err.email_cannot_register"));
      return;
    }

    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      setFirebaseSession(credential.user.email ?? email, null);
      const synced = await syncUserToRegistry(credential.user, "email");
      if (!synced) {
        toast.warning(t("auth.registrySyncWarning"));
      }
      toast.success(t("auth.registerSuccess"), { description: email });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(tAuthError(mapFirebaseAuthError(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success(t("auth.resetPasswordSuccess"), { description: email.trim() });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error(tAuthError(mapFirebaseAuthError(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthSuccess = async (credential: UserCredential) => {
    setSubmitting(true);
    try {
      const result = await finalizeOAuthLogin(credential.user);
      if (!result.ok) {
        if (result.reason === "admin_oauth") {
          toast.error(tAuthError("auth.err.oauth_admin_password"));
        } else {
          toast.error(tAuthError("auth.err.oauth_invalid_email"));
        }
        return;
      }

      if (!result.synced) toast.warning(t("auth.registrySyncWarning"));
      toast.success(t("auth.oauth.success"), { description: result.email });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    if (tab === "login") void handleLogin();
    else if (tab === "admin") void handleAdminLogin();
    else if (tab === "forgot") void handleResetPassword();
    else void handleRegister();
  };

  const dialogTitle =
    tab === "admin"
      ? t("auth.dialogTitleAdmin")
      : tab === "forgot"
        ? t("auth.dialogTitleForgot")
        : t("auth.dialogTitle");

  const dialogDescription =
    tab === "admin"
      ? t("auth.dialogDescAdmin")
      : tab === "forgot"
        ? t("auth.dialogDescForgot")
        : t("auth.dialogDesc");

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
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {tab === "admin" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              <IconShieldCheck className="h-4 w-4 shrink-0" />
              <span>{t("auth.adminOnlyArea")}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("auth.adminEmail")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.adminEmailPlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && void handleAdminLogin()}
              />
            </div>
            <PasswordField
              id="admin-password"
              label={t("auth.password")}
              value={password}
              onChange={setPassword}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((prev) => !prev)}
              showLabel={t("auth.showPassword")}
              hideLabel={t("auth.hidePassword")}
              onKeyDown={(e) => e.key === "Enter" && void handleAdminLogin()}
            />
          </div>
        ) : tab === "forgot" ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("auth.email")}</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>
          </div>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as AuthTab)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("auth.email")}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <PasswordField
                id="login-password"
                label={t("auth.password")}
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((prev) => !prev)}
                showLabel={t("auth.showPassword")}
                hideLabel={t("auth.hidePassword")}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  onClick={() => setTab("forgot")}
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("auth.email")}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                />
              </div>
              <PasswordField
                id="register-password"
                label={t("auth.password")}
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((prev) => !prev)}
                showLabel={t("auth.showPassword")}
                hideLabel={t("auth.hidePassword")}
                placeholder={t("auth.passwordPlaceholder")}
              />
              <PasswordField
                id="register-confirm-password"
                label={t("auth.confirmPassword")}
                value={confirmPassword}
                onChange={setConfirmPassword}
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((prev) => !prev)}
                showLabel={t("auth.showPassword")}
                hideLabel={t("auth.hidePassword")}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              />
            </TabsContent>
          </Tabs>
        )}

        {tab !== "admin" && tab !== "forgot" && (
          <>
            <OAuthButtons onSuccess={handleOAuthSuccess} />
            <div className="flex justify-center px-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full max-w-xs justify-center text-center text-muted-foreground hover:text-foreground"
                onClick={() => setTab("admin")}
              >
                <IconShieldCheck className="mr-2 h-4 w-4 shrink-0" />
                {t("auth.openAdminPanel")}
              </Button>
            </div>
          </>
        )}

        <DialogFooter className="mt-auto gap-2 pt-4 sm:gap-0">
          {(tab === "admin" || tab === "forgot") && (
            <Button type="button" variant="ghost" onClick={() => setTab("login")}>
              {t("auth.backToLogin")}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && tab !== "admin" ? t("auth.syncingAccount") : null}
            {!submitting && tab === "login" && t("auth.submitLogin")}
            {!submitting && tab === "register" && t("auth.submitRegister")}
            {!submitting && tab === "forgot" && t("auth.submitResetPassword")}
            {tab === "admin" && t("auth.submitAdmin")}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
