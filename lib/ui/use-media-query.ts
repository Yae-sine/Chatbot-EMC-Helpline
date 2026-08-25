"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe `matchMedia`. The server snapshot is `false`, so the first client
 * render matches the server and callers must treat that first value as
 * "not yet known" rather than "does not match".
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);
      return () => list.removeEventListener("change", onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
