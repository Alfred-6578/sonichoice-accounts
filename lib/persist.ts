/**
 * A value kept in localStorage that React components can subscribe to.
 *
 * The same shape as the ledger store, pulled out so staff, branches and the
 * signed-in session can each be one of these. When there is a real service,
 * each of these becomes an API call behind the same functions.
 */

"use client";

import { useSyncExternalStore } from "react";

export type Persisted<T> = {
  read: () => T;
  write: (next: T) => void;
  use: () => T;
  /** Like `use`, but `undefined` until the browser copy has been read —
   *  which lets a page tell "not loaded yet" apart from "empty". */
  useLoaded: () => T | undefined;
};

export function persisted<T>(key: string, seed: () => T): Persisted<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (cache !== undefined) return cache;
    if (typeof window === "undefined") return seed();
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : seed();
    } catch {
      cache = seed();
    }
    return cache;
  };

  const write = (next: T) => {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // A full or blocked store must not take the screen down with it.
    }
    listeners.forEach((fn) => fn());
  };

  /* Another tab signing out or adding a user should show up here too. */
  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    cache = undefined;
    listeners.forEach((fn) => fn());
  };

  const subscribe = (fn: () => void) => {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  };

  const serverSnapshot = seed();

  return {
    read,
    write,
    use: () => useSyncExternalStore(subscribe, read, () => serverSnapshot),
    useLoaded: () => useSyncExternalStore<T | undefined>(subscribe, read, () => undefined),
  };
}
