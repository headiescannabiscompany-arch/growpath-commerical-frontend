import type { FacilityAction } from "./actions";
import { CAPABILITY_KEYS as K, normalizeFacilityRole } from "@/entitlements";

export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER";

const OWNER_CAPS: FacilityAction[] = [
  K.FACILITY_ACCESS,
  K.TEAM_VIEW,
  K.TEAM_INVITE,
  K.TEAM_UPDATE_ROLE,
  K.TEAM_REMOVE,
  K.TASKS_READ,
  K.TASKS_WRITE,
  K.GROWS_READ,
  K.GROWS_WRITE,
  K.PLANTS_READ,
  K.PLANTS_WRITE,
  K.GROWLOGS_READ,
  K.GROWLOGS_WRITE,
  K.INVENTORY_READ,
  K.INVENTORY_WRITE,
  K.COMPLIANCE_READ,
  K.COMPLIANCE_WRITE,
  K.AUDIT_READ,
  K.SOP_RUNS_READ,
  K.SOP_RUNS_WRITE,
  K.FACILITY_SETTINGS_EDIT,
  K.EXPORT_COMPLIANCE
];

const MANAGER_CAPS: FacilityAction[] = OWNER_CAPS.filter(
  (cap) => cap !== K.FACILITY_SETTINGS_EDIT
);

const STAFF_CAPS: FacilityAction[] = [
  K.FACILITY_ACCESS,
  K.TASKS_READ,
  K.TASKS_WRITE,
  K.GROWS_READ,
  K.GROWS_WRITE,
  K.PLANTS_READ,
  K.PLANTS_WRITE,
  K.GROWLOGS_READ,
  K.GROWLOGS_WRITE,
  K.INVENTORY_READ,
  K.INVENTORY_WRITE
];

const VIEWER_CAPS: FacilityAction[] = [
  K.FACILITY_ACCESS,
  K.TASKS_READ,
  K.GROWS_READ,
  K.PLANTS_READ,
  K.GROWLOGS_READ,
  K.INVENTORY_READ,
  K.COMPLIANCE_READ,
  K.AUDIT_READ,
  K.SOP_RUNS_READ
];

export function roleCapabilities(role: FacilityRole | string | null | undefined) {
  const normalized = normalizeFacilityRole(role) || "VIEWER";
  switch (normalized) {
    case "OWNER":
      return OWNER_CAPS;
    case "MANAGER":
      return MANAGER_CAPS;
    case "STAFF":
      return STAFF_CAPS;
    default:
      return VIEWER_CAPS;
  }
}

export const RolePolicy: Record<FacilityRole, Set<FacilityAction>> = {
  OWNER: new Set(OWNER_CAPS),
  MANAGER: new Set(MANAGER_CAPS),
  STAFF: new Set(STAFF_CAPS),
  VIEWER: new Set(VIEWER_CAPS)
};
