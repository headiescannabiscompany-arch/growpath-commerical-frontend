import { useMemo, useSyncExternalStore } from "react";

export type Facility = {
  id: string;
  name: string;
  tier?: string;
  licenseNumber?: string;
  state?: string;
  ownerId?: string;
  ownerName?: string;
  createdAt?: string;
  plan?: string;
  stripeStatus?: string;
  type?: string;
  [key: string]: unknown;
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
      facilityId: snap.selectedId,
      activeFacilityId: snap.selectedId,
      facility: snap.selected,
      facilityRole: null as string | null,
      facilities: snap.selected ? [snap.selected] : [],
      isLoading: false,
      isReady: true,
      error: null as string | null,
      setSelected: (facility: Facility | null) => {
        store = {
          selectedId: facility?.id ?? null,
          selected: facility
        };
        emit();
      },
      selectFacility: (facility: Facility | string | null) => {
        const normalized =
          typeof facility === "string"
            ? ({ id: facility, name: facility } as Facility)
            : facility;
        store = {
          selectedId: normalized?.id ?? null,
          selected: normalized
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
