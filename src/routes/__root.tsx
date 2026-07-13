import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { useSupabaseAuthSync } from "@/hooks/use-supabase-auth-sync";
import { Toaster } from "@/components/ui/sonner";
import { clearLegacyAppStorage } from "@/lib/clear-legacy-storage";
import { registerChunkLoadRecovery, isRecoverableLoadError, tryRecoverFromStaleChunks } from "@/lib/recoverable-errors";
import { useLocaleStore } from "@/lib/i18n/locale-store";
import { translate } from "@/lib/i18n/translations";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  const locale = useLocaleStore((s) => s.locale);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{translate(locale, "errors.notFoundTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {translate(locale, "errors.notFoundDesc")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {translate(locale, "errors.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  useEffect(() => {
    tryRecoverFromStaleChunks(error);
  }, [error]);

  const isStaleBundle = isRecoverableLoadError(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isStaleBundle ? translate(locale, "errors.newVersion") : translate(locale, "errors.loadFailed")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isStaleBundle
            ? translate(locale, "errors.reloadHint")
            : translate(locale, "errors.errorGeneric")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (isStaleBundle) {
                window.location.reload();
                return;
              }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isStaleBundle ? translate(locale, "common.retry") : translate(locale, "errors.tryAgain")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {translate(locale, "errors.goHomeAlt")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Travel Wolf" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const locale = useLocaleStore((s) => s.locale);

  useSupabaseAuthSync();

  useEffect(() => {
    clearLegacyAppStorage();
    return registerChunkLoadRecovery();
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
