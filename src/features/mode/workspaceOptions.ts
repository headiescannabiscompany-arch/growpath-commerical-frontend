import { CAPABILITY_KEYS } from "@/entitlements";
import type { AccountMode } from "@/state/useAccountMode";

export type WorkspaceAccessSnapshot = {
  mode?: string | null;
  facilityId?: string | null;
  selectedFacilityId?: string | null;
  facilityRole?: string | null;
  can?: (capability: string | string[]) => boolean;
};

export function availableWorkspaceModes(access: WorkspaceAccessSnapshot): AccountMode[] {
  const modes: AccountMode[] = ["personal"];
  const canCommercial =
    access.mode === "commercial" ||
    access.can?.(CAPABILITY_KEYS.COMMERCIAL_HOME) === true;
  const canFacility =
    access.mode === "facility" ||
    Boolean(access.facilityId || access.selectedFacilityId || access.facilityRole) ||
    access.can?.(CAPABILITY_KEYS.FACILITY_ACCESS) === true;

  if (canCommercial) modes.push("commercial");
  if (canFacility) modes.push("facility");
  return modes;
}

export function workspaceHomeHref(mode: AccountMode, selectedFacilityId?: string | null) {
  if (mode === "commercial") return "/home/commercial";
  if (mode === "facility") {
    return selectedFacilityId ? "/home/facility" : "/home/facility/select";
  }
  return "/home/personal";
}
