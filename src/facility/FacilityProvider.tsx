/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useEntitlements } from "../entitlements/EntitlementsProvider";
import { useAuth } from "../auth/AuthContext";
import { apiRequest } from "../api/apiRequest";
import { logEvent } from "../api/events";

export type Facility = {
  id: string;
  name: string;
  tier: string;
  state: string;
  licenseNumber: string;
  licenseExpiry: string; // ISO date string
  ownerId?: string;
  ownerName?: string;
  type?: string;
  createdAt?: string;
  plan?: string;
  stripeStatus?: string;
};

export type FacilityState = {
  facilities: Facility[];
  facility: Facility | null;
  selectedId: string | null;
  facilityId: string | null; // Alias for selectedId (backward compatibility)
  activeFacilityId: string | null; // Alias for selectedId (backward compatibility)
  facilityRole: string | null; // User's role in the selected facility
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  selectFacility: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
};

const FacilityContext = createContext<FacilityState | null>(null);

const STORAGE_KEY = "facility:selectedId";

// Defensive normalization: handle array OR common wrapper objects
function normalizeFacilities(raw: any): Facility[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.facilities)
      ? raw.facilities
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

  return arr
    .map((f: any) => ({
      id: f.id || f._id || "",
      name: f.name || "Unnamed Facility",
      tier: f.tier || f.plan || "unknown",
      state: f.state || f.address?.state || "",
      licenseNumber: f.licenseNumber || f.license?.number || "",
      licenseExpiry: f.licenseExpiry || f.license?.expiry || ""
    }))
    .filter((f: Facility) => !!f.id);
}

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const { ready: entReady, mode } = useEntitlements();
  const { token } = useAuth();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-fetch
  const didFetchRef = useRef(false);

  // Load selected facility from storage
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && stored) setSelectedId(stored);
      } catch (e) {
        console.error("[FACILITY] Failed to read stored facility:", e);
      } finally {
        if (mounted) setStorageLoaded(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Load facilities only for commercial/facility mode users with ready entitlements
  useEffect(() => {
    if (
      !token ||
      !entReady ||
      !storageLoaded ||
      mode === "personal" ||
      didFetchRef.current
    )
      return;

    didFetchRef.current = true;
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await apiRequest("/api/facilities", {
          method: "GET",
          auth: true,
          silent: true
        });

        if (!mounted) return;

        const normalized = normalizeFacilities(data);
        setFacilities(normalized);

        if (normalized.length === 1) {
          const fid = normalized[0].id;
          setSelectedId(fid);
          await AsyncStorage.setItem(STORAGE_KEY, fid);
        } else if (normalized.length > 1 && selectedId) {
          if (!normalized.find((f) => f.id === selectedId)) {
            setSelectedId(null);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }

        setIsReady(true);
      } catch (e: any) {
        if (!mounted) return;
        console.error("[FACILITY] Failed to fetch facilities:", e);
        setError(e?.message || "Failed to load facilities");
        setIsReady(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, entReady, storageLoaded, mode, selectedId]);

  async function selectFacility(id: string) {
    try {
      setSelectedId(id);
      await AsyncStorage.setItem(STORAGE_KEY, id);
      void logEvent("FACILITY_SELECTED", { facilityId: id });
    } catch (e: any) {
      console.error("[FACILITY] Failed to select facility:", e);
      throw e;
    }
  }

  async function refetch() {
    if (!token || !entReady || mode === "personal") {
      setIsReady(true);
      return;
    }

    didFetchRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiRequest("/api/facilities", {
        method: "GET",
        auth: true,
        silent: true
      });

      const normalized = normalizeFacilities(data);
      setFacilities(normalized);
      setIsReady(true);
    } catch (e: any) {
      console.error("[FACILITY] Failed to refetch facilities:", e);
      setError(e?.message || "Failed to reload facilities");
      setIsReady(true);
    } finally {
      setIsLoading(false);
    }
  }

  const value = useMemo<FacilityState>(
    () => ({
      facilities,
      facility: facilities.find((f) => f.id === selectedId) ?? null,
      selectedId,
      facilityId: selectedId, // Alias for backward compatibility
      activeFacilityId: selectedId, // Alias for backward compatibility
      facilityRole: null, // TODO: Fetch from /api/me or facility detail
      isReady,
      isLoading,
      error,
      selectFacility,
      refetch
    }),
    [facilities, selectedId, isReady, isLoading, error]
  );

  return <FacilityContext.Provider value={value}>{children}</FacilityContext.Provider>;
}

export function useFacility() {
  const ctx = useContext(FacilityContext);
  if (!ctx) throw new Error("useFacility must be used inside <FacilityProvider>");
  return ctx;
}
