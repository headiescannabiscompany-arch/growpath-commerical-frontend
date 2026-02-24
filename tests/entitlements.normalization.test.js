/**
 * Contract tests for capability + facility role normalization.
 *
 * These tests assume you have:
 *  - normalizeFacilityRole(role) exported from src/entitlements/normalize
 *  - normalizeCapabilityKey(key) exported from src/entitlements/normalize
 *  - buildCan(capabilitiesArrayOrSet) exported from src/entitlements/can
 *
 * If your exports differ, only adjust the imports  keep the assertions.
 */

import { normalizeCapabilityKey, normalizeFacilityRole } from "@/entitlements/normalize";
import { buildCan } from "@/entitlements/can";

describe("Entitlements normalization contract", () => {
  test("Facility role normalization: TECH aliases to STAFF", () => {
    expect(normalizeFacilityRole("OWNER")).toBe("OWNER");
    expect(normalizeFacilityRole("MANAGER")).toBe("MANAGER");
    expect(normalizeFacilityRole("STAFF")).toBe("STAFF");
    expect(normalizeFacilityRole("VIEWER")).toBe("VIEWER");

    // Legacy role (must not leak into app state)
    expect(normalizeFacilityRole("TECH")).toBe("STAFF");
  });

  test("Capability key normalization: dot + snake_case to UPPER_SNAKE_CASE", () => {
    expect(normalizeCapabilityKey("FACILITY_SETTINGS_EDIT")).toBe(
      "FACILITY_SETTINGS_EDIT"
    );

    // Legacy dot-style key -> canonical
    expect(normalizeCapabilityKey("facility.settings.edit")).toBe(
      "FACILITY_SETTINGS_EDIT"
    );

    // Feature keys -> canonical
    expect(normalizeCapabilityKey("diagnose_ai")).toBe("DIAGNOSE_AI");
    expect(normalizeCapabilityKey("courses_analytics")).toBe("COURSES_ANALYTICS");
    expect(normalizeCapabilityKey("growlogs_export")).toBe("GROWLOGS_EXPORT");

    // Facility action keys already canonical
    expect(normalizeCapabilityKey("TEAM_INVITE")).toBe("TEAM_INVITE");
    expect(normalizeCapabilityKey("TEAM_UPDATE_ROLE")).toBe("TEAM_UPDATE_ROLE");
  });

  test("can() must accept canonical keys AND legacy aliases", () => {
    const can = buildCan([
      "FACILITY_SETTINGS_EDIT",
      "TEAM_INVITE",
      "DIAGNOSE_AI"
    ]);

    // canonical
    expect(can("FACILITY_SETTINGS_EDIT")).toBe(true);
    expect(can("TEAM_INVITE")).toBe(true);
    expect(can("DIAGNOSE_AI")).toBe(true);

    // legacy alias forms
    expect(can("facility.settings.edit")).toBe(true);
    expect(can("diagnose_ai")).toBe(true);

    // unknown must be false
    expect(can("NOT_A_REAL_KEY")).toBe(false);
    expect(can("forum_brand")).toBe(false);
  });

  test("can() should be case/format tolerant", () => {
    const can = buildCan(["TEAM_INVITE"]);
    expect(can("team_invite")).toBe(true);
    expect(can("Team.Invite")).toBe(true);
    expect(can("TEAM.INVITE")).toBe(true);
  });
});

