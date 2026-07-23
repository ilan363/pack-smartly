import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Users, Trash2, LogOut, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_EMAIL, useAuthStore } from "@/lib/auth-store";
import { logoutWithOAuth } from "@/hooks/use-supabase-auth-sync";
import {
  isRegistryAvailable,
  loadAllRegistryUsers,
  removeUserFromRegistry,
  syncLocalUsersToRegistry,
} from "@/lib/user-registry";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";

export const Route = createFileRoute("/_layout/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, dateLocale } = useI18n();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const email = useAuthStore((s) => s.email);
  const localUsers = useAuthStore((s) => s.users);
  const removeUser = useAuthStore((s) => s.removeUser);

  const registryEnabled = isRegistryAvailable();

  const {
    data: registryUsers = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-registry-users"],
    queryFn: loadAllRegistryUsers,
    enabled: isAdmin && registryEnabled,
  });

  useEffect(() => {
    if (!isAdmin) {
      toast.error(t("admin.accessDenied"));
      navigate({ to: "/" });
    }
  }, [isAdmin, navigate, t]);

  useEffect(() => {
    if (!isAdmin || !registryEnabled) return;
    void syncLocalUsersToRegistry(localUsers).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin-registry-users"] });
    });
  }, [isAdmin, registryEnabled, localUsers, queryClient]);

  if (!isAdmin) return null;

  const displayedUsers = registryEnabled ? registryUsers : localUsers.map((user) => ({
    email: user.email,
    authMethod: user.oauthProvider ?? ("email" as const),
    registeredAt: user.registeredAt,
    lastLoginAt: user.lastLoginAt,
  }));

  const handleRemoveUser = async (userEmail: string) => {
    if (registryEnabled) {
      const removed = await removeUserFromRegistry(userEmail);
      if (!removed) {
        toast.error(t("admin.registryRemoveFailed"));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-registry-users"] });
    }

    removeUser(userEmail);
    toast.success(t("admin.userRemoved"), { description: userEmail });
  };

  const handleLogout = () => {
    void logoutWithOAuth();
    toast.success(t("admin.logoutAdmin"));
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {t("admin.badge")}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
          <span className="text-sm font-medium">{email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> {t("admin.logoutAdmin")}
          </Button>
        </div>
      </div>

      {!registryEnabled && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {t("admin.registryNotConfigured")}
        </div>
      )}

      {registryEnabled && isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {t("admin.registryLoadFailed")}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.registeredUsers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "…" : t("admin.usersCount", { count: displayedUsers.length })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("admin.adminEmail")}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{ADMIN_EMAIL}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("admin.registeredUsers")}</CardTitle>
          {registryEnabled && (
            <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">{t("admin.refreshUsers")}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("admin.loadingUsers")}
            </div>
          ) : displayedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("admin.noUsers")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.emailCol")}</TableHead>
                  <TableHead>{t("admin.methodCol")}</TableHead>
                  <TableHead>{t("admin.lastLoginCol")}</TableHead>
                  <TableHead className="text-right">{t("admin.actionsCol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.authMethod === "google"
                          ? "Google"
                          : user.authMethod === "github"
                            ? "GitHub"
                            : t("auth.email")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.lastLoginAt).toLocaleString(dateLocale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => void handleRemoveUser(user.email)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        {t("admin.remove")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
