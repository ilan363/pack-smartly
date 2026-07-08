import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, Users, Trash2, LogOut } from "lucide-react";
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
import { toast } from "sonner";

export const Route = createFileRoute("/_layout/admin")({
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const email = useAuthStore((s) => s.email);
  const users = useAuthStore((s) => s.users);
  const removeUser = useAuthStore((s) => s.removeUser);

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acceso denegado. Iniciá sesión desde el panel de administración.");
      navigate({ to: "/" });
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  const handleRemoveUser = (userEmail: string) => {
    removeUser(userEmail);
    toast.success("Usuario eliminado", { description: userEmail });
  };

  const handleLogout = () => {
    void logoutWithOAuth();
    toast.success("Sesión de administrador cerrada");
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Administrador
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de administración</h1>
          <p className="text-muted-foreground mt-1">
            Gestioná usuarios registrados en Travel Wolf.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
          <span className="text-sm font-medium">{email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Salir
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios registrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrador activo</CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">{ADMIN_EMAIL}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay usuarios registrados todavía.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Último acceso</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.oauthProvider
                          ? user.oauthProvider === "google"
                            ? "Google"
                            : "GitHub"
                          : "Email"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.lastLoginAt).toLocaleString("es-AR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleRemoveUser(user.email)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
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
