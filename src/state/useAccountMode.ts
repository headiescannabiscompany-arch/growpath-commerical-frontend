import { useMemo, useSyncExternalStore } from "react";

export type AccountMode = "personal" | "commercial" | "facility";

type Store = {
  mode: AccountMode;
};

let store: Store = { mode: "personal" };
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
 * Web-safe account mode store. Entitlements hydrate it after auth is ready.
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
