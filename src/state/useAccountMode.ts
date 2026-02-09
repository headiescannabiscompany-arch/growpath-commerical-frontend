import { useMemo, useSyncExternalStore } from "react";

export type AccountMode = "personal" | "commercial" | "facility";

type Store = {
  mode: AccountMode;
};

let store: Store = { mode: "commercial" };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

/**
 * Minimal web-safe account mode store.
 * Replace later with your real auth/entitlements-driven mode.
 */
export function useAccountMode() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(
    () => ({
      mode: snap.mode,
      setMode: (mode: AccountMode) => {
        store = { ...store, mode };
        emit();
      }
    }),
    [snap.mode]
  );
}
