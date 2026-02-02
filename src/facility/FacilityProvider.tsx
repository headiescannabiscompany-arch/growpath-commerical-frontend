import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../auth/AuthProvider";

const FacilityContext = createContext<any>(null);

export function FacilityProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get(endpoints.facilities, token).then((facs) => {
      setFacilities(facs);
      const last = localStorage.getItem("facilityId") || facs[0]?.id;
      setFacilityId(last);
    });
  }, [token]);

  const switchFacility = (id: string) => {
    localStorage.setItem("facilityId", id);
    setFacilityId(id);
    // React Query cache invalidation will hook here
  };

  return (
    <FacilityContext.Provider value={{ facilities, facilityId, switchFacility }}>
      {children}
    </FacilityContext.Provider>
  );
}

export const useFacility = () => useContext(FacilityContext);
