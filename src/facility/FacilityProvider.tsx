import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";
import { useEntitlements } from "../entitlements/EntitlementsProvider";
import { useAuth } from "../auth/AuthContext";
import { client } from "../api/client";
import { logEvent } from "../api/events";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Defensive normalization: handle various API shapes
function normalizeFacilities(raw: any[]): Facility[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f: any) => ({
      id: f.id || f._id || "",
      name: f.name || "Unnamed Facility",
      tier: f.tier || f.plan || "unknown",
      state: f.state || f.address?.state || "",
      licenseNumber: f.licenseNumber || f.license?.number || "",
      licenseExpiry: f.licenseExpiry || f.license?.expiry || ""
    }))
    .filter((f) => f.id);
}

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const { ready: entReady, mode } = useEntitlements();
  const { token } = useAuth();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-fetch
  const didFetchRef = useRef(false);

  // Load selected facility from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setSelectedId(stored);
      } catch (e) {
        console.error("[FACILITY] Failed to read stored facility:", e);
      }
    })();
  }, []);

  // Fetch facilities only for commercial/facility mode users with ready entitlements
  useEffect(() => {
    // Only fetch if: token exists, entitlements ready, mode is NOT personal, and we haven't fetched yet
    if (!token || !entReady || mode === "personal" || didFetchRef.current) return;

    didFetchRef.current = true;
    let mounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fire silent request - don't break UI if this fails
        const resp = await client("GET", "/api/facilities", null, {
          auth: true,
          silent: true
        });

        if (!mounted) return;

        const normalized = normalizeFacilities(resp?.data || []);
        setFacilities(normalized);

        // Auto-select logic:
        // - If 0 facilities: stay null (show picker/message)
        // - If 1 facility: auto-select it
        // - If >1 facilities: try to use stored selection, else show picker
        if (normalized.length === 1) {
          const fid = normalized[0].id;
          setSelectedId(fid);
          await AsyncStorage.setItem(STORAGE_KEY, fid);
        } else if (normalized.length > 1 && selectedId) {
          // Validate stored selection still exists
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
        // Always mark ready to avoid blocking UI
        setIsReady(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, entReady, mode]);

  async function selectFacility(id: string) {
    try {
      setSelectedId(id);
      await AsyncStorage.setItem(STORAGE_KEY, id);
      // Fire analytics (fire-and-forget)
      void logEvent("FACILITY_SELECTED", { facilityId: id });
    } catch (e: any) {
      console.error("[FACILITY] Failed to select facility:", e);
      throw e;
    }
  }

  async function refetch() {
    didFetchRef.current = false;
    setIsLoading(true);
    setError(null);

    try {
      const resp = await client("GET", "/api/facilities", null, {
        auth: true,
        silent: true
      });

      const normalized = normalizeFacilities(resp?.data || []);
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
