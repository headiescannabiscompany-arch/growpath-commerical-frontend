import { useMemo, useSyncExternalStore } from "react";

export type Facility = {
  id: string;
  name: string;
};

type Store = {
  selectedId: string | null;
  selected: Facility | null;
};

let store: Store = { selectedId: null, selected: null };
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
 * Minimal web-safe facility selection store.
 * Replace later with persistent storage + facility list fetch.
 */
export function useFacility() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(
    () => ({
      selectedId: snap.selectedId,
      selected: snap.selected,
      setSelected: (facility: Facility | null) => {
        store = {
          selectedId: facility?.id ?? null,
          selected: facility
        };
        emit();
      },
      clearSelected: () => {
        store = { selectedId: null, selected: null };
        emit();
      }
    }),
    [snap.selectedId, snap.selected]
  );
}
