import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import {
  applyDefaultCourseLimits,
  applyFacilityRoleCapabilities,
  applyPlanCapabilities,
  applyUniversalCapabilities,
  getEffectivePlan,
  resolveDevEntitlementsPlan,
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

  it("accepts local paid entitlement overrides only in dev", () => {
    expect(resolveDevEntitlementsPlan("commercial", true)).toBe("commercial");
    expect(resolveDevEntitlementsPlan("facility", true)).toBe("facility");
    expect(resolveDevEntitlementsPlan("pro", true)).toBe("pro");
    expect(resolveDevEntitlementsPlan("free", true)).toBeNull();
    expect(resolveDevEntitlementsPlan("commercial", false)).toBeNull();
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

  it("keeps STAFF facility writes limited to tasks and grow logs", () => {
    const normalized: Record<string, boolean> = {};

    applyFacilityRoleCapabilities(normalized, "STAFF");

    expect(normalized[CAPABILITY_KEYS.TASKS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.GROWLOGS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.GROWS_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.INVENTORY_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.SOP_RUNS_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMPLIANCE_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.TEAM_INVITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT]).not.toBe(true);
  });

  it("grants managers operational, team, compliance, and settings writes", () => {
    const normalized: Record<string, boolean> = {};

    applyFacilityRoleCapabilities(normalized, "MANAGER");

    expect(normalized[CAPABILITY_KEYS.TASKS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.GROWS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.INVENTORY_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.SOP_RUNS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMPLIANCE_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TEAM_INVITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT]).toBe(true);
  });

  it("grants commercial inventory write to active commercial workspaces", () => {
    const normalized: Record<string, boolean> = {};

    applyPlanCapabilities(normalized, "commercial", "commercial");

    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_HOME]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE]).toBe(true);
  });

  it("keeps free personal users in the grow OS without commercial inventory", () => {
    const normalized: Record<string, boolean> = {};

    applyUniversalCapabilities(normalized);
    applyPlanCapabilities(normalized, "free", "personal");

    expect(normalized[CAPABILITY_KEYS.GROWS_PERSONAL_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.LOGS_PERSONAL_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.DIAGNOSE_BASIC]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TOOLS_VPD]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.GROWS_PERSONAL_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_HOME]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE]).not.toBe(true);
  });

  it("lets every personal plan create free or paid courses with plan limits", () => {
    const freeCaps: Record<string, boolean> = {};
    const proCaps: Record<string, boolean> = {};

    applyUniversalCapabilities(freeCaps);
    applyPlanCapabilities(freeCaps, "free", "personal");
    applyUniversalCapabilities(proCaps);
    applyPlanCapabilities(proCaps, "pro", "personal");

    for (const caps of [freeCaps, proCaps]) {
      expect(caps[CAPABILITY_KEYS.COURSES_VIEW]).toBe(true);
      expect(caps[CAPABILITY_KEYS.SEE_PAID_COURSES]).toBe(true);
      expect(caps[CAPABILITY_KEYS.COURSES_CREATE]).toBe(true);
      expect(caps[CAPABILITY_KEYS.COURSES_SELL_PAID]).toBe(true);
    }

    expect(applyDefaultCourseLimits({}, "free")).toMatchObject({
      maxPaidCourses: 1,
      maxLessonsPerCourse: 7
    });
    expect(applyDefaultCourseLimits({}, "pro")).toMatchObject({
      maxPaidCourses: 5,
      maxLessonsPerCourse: 20
    });
  });

  it("upgrades pro personal users without exposing commercial/facility workspaces", () => {
    const normalized: Record<string, boolean> = {};

    applyUniversalCapabilities(normalized);
    applyPlanCapabilities(normalized, "pro", "personal");

    expect(normalized[CAPABILITY_KEYS.GROWS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.LOGS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.AI_ASSISTANT]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TOOL_NPK]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TASK_REMINDERS]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_HOME]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.FACILITY_ACCESS]).not.toBe(true);
  });
});
