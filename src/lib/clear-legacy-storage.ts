const LEGACY_STORAGE_KEYS = [
  "travel-wolf-auth",
  "travel-wolf-chat",
  "travel-wolf-suitcases",
  "travel-wolf-checklists",
  "pack-smartly-saved-lists",
];

/** Borra datos viejos de localStorage de versiones anteriores con persistencia. */
export function clearLegacyAppStorage() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
