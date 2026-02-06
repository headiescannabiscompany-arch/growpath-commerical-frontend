import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "../entitlements";

const FacilityContext = createContext<any>(null);

const FACILITY_STORAGE_KEY = "gp.selectedFacilityId";

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const ent = useEntitlements();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setFacilities([]);
      setFacilityId(null);
      return;
    }

    // Only fetch facilities for commercial and facility users
    // Personal users don't need the facilities list
    if (ent.mode === "personal") {
      console.log("[FACILITY] Skipping /api/facilities for personal user");
      setFacilities([]);
      setFacilityId(null);
      return;
    }

    (async () => {
      try {
        console.log("[FACILITY] Fetching facilities for mode:", ent.mode);
        const facs = await api.get(endpoints.facilities);
        setFacilities(Array.isArray(facs) ? facs : []);

        // Load saved facility or default to first
        const saved = await AsyncStorage.getItem(FACILITY_STORAGE_KEY);
        const defaultId = saved || facs[0]?.id;

        if (defaultId) {
          setFacilityId(defaultId);
        }
      } catch (err) {
        console.error("Failed to load facilities:", err);
        setFacilities([]);
        setFacilityId(null);
      }
    })();
  }, [token, ent.mode]);

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
