const LEGACY_STORAGE_KEYS = [
  "travel-wolf-auth",
  "travel-wolf-chat",
  "travel-wolf-suitcases",
  "travel-wolf-checklists",
];

/** Copia datos de claves viejas a las actuales si aún no existen. */
export function migrateLegacyAppStorage() {
  if (typeof window === "undefined") return;

  const migrations: Record<string, string> = {
    "travel-wolf-suitcases": "pack-smartly-suitcases",
    "travel-wolf-checklists": "pack-smartly-checklists",
    "travel-wolf-chat": "pack-smartly-chat",
  };

  for (const [legacyKey, currentKey] of Object.entries(migrations)) {
    if (localStorage.getItem(currentKey)) continue;
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue) localStorage.setItem(currentKey, legacyValue);
  }
}

/** Borra datos viejos de localStorage de versiones anteriores con persistencia. */
export function clearLegacyAppStorage() {
  if (typeof window === "undefined") return;
  migrateLegacyAppStorage();
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
