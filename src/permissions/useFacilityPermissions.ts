import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { normalizeCapabilityKey, normalizeFacilityRole, useEntitlements } from "../entitlements";
import type { FacilityAction } from "./actions";
import { RolePolicy, roleCapabilities, type FacilityRole } from "./rolePolicy";
export function useFacilityPermissions() {
  const { user } = useAuth();
  const { facilityId } = useEntitlements();
  const role: FacilityRole = useMemo(() => {
    const map = (user as any)?.facilityRoleMap || {};
    return (
      (normalizeFacilityRole(map?.[facilityId || ""]) as FacilityRole) || "VIEWER"
    );
  }, [user, facilityId]);
  const can = (action: FacilityAction) => {
    const key = normalizeCapabilityKey(action);
    if (!key) return false;
    return RolePolicy[role]?.has(key as FacilityAction) ?? false;
  };
  const capabilities = useMemo(() => roleCapabilities(role), [role]);
  return { role, can, capabilities };
}
