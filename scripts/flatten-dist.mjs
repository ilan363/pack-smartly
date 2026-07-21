import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distRoot = "dist";
const clientDir = join(distRoot, "client");
const stagingDir = join(distRoot, ".deploy-staging");

if (!existsSync(clientDir)) {
  console.error("[flatten-dist] No se encontró dist/client. ¿Falló el build de Vite?");
  process.exit(1);
}

if (existsSync(stagingDir)) {
  rmSync(stagingDir, { recursive: true, force: true });
}

cpSync(clientDir, stagingDir, { recursive: true });
rmSync(join(distRoot, "server"), { recursive: true, force: true });
rmSync(clientDir, { recursive: true, force: true });

for (const entry of readdirSync(stagingDir)) {
  const src = join(stagingDir, entry);
  const dest = join(distRoot, entry);

  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }

  cpSync(src, dest, { recursive: true });
}

rmSync(stagingDir, { recursive: true, force: true });

// nginx (Nominalia) only serves real files — copy index.html for legacy /auth/callback links.
const indexHtmlPath = join(distRoot, "index.html");
if (existsSync(indexHtmlPath)) {
  const indexHtml = readFileSync(indexHtmlPath, "utf8");
  const callbackDir = join(distRoot, "auth", "callback");
  mkdirSync(callbackDir, { recursive: true });
  writeFileSync(join(callbackDir, "index.html"), indexHtml);
}

console.log("[flatten-dist] dist/ listo para subir (index.html + assets)");
