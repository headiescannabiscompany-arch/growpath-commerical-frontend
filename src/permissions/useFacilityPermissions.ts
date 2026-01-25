import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useEntitlements } from "../context/EntitlementsContext";
import type { FacilityAction } from "./actions";
import { RolePolicy, type FacilityRole } from "./rolePolicy";

export function useFacilityPermissions() {
  const { user } = useAuth();
  const { selectedFacilityId } = useEntitlements();

  const role: FacilityRole = useMemo(() => {
    const map = (user as any)?.facilityRoleMap || {};
    return (map?.[selectedFacilityId || ""] as FacilityRole) || "VIEWER";
  }, [user, selectedFacilityId]);

  const can = (action: FacilityAction) => {
    return RolePolicy[role]?.has(action) ?? false;
  };

  return { role, can };
}
