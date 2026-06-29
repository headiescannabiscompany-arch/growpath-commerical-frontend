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
  facilities: Facility[];
};

let store: Store = { selectedId: null, selected: null, facilities: [] };
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
 * Web-safe facility selection store. Facility layout hydrates it from entitlement
 * context when the account owns or belongs to a single facility.
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
      facilities: snap.facilities,
      isLoading: false,
      isReady: true,
      error: null as string | null,
      setFacilities: (facilities: Facility[]) => {
        const rows = Array.isArray(facilities) ? facilities : [];
        const sameRows =
          rows.length === store.facilities.length &&
          rows.every((row, index) => {
            const current = store.facilities[index];
            return current?.id === row.id && current?.name === row.name;
          });
        if (sameRows) return;
        const selected =
          store.selectedId && rows.length
            ? rows.find((facility) => facility.id === store.selectedId) || store.selected
            : store.selected;
        store = {
          ...store,
          facilities: rows,
          selected
        };
        emit();
      },
      setSelected: (facility: Facility | null) => {
        const facilities =
          facility && !store.facilities.some((row) => row.id === facility.id)
            ? [facility, ...store.facilities]
            : store.facilities;
        store = {
          selectedId: facility?.id ?? null,
          selected: facility,
          facilities
        };
        emit();
      },
      selectFacility: (facility: Facility | string | null) => {
        const normalized =
          typeof facility === "string"
            ? store.facilities.find((row) => row.id === facility) ||
              ({ id: facility, name: facility } as Facility)
            : facility;
        const facilities =
          normalized && !store.facilities.some((row) => row.id === normalized.id)
            ? [normalized, ...store.facilities]
            : store.facilities;
        store = {
          selectedId: normalized?.id ?? null,
          selected: normalized,
          facilities
        };
        emit();
      },
      clearSelected: () => {
        store = { ...store, selectedId: null, selected: null };
        emit();
      }
    }),
    [snap.selectedId, snap.selected, snap.facilities]
  );
}
