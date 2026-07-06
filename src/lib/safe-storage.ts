import type { StateStorage } from "zustand/middleware";

/** localStorage wrapper that survives corrupted JSON from older app versions. */
export function createSafeLocalStorage(): StateStorage {
  return {
    getItem: (name) => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      try {
        localStorage.setItem(name, value);
      } catch {
        // Quota exceeded or private browsing — ignore.
      }
    },
    removeItem: (name) => {
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
}
