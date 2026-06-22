import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FacilityTaskAccessInput = {
  can?: ((capability: string | string[]) => boolean) | null;
  facilityRole?: string | null;
};

export type FacilityTaskAccess = {
  canCreateTask: boolean;
  canAssignTask: boolean;
  hiddenCreateReason: string | null;
};

function canAssignRole(role: unknown) {
  return role === "OWNER" || role === "MANAGER";
}

export function getFacilityTaskAccess({
  can,
  facilityRole
}: FacilityTaskAccessInput): FacilityTaskAccess {
  const canCreateTask = Boolean(can?.(CAPABILITY_KEYS.TASKS_WRITE));
  return {
    canCreateTask,
    canAssignTask: canCreateTask && canAssignRole(facilityRole),
    hiddenCreateReason: canCreateTask
      ? null
      : "You do not have permission to create tasks."
  };
}
