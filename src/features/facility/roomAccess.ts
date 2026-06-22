import { CAPABILITY_KEYS } from "@/entitlements/capabilityKeys";

export type FacilityRoomAccessInput = {
  can?: ((capability: string | string[]) => boolean) | null;
  facilityRole?: string | null;
};

export type FacilityRoomAccess = {
  canManageRooms: boolean;
  canDeleteRooms: boolean;
  hiddenManageReason: string | null;
};

function canOperate(role: unknown) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

function canDelete(role: unknown) {
  return role === "OWNER" || role === "MANAGER";
}

export function getFacilityRoomAccess({
  can,
  facilityRole
}: FacilityRoomAccessInput): FacilityRoomAccess {
  const hasCapability = Boolean(can?.(CAPABILITY_KEYS.ROOMS_EQUIPMENT_STAFF));
  const roleCanOperate = canOperate(facilityRole);
  const canManageRooms = roleCanOperate && (hasCapability || roleCanOperate);

  return {
    canManageRooms,
    canDeleteRooms: canManageRooms && canDelete(facilityRole),
    hiddenManageReason: canManageRooms
      ? null
      : "You do not have permission to manage rooms and equipment."
  };
}
