const CHUNK_RELOAD_KEY = "travel-wolf-chunk-reload";

export function isRecoverableLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError|dynamically imported module|error loading dynamically imported module/i.test(
    message,
  );
}

/** Reload once after a stale deploy left the browser with outdated chunk URLs. */
export function tryRecoverFromStaleChunks(error: unknown): boolean {
  if (typeof window === "undefined" || !isRecoverableLoadError(error)) return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

export function registerChunkLoadRecovery() {
  if (typeof window === "undefined") return;

  const handle = (event: PromiseRejectionEvent) => {
    tryRecoverFromStaleChunks(event.reason);
  };

  window.addEventListener("unhandledrejection", handle);
  return () => window.removeEventListener("unhandledrejection", handle);
}
