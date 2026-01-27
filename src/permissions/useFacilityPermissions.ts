import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { useEntitlements } from "../entitlements";
import type { FacilityAction } from "./actions";
import { RolePolicy, type FacilityRole } from "./rolePolicy";
export function useFacilityPermissions() {
  const { user } = useAuth();
  const { facilityId } = useEntitlements();
  const role: FacilityRole = useMemo(() => {
    const map = (user as any)?.facilityRoleMap || {};
    return (map?.[facilityId || ""] as FacilityRole) || "VIEWER";
  }, [user, facilityId]);
  const can = (action: FacilityAction) => {
    return RolePolicy[role]?.has(action) ?? false;
  };
  return { role, can };
}
