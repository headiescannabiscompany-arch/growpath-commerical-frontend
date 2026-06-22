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
      canManageRooms: false,
      canDeleteRooms: false,
      hiddenManageReason: "You do not have permission to manage rooms and equipment."
    });
  });

  it("allows staff to manage rooms when facility context is active", () => {
    const access = getFacilityRoomAccess({
      can: () => false,
      facilityRole: "STAFF"
    });

    expect(access.canManageRooms).toBe(true);
    expect(access.canDeleteRooms).toBe(false);
    expect(access.hiddenManageReason).toBeNull();
  });

  it("allows owners and managers to delete rooms", () => {
    const can = (capability: string | string[]) =>
      capability === CAPABILITY_KEYS.ROOMS_EQUIPMENT_STAFF;

    expect(getFacilityRoomAccess({ can, facilityRole: "OWNER" }).canDeleteRooms).toBe(
      true
    );
    expect(getFacilityRoomAccess({ can, facilityRole: "MANAGER" }).canDeleteRooms).toBe(
      true
    );
    expect(getFacilityRoomAccess({ can, facilityRole: "STAFF" }).canDeleteRooms).toBe(
      false
    );
  });
});
