import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FacilityRoomAccessInput = {
  can?: ((capability: string | string[]) => boolean) | null;
  facilityRole?: string | null;
};

export type FacilityRoomAccess = {
  canCreateRooms: boolean;
  canManageEquipmentCycles: boolean;
  canDeleteRooms: boolean;
  hiddenManageReason: string | null;
  hiddenRoomReason: string | null;
};

function canOperateInRoom(role: unknown) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

function canCreateRoom(role: unknown) {
  return role === "OWNER" || role === "MANAGER";
}

function canDeleteRoom(role: unknown) {
  return role === "OWNER";
}

export function getFacilityRoomAccess({
  can,
  facilityRole
}: FacilityRoomAccessInput): FacilityRoomAccess {
  const hasCapability = Boolean(can?.(CAPABILITY_KEYS.ROOMS_EQUIPMENT_STAFF));
  const canManageEquipmentCycles = canOperateInRoom(facilityRole) && hasCapability;
  const canCreateRooms = canCreateRoom(facilityRole) && hasCapability;

  return {
    canCreateRooms,
    canManageEquipmentCycles,
    canDeleteRooms: canDeleteRoom(facilityRole) && hasCapability,
    hiddenManageReason: canManageEquipmentCycles
      ? null
      : "You do not have permission to manage rooms and equipment.",
    hiddenRoomReason: canCreateRooms
      ? null
      : "Only facility owners and managers can create rooms."
  };
}
