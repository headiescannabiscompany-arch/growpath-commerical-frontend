import { describe, expect, it } from "@jest/globals";
import { decideLegacyFacilityAccess } from "../../src/features/routing/legacyFacilityAccess";
import { legacyFacilitySectionToRoute } from "../../src/features/routing/legacyFacilityRedirect";

describe("legacy facility route access", () => {
  it("redirects non-facility users away from legacy facility URLs", () => {
    expect(
      decideLegacyFacilityAccess({
        mode: "personal",
        routeFacilityId: "facility-1",
        selectedFacilityId: "facility-1"
      })
    ).toEqual({
      allowed: false,
      redirect: "/home/personal",
      reason: "wrong_mode"
    });
  });

  it("allows a facility user to enter the selected facility", () => {
    expect(
      decideLegacyFacilityAccess({
        mode: "facility",
        routeFacilityId: "facility-1",
        selectedFacilityId: "facility-1",
        entitledFacilityId: "facility-1"
      })
    ).toEqual({ allowed: true, facilityId: "facility-1" });
  });

  it("blocks direct access to another facility id", () => {
    expect(
      decideLegacyFacilityAccess({
        mode: "facility",
        routeFacilityId: "facility-2",
        selectedFacilityId: "facility-1",
        entitledFacilityId: "facility-1"
      })
    ).toEqual({
      allowed: false,
      redirect: "/home/facility/select",
      reason: "facility_mismatch"
    });
  });

  it("blocks another facility even when no selected facility has been hydrated yet", () => {
    expect(
      decideLegacyFacilityAccess({
        mode: "facility",
        routeFacilityId: "facility-2",
        selectedFacilityId: null,
        entitledFacilityId: "facility-1"
      })
    ).toEqual({
      allowed: false,
      redirect: "/home/facility/select",
      reason: "facility_mismatch"
    });
  });

  it("redirects legacy facility sections to canonical workspace URLs", () => {
    expect(legacyFacilitySectionToRoute("dashboard")).toBe("/home/facility/dashboard");
    expect(legacyFacilitySectionToRoute("tasks")).toBe("/home/facility/tasks");
    expect(legacyFacilitySectionToRoute("inventory")).toBe("/home/facility/inventory");
    expect(legacyFacilitySectionToRoute("rooms")).toBe("/home/facility/rooms");
    expect(legacyFacilitySectionToRoute("team")).toBe("/home/facility/team");
    expect(legacyFacilitySectionToRoute("compliance")).toBe("/home/facility/compliance");
    expect(legacyFacilitySectionToRoute("sops")).toBe("/home/facility/sop-runs");
  });
});
