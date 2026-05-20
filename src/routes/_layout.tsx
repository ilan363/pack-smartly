import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BaggageClaim } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/AppSidebar";

export const Route = createFileRoute("/_layout")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-background px-6 md:hidden">
          <div className="flex items-center gap-2">
            <BaggageClaim className="h-5 w-5" />
            <span className="font-bold">Travel Wolf</span>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
