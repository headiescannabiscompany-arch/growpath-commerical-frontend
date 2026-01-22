// FacilityContext.js: Provides facility-scoped identity, membership, and permissions
import React, { createContext, useContext, useMemo, useState } from "react";
import { useContext as useAuthContext } from "./AuthContext";

export const FacilityContext = createContext();

export function FacilityProvider({ children }) {
  const { user } = useAuthContext();
  // Default to last used or first facility, or null
  const [activeFacilityId, setActiveFacilityId] = useState(
    user?.lastFacilityId || user?.memberships?.[0]?.facilityId || null
  );

  // Find the active membership for the current facility
  const activeMembership = useMemo(() => {
    return (
      user?.memberships?.find((m) => String(m.facilityId) === String(activeFacilityId)) ||
      null
    );
  }, [user, activeFacilityId]);

  // Compute facility-specific permissions/capabilities
  const facilityCaps = useMemo(() => {
    const role = activeMembership?.role;
    const isOwner = role === "OWNER";
    const isManager = role === "MANAGER";
    const isStaff = role === "STAFF";
    const isAuditor = role === "AUDITOR";
    return {
      isOwner,
      isManager,
      isStaff,
      isAuditor,
      canViewFacility: !!activeMembership,
      canManagePeople: isOwner || isManager,
      canViewCompliance: isOwner || isManager,
      canUseMetrc: isOwner || isManager,
      canViewAllRooms: isOwner || isManager,
      assignedRooms: activeMembership?.assignments?.rooms || []
      // Add more as needed
    };
  }, [activeMembership]);

  return (
    <FacilityContext.Provider
      value={{
        activeFacilityId,
        setActiveFacilityId,
        activeMembership,
        facilityCaps
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  return useContext(FacilityContext);
}
