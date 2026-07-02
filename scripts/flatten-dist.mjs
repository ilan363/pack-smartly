import { cpSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const distRoot = "dist";
const clientDir = join(distRoot, "client");
const stagingDir = join(distRoot, ".deploy-staging");

cpSync(clientDir, stagingDir, { recursive: true });
rmSync(join(distRoot, "server"), { recursive: true, force: true });
rmSync(clientDir, { recursive: true, force: true });

for (const entry of readdirSync(stagingDir)) {
  renameSync(join(stagingDir, entry), join(distRoot, entry));
}

rmSync(stagingDir, { recursive: true, force: true });

console.log("[flatten-dist] dist/ listo para subir (index.html + assets)");
