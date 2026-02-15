import React, { createContext, useContext, useMemo, useState } from "react";

const FacilityContext = createContext(null);

export function FacilityProvider({ children }) {
  const [selectedId, setSelectedId] = useState(null);

  const value = useMemo(
    () => ({
      selectedId,
      setSelectedId
    }),
    [selectedId]
  );

  return <FacilityContext.Provider value={value}>{children}</FacilityContext.Provider>;
}

export function useFacility() {
  const ctx = useContext(FacilityContext);
  if (!ctx) {
    // Safe fallback so screens don't crash if provider isn't mounted yet
    return { selectedId: null, setSelectedId: () => {} };
  }
  return ctx;
}

export default FacilityContext;
