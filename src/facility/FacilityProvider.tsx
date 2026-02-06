import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "../entitlements/EntitlementsProvider";

const FacilityContext = createContext<any>(null);
const FACILITY_STORAGE_KEY = "gp.selectedFacilityId";

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const ent = useEntitlements();

  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  useEffect(() => {
    // If auth not present, clear and stop.
    if (!token) {
      setFacilities([]);
      setFacilityId(null);
      return;
    }

    // Wait until entitlements hydration is done.
    if (!ent.ready) return;

    // Personal users never fetch facilities.
    if (ent.mode === "personal") {
      console.log("[FACILITY] Skipping /api/facilities for personal user");
      setFacilities([]);
      setFacilityId(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        console.log("[FACILITY] Fetching facilities for mode:", ent.mode);
        const facs = await api.get(endpoints.facilities);
        const list = Array.isArray(facs) ? facs : [];

        if (cancelled) return;
        setFacilities(list);

        const saved = await AsyncStorage.getItem(FACILITY_STORAGE_KEY);
        const defaultId = saved || list[0]?.id || null;

        if (!cancelled) setFacilityId(defaultId);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load facilities:", err);
        setFacilities([]);
        setFacilityId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, ent.ready, ent.mode]);

  const switchFacility = async (id: string) => {
    try {
      await AsyncStorage.setItem(FACILITY_STORAGE_KEY, id);
      setFacilityId(id);
    } catch (err) {
      console.error("Failed to save facility selection:", err);
    }
  };

  return (
    <FacilityContext.Provider value={{ facilities, facilityId, switchFacility }}>
      {children}
    </FacilityContext.Provider>
  );
}

export const useFacility = () => useContext(FacilityContext);
