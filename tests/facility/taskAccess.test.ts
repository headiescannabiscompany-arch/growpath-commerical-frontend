import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import { getFacilityTaskAccess } from "../../src/features/facility/taskAccess";

describe("facility task UI capability access", () => {
  it("hides create-task actions when TASKS_WRITE is disabled", () => {
    const access = getFacilityTaskAccess({
      can: () => false,
      facilityRole: "MANAGER"
    });

    expect(access).toEqual({
      canCreateTask: false,
      canAssignTask: false,
      hiddenCreateReason: "You do not have permission to create tasks."
    });
  });

  it("shows create-task actions when TASKS_WRITE is enabled", () => {
    const access = getFacilityTaskAccess({
      can: (capability) => capability === CAPABILITY_KEYS.TASKS_WRITE,
      facilityRole: "STAFF"
    });

    expect(access.canCreateTask).toBe(true);
    expect(access.canAssignTask).toBe(false);
    expect(access.hiddenCreateReason).toBeNull();
  });

  it("only owners and managers can assign tasks", () => {
    const can = (capability: string | string[]) => capability === CAPABILITY_KEYS.TASKS_WRITE;

    expect(getFacilityTaskAccess({ can, facilityRole: "OWNER" }).canAssignTask).toBe(
      true
    );
    expect(getFacilityTaskAccess({ can, facilityRole: "MANAGER" }).canAssignTask).toBe(
      true
    );
    expect(getFacilityTaskAccess({ can, facilityRole: "STAFF" }).canAssignTask).toBe(
      false
    );
  });
});
