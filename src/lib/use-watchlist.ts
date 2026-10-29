"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cartoony:watchlist_ids";
const SYNC_EVENT = "cartoony:watchlist-changed";

function readStoredWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

function writeStoredWatchlist(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent<string[]>(SYNC_EVENT, { detail: ids }));
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

export function useWatchlist() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSavedIds(readStoredWatchlist());
    setHydrated(true);

    const handleSync = (event: Event) => {
      const custom = event as CustomEvent<string[]>;
      if (Array.isArray(custom.detail)) {
        setSavedIds(custom.detail);
      } else {
        setSavedIds(readStoredWatchlist());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSavedIds(readStoredWatchlist());
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleSave = useCallback((id: string) => {
    if (!id) return;
    const current = readStoredWatchlist();
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [id, ...current];
    setSavedIds(next);
    writeStoredWatchlist(next);
  }, []);

  const clearWatchlist = useCallback(() => {
    setSavedIds([]);
    writeStoredWatchlist([]);
  }, []);

  return {
    savedIds,
    hydrated,
    toggleSave,
    clearWatchlist,
  };
}
