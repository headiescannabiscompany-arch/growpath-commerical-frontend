import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import {
  applyPlanCapabilities,
  getEffectivePlan,
  resolveEntitlementsMode,
  resolveWorkspaceMode,
  shouldApplyFacilityRoleCapabilities
} from "../../src/entitlements/EntitlementsProvider";

describe("entitlement mode access", () => {
  it("treats inactive paid signup intent as free effective access", () => {
    expect(getEffectivePlan("pro", "inactive")).toBe("free");
    expect(getEffectivePlan("commercial", "inactive")).toBe("free");
    expect(getEffectivePlan("facility", "inactive")).toBe("free");
    expect(getEffectivePlan("pro", "free")).toBe("free");
    expect(getEffectivePlan("commercial", "free")).toBe("free");
    expect(getEffectivePlan("facility", "free")).toBe("free");
  });

  it("keeps paid effective access for active and trialing subscriptions", () => {
    expect(getEffectivePlan("pro", "active")).toBe("pro");
    expect(getEffectivePlan("commercial", "trialing")).toBe("commercial");
    expect(getEffectivePlan("facility", "trial")).toBe("facility");
  });

  it("does not grant Commercial mode from a plan name alone", () => {
    expect(
      resolveEntitlementsMode(
        { mode: "personal", plan: "commercial", capabilities: {} },
        null
      )
    ).toBe("personal");
  });

  it("grants Commercial mode from backend ctx.mode", () => {
    expect(
      resolveEntitlementsMode(
        { mode: "commercial", plan: "commercial", capabilities: {} },
        null
      )
    ).toBe("commercial");
  });

  it("grants preferred Commercial mode from the canonical capability", () => {
    expect(
      resolveEntitlementsMode(
        {
          mode: "personal",
          capabilities: { [CAPABILITY_KEYS.COMMERCIAL_HOME]: true }
        },
        "commercial"
      )
    ).toBe("commercial");
  });

  it("retains Facility mode from active facility context", () => {
    expect(
      resolveEntitlementsMode(
        { mode: "facility", facilityId: "facility-1", facilityRole: "STAFF" },
        null
      )
    ).toBe("facility");
  });

  it("keeps inactive paid account intent in the workspace mode", () => {
    expect(resolveWorkspaceMode("facility", "personal")).toBe("facility");
    expect(resolveWorkspaceMode("commercial", "personal")).toBe("commercial");
    expect(resolveWorkspaceMode("pro", "personal")).toBe("personal");
  });

  it("applies facility role capabilities only after paid facility access is effective", () => {
    expect(shouldApplyFacilityRoleCapabilities("facility", "facility")).toBe(true);
    expect(shouldApplyFacilityRoleCapabilities("facility", "free")).toBe(false);
    expect(shouldApplyFacilityRoleCapabilities("commercial", "facility")).toBe(false);
    expect(shouldApplyFacilityRoleCapabilities("personal", "facility")).toBe(false);
  });

  it("grants commercial inventory write to active commercial workspaces", () => {
    const normalized: Record<string, boolean> = {};

    applyPlanCapabilities(normalized, "commercial", "commercial");

    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_HOME]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE]).toBe(true);
  });
});
