import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import { getFacilityRoomAccess } from "../../src/features/facility/roomAccess";

describe("facility room UI access", () => {
  it("hides room management when no facility role is present", () => {
    expect(
      getFacilityRoomAccess({
        can: () => true,
        facilityRole: null
      })
    ).toEqual({
      canCreateRooms: false,
      canManageEquipmentCycles: false,
      canDeleteRooms: false,
      hiddenManageReason: "You do not have permission to manage rooms and equipment.",
      hiddenRoomReason: "Only facility owners and managers can create rooms."
    });
  });

  it("hides room management when facility capability is inactive", () => {
    const access = getFacilityRoomAccess({
      can: () => false,
      facilityRole: "STAFF"
    });

    expect(access.canCreateRooms).toBe(false);
    expect(access.canManageEquipmentCycles).toBe(false);
    expect(access.canDeleteRooms).toBe(false);
    expect(access.hiddenManageReason).toBe(
      "You do not have permission to manage rooms and equipment."
    );
    expect(access.hiddenRoomReason).toBe(
      "Only facility owners and managers can create rooms."
    );
  });

  it("allows staff to manage equipment and cycles but not rooms", () => {
    const access = getFacilityRoomAccess({
      can: (capability) => capability === CAPABILITY_KEYS.ROOMS_EQUIPMENT_STAFF,
      facilityRole: "STAFF"
    });

    expect(access.canCreateRooms).toBe(false);
    expect(access.canManageEquipmentCycles).toBe(true);
    expect(access.canDeleteRooms).toBe(false);
    expect(access.hiddenManageReason).toBeNull();
    expect(access.hiddenRoomReason).toBe(
      "Only facility owners and managers can create rooms."
    );
  });

  it("allows owners and managers to create rooms but only owners to delete rooms", () => {
    const can = (capability: string | string[]) =>
      capability === CAPABILITY_KEYS.ROOMS_EQUIPMENT_STAFF;

    expect(getFacilityRoomAccess({ can, facilityRole: "OWNER" }).canCreateRooms).toBe(
      true
    );
    expect(getFacilityRoomAccess({ can, facilityRole: "MANAGER" }).canCreateRooms).toBe(
      true
    );
    expect(getFacilityRoomAccess({ can, facilityRole: "OWNER" }).canDeleteRooms).toBe(
      true
    );
    expect(getFacilityRoomAccess({ can, facilityRole: "MANAGER" }).canDeleteRooms).toBe(
      false
    );
    expect(getFacilityRoomAccess({ can, facilityRole: "STAFF" }).canDeleteRooms).toBe(
      false
    );
  });
});
