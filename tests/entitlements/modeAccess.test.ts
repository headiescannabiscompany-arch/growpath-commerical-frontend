import { describe, expect, it } from "@jest/globals";
import {
  resolveLocalCommercialPreviewSession,
  resolveLocalFacilityPreviewSession,
  resolveLocalPersonalPreviewSession,
  resolveLocalPreviewSession
} from "../../src/auth/AuthContext";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import {
  applyDefaultCourseLimits,
  applyFacilityRoleCapabilities,
  applyPlanCapabilities,
  applyUniversalCapabilities,
  entitlementApplicationFingerprint,
  getEffectivePlan,
  resolveDevEntitlementsPlan,
  resolveEntitlementsMode,
  resolveRequestedPlan,
  resolveWorkspaceAccessPlan,
  resolveWorkspaceMode,
  shouldBlockEntitlementBootstrap,
  shouldApplyFacilityRoleCapabilities
} from "../../src/entitlements/EntitlementsProvider";

describe("entitlement mode access", () => {
  it("reapplies unchanged server entitlements when the preferred workspace changes", () => {
    const ctx = { mode: "facility", facilityId: "facility-1" };
    const user = { id: "user-1" };

    expect(entitlementApplicationFingerprint(ctx, user, "facility")).not.toBe(
      entitlementApplicationFingerprint(ctx, user, "commercial")
    );
  });

  it("keeps resolved entitlements available during same-session refreshes", () => {
    expect(shouldBlockEntitlementBootstrap("loading", false)).toBe(true);
    expect(shouldBlockEntitlementBootstrap("loading", true)).toBe(false);
    expect(shouldBlockEntitlementBootstrap("idle", true)).toBe(false);
    expect(shouldBlockEntitlementBootstrap("ready", false)).toBe(false);
  });

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

  it("prefers canonical me context over a stale free user plan", () => {
    const requestedPlan = resolveRequestedPlan(
      { requestedPlan: "pro", plan: "pro", subscriptionStatus: "active" },
      { plan: "free", subscriptionStatus: "active" },
      "free"
    );
    const capabilities: Record<string, boolean> = {};

    expect(requestedPlan).toBe("pro");
    expect(getEffectivePlan(requestedPlan, "active")).toBe("pro");
    applyPlanCapabilities(capabilities, requestedPlan, "personal");
    expect(capabilities[CAPABILITY_KEYS.COURSES_SELL_PAID]).toBe(true);
  });

  it("accepts local paid entitlement overrides only in dev", () => {
    expect(resolveDevEntitlementsPlan("commercial", true)).toBe("commercial");
    expect(resolveDevEntitlementsPlan("facility", true)).toBe("facility");
    expect(resolveDevEntitlementsPlan("pro", true)).toBe("pro");
    expect(resolveDevEntitlementsPlan("free", true)).toBeNull();
    expect(resolveDevEntitlementsPlan("commercial", false)).toBeNull();
  });

  it("treats the local paid preview query as pro in dev only", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { search: "?paid=1" }
    });

    expect(resolveDevEntitlementsPlan(null, true)).toBe("pro");
    expect(resolveDevEntitlementsPlan(null, false)).toBeNull();
  });

  it("uses a separate local commercial preview identity on commercial routes", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "127.0.0.1",
        pathname: "/home/commercial",
        search: "?commercialEmail=brand@example.test"
      }
    });

    const preview = resolveLocalCommercialPreviewSession();

    expect(preview?.token).toBe("local-preview-commercial-token");
    expect(preview?.user.email).toBe("brand@example.test");
    expect(preview?.ctx.mode).toBe("commercial");
    expect(preview?.ctx.plan).toBe("commercial");
    expect(preview?.ctx.capabilities[CAPABILITY_KEYS.COMMERCIAL_HOME]).toBe(true);
  });

  it("lets commercial routes win over stale facility preview query params", () => {
    const preview = resolveLocalPreviewSession({
      hostname: "127.0.0.1",
      pathname: "/home/commercial/courses",
      search:
        "?facility=1&devPlan=facility&facilityEmail=operator@example.test&commercialEmail=brand@example.test"
    });

    expect(preview?.token).toBe("local-preview-commercial-token");
    expect(preview?.user.email).toBe("brand@example.test");
    expect(preview?.ctx.mode).toBe("commercial");
  });

  it("uses a separate local facility preview identity on facility routes", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hostname: "127.0.0.1",
        pathname: "/home/facility/dashboard",
        search:
          "?facilityEmail=operator@example.test&facilityId=facility-preview-1&facilityRole=MANAGER"
      }
    });

    const preview = resolveLocalFacilityPreviewSession();

    expect(preview?.token).toBe("local-preview-facility-token");
    expect(preview?.user.email).toBe("operator@example.test");
    expect(preview?.ctx.mode).toBe("facility");
    expect(preview?.ctx.plan).toBe("facility");
    expect(preview?.ctx.facilityId).toBe("facility-preview-1");
    expect(preview?.ctx.facilityRole).toBe("MANAGER");
    expect(preview?.ctx.capabilities[CAPABILITY_KEYS.FACILITY_ACCESS]).toBe(true);
    expect(preview?.ctx.capabilities[CAPABILITY_KEYS.COMPLIANCE_WRITE]).toBe(true);
  });

  it("lets facility routes win over stale commercial preview query params", () => {
    const preview = resolveLocalPreviewSession({
      hostname: "127.0.0.1",
      pathname: "/home/facility/dashboard",
      search:
        "?commercial=1&devPlan=commercial&commercialEmail=brand@example.test&facilityEmail=operator@example.test"
    });

    expect(preview?.token).toBe("local-preview-facility-token");
    expect(preview?.user.email).toBe("operator@example.test");
    expect(preview?.ctx.mode).toBe("facility");
  });

  it("uses a separate local free single-user preview identity on personal routes", () => {
    const preview = resolveLocalPersonalPreviewSession({
      hostname: "127.0.0.1",
      pathname: "/home/personal",
      search: "?single=1&singleEmail=single@example.test&devPlan=free"
    });

    expect(preview?.token).toBe("local-preview-personal-token");
    expect(preview?.user.email).toBe("single@example.test");
    expect(preview?.ctx.mode).toBe("personal");
    expect(preview?.ctx.plan).toBe("free");
  });

  it("honors the local single-user Pro preview plan and paid capabilities", () => {
    const preview = resolveLocalPersonalPreviewSession({
      hostname: "127.0.0.1",
      pathname: "/home/personal/tools",
      search: "?devPlan=pro"
    });

    expect(preview?.token).toBe("local-preview-personal-token");
    expect(preview?.user.email).toBe("single-pro-demo@growpathai.local");
    expect(preview?.user.plan).toBe("pro");
    expect(preview?.user.subscriptionStatus).toBe("active");
    expect(preview?.ctx.mode).toBe("personal");
    expect(preview?.ctx.plan).toBe("pro");
    expect(preview?.ctx.capabilities.TOOL_NPK).toBe(true);
    expect(preview?.ctx.capabilities.DIAGNOSE_ADVANCED).toBe(true);
    expect(preview?.ctx.limits.maxGrows).toBe(10);
  });

  it("lets personal routes win over stale commercial and facility preview params", () => {
    const preview = resolveLocalPreviewSession({
      hostname: "127.0.0.1",
      pathname: "/home/personal/courses",
      search:
        "?commercial=1&facility=1&commercialEmail=brand@example.test&facilityEmail=operator@example.test&singleEmail=single@example.test"
    });

    expect(preview?.token).toBe("local-preview-personal-token");
    expect(preview?.user.email).toBe("single@example.test");
    expect(preview?.ctx.mode).toBe("personal");
  });

  it("does not replace authenticated local sessions on bare workspace routes", () => {
    expect(
      resolveLocalPreviewSession({
        hostname: "localhost",
        pathname: "/home/facility/dashboard",
        search: ""
      })
    ).toBeNull();
    expect(
      resolveLocalPreviewSession({
        hostname: "127.0.0.1",
        pathname: "/home/commercial",
        search: "?growId=real-grow-id"
      })
    ).toBeNull();
    expect(
      resolveLocalPreviewSession({
        hostname: "localhost",
        pathname: "/home/personal/tools",
        search: ""
      })
    ).toBeNull();
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

  it("grants preferred Commercial mode from an active paid Facility plan", () => {
    expect(
      resolveEntitlementsMode(
        { mode: "facility", facilityId: "facility-1", facilityRole: "OWNER" },
        "commercial",
        "facility"
      )
    ).toBe("commercial");
  });

  it("rejects preferred Commercial mode after Facility access becomes inactive", () => {
    expect(
      resolveEntitlementsMode(
        { mode: "facility", facilityId: "facility-1", facilityRole: "OWNER" },
        "commercial",
        "free"
      )
    ).toBe("facility");
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

  it("honors an explicitly selected eligible workspace over the account plan", () => {
    expect(resolveWorkspaceMode("facility", "commercial", "commercial")).toBe(
      "commercial"
    );
    expect(resolveWorkspaceMode("facility", "personal", "personal")).toBe("personal");
    expect(resolveWorkspaceMode("commercial", "facility", "facility")).toBe("facility");
  });

  it("does not honor a preferred mode that entitlement resolution rejected", () => {
    expect(resolveWorkspaceMode("facility", "facility", "commercial")).toBe("facility");
  });

  it("applies facility role capabilities only after paid facility access is effective", () => {
    expect(shouldApplyFacilityRoleCapabilities("facility", "facility")).toBe(true);
    expect(shouldApplyFacilityRoleCapabilities("facility", "free")).toBe(false);
    expect(shouldApplyFacilityRoleCapabilities("commercial", "facility")).toBe(false);
    expect(shouldApplyFacilityRoleCapabilities("personal", "facility")).toBe(false);
  });

  it("uses the Facility subscription while preserving the member's personal plan", () => {
    const ctx = {
      facilityPlan: "facility",
      facilitySubscriptionStatus: "active"
    };

    expect(resolveWorkspaceAccessPlan("personal", "pro", ctx)).toBe("pro");
    expect(resolveWorkspaceAccessPlan("facility", "pro", ctx)).toBe("facility");
  });

  it("keeps Facility role capabilities locked when the Facility subscription is inactive", () => {
    expect(
      resolveWorkspaceAccessPlan("facility", "pro", {
        facilityPlan: "facility",
        facilitySubscriptionStatus: "canceled"
      })
    ).toBe("free");
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

  it("grants managers operational writes without owner account controls", () => {
    const normalized: Record<string, boolean> = {};

    applyFacilityRoleCapabilities(normalized, "MANAGER");

    expect(normalized[CAPABILITY_KEYS.TASKS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.GROWS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.INVENTORY_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.SOP_RUNS_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMPLIANCE_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TEAM_INVITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.TEAM_UPDATE_ROLE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.TEAM_REMOVE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.FACILITY_SETTINGS_EDIT]).not.toBe(true);
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

    applyUniversalCapabilities(normalized, "free");
    applyPlanCapabilities(normalized, "free", "personal");

    expect(normalized[CAPABILITY_KEYS.GROWS_PERSONAL_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.LOGS_PERSONAL_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.DIAGNOSE_BASIC]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.DIAGNOSE_AI]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TOOLS_VPD]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.GROWS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.LOGS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.AI_ASSISTANT]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.FEEDING_SCHEDULE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TOOL_NPK]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_HOME]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.FORUM_VIEW]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.FORUM_POST]).toBe(false);
  });

  it("lets every personal plan create free or paid courses with plan limits", () => {
    const freeCaps: Record<string, boolean> = {};
    const proCaps: Record<string, boolean> = {};

    applyUniversalCapabilities(freeCaps, "free");
    applyPlanCapabilities(freeCaps, "free", "personal");
    applyUniversalCapabilities(proCaps, "pro");
    applyPlanCapabilities(proCaps, "pro", "personal");

    for (const caps of [freeCaps, proCaps]) {
      expect(caps[CAPABILITY_KEYS.COURSES_VIEW]).toBe(true);
      expect(caps[CAPABILITY_KEYS.SEE_PAID_COURSES]).toBe(true);
      expect(caps[CAPABILITY_KEYS.COURSES_CREATE]).toBe(true);
      expect(caps[CAPABILITY_KEYS.PUBLISH_COURSES]).toBe(true);
    }
    expect(freeCaps[CAPABILITY_KEYS.COURSES_SELL_PAID]).toBe(true);
    expect(proCaps[CAPABILITY_KEYS.COURSES_SELL_PAID]).toBe(true);

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

    applyUniversalCapabilities(normalized, "pro");
    applyPlanCapabilities(normalized, "pro", "personal");

    expect(normalized[CAPABILITY_KEYS.GROWS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.LOGS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.PLANTS_PERSONAL_WRITE]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.AI_ASSISTANT]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TOOL_NPK]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.TASK_REMINDERS]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.FORUM_POST]).toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_HOME]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]).not.toBe(true);
    expect(normalized[CAPABILITY_KEYS.FACILITY_ACCESS]).not.toBe(true);
  });
});
