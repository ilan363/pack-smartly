import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distRoot = "dist";
const nitroPublicDir = join(".output", "public");
const legacyClientDir = join(distRoot, "client");

/** @returns {string | undefined} */
function resolveSourceDir() {
  if (existsSync(nitroPublicDir)) {
    return nitroPublicDir;
  }
  if (existsSync(legacyClientDir)) {
    return legacyClientDir;
  }
  return undefined;
}

const sourceDir = resolveSourceDir();
if (!sourceDir) {
  console.error(
    "[flatten-dist] No se encontró .output/public ni dist/client. ¿Falló vite build?",
  );
  process.exit(1);
}

if (existsSync(distRoot)) {
  rmSync(distRoot, { recursive: true, force: true });
}

mkdirSync(distRoot, { recursive: true });
cpSync(sourceDir, distRoot, { recursive: true });

// nginx (Nominalia) only serves real files — copy index.html for legacy /auth/callback links.
const indexHtmlPath = join(distRoot, "index.html");
if (existsSync(indexHtmlPath)) {
  const indexHtml = readFileSync(indexHtmlPath, "utf8");
  const callbackDir = join(distRoot, "auth", "callback");
  mkdirSync(callbackDir, { recursive: true });
  writeFileSync(join(callbackDir, "index.html"), indexHtml);
}

console.log(`[flatten-dist] dist/ listo para Vercel (desde ${sourceDir})`);
