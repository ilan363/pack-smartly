import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "src/data/iata-airports.json");

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (const c of line) {
    if (c === '"') {
      quoted = !quoted;
      continue;
    }
    if (c === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

const res = await fetch("https://davidmegginson.github.io/ourairports-data/airports.csv");
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const text = await res.text();
const lines = text.split("\n");
const header = parseCsvLine(lines[0]);
const idx = {
  name: header.indexOf("name"),
  municipality: header.indexOf("municipality"),
  iso_country: header.indexOf("iso_country"),
  iata: header.indexOf("iata_code"),
};

const airports = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = parseCsvLine(line);
  const code = (cols[idx.iata] ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(code)) continue;
  airports.push({
    code,
    name: (cols[idx.name] ?? "").trim(),
    city: (cols[idx.municipality] ?? "").trim(),
    country: (cols[idx.iso_country] ?? "").trim(),
  });
}

airports.sort((a, b) => a.code.localeCompare(b.code));
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(airports));
console.log(`Wrote ${airports.length} airports to ${outPath}`);
