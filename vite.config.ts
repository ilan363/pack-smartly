// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

function supabaseEnvDefine() {
  const cwd = process.cwd();
  const dev = loadEnv("development", cwd, "VITE_");
  const prod = loadEnv("production", cwd, "VITE_");

  const url =
    process.env.VITE_SUPABASE_URL ||
    prod.VITE_SUPABASE_URL ||
    dev.VITE_SUPABASE_URL ||
    "";
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    prod.VITE_SUPABASE_PUBLISHABLE_KEY ||
    dev.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "";

  return {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
  };
}

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
      },
    },
  },
  vite: {
    define: supabaseEnvDefine(),
    build: {
      outDir: "dist",
    },
    server: {
      host: true,
      port: 8080,
      strictPort: true,
      cors: true,
      allowedHosts: true,
    },
    preview: {
      host: true,
      allowedHosts: true,
      cors: true,
    },
  },
});
