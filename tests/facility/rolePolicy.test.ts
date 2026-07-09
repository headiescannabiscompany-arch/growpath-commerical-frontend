import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import { can } from "../../src/facility/roleGates";
import { roleCapabilities } from "../../src/permissions/rolePolicy";

describe("facility role write policy", () => {
  it("limits STAFF capabilities to tasks, logs, and read-only core records", () => {
    const capabilities = new Set(roleCapabilities("STAFF"));

    expect(capabilities.has(CAPABILITY_KEYS.TASKS_WRITE)).toBe(true);
    expect(capabilities.has(CAPABILITY_KEYS.GROWLOGS_WRITE)).toBe(true);
    expect(capabilities.has(CAPABILITY_KEYS.GROWS_WRITE)).toBe(false);
    expect(capabilities.has(CAPABILITY_KEYS.PLANTS_WRITE)).toBe(false);
    expect(capabilities.has(CAPABILITY_KEYS.INVENTORY_WRITE)).toBe(false);
    expect(capabilities.has(CAPABILITY_KEYS.TEAM_INVITE)).toBe(false);
  });

  it("keeps grows, plants, and inventory writes at MANAGER+", () => {
    expect(can("STAFF", "GROWS_CREATE")).toBe(false);
    expect(can("STAFF", "GROWS_UPDATE")).toBe(false);
    expect(can("STAFF", "PLANTS_CREATE")).toBe(false);
    expect(can("STAFF", "PLANTS_UPDATE")).toBe(false);
    expect(can("STAFF", "INVENTORY_CREATE")).toBe(false);
    expect(can("STAFF", "INVENTORY_UPDATE")).toBe(false);

    expect(can("MANAGER", "GROWS_CREATE")).toBe(true);
    expect(can("MANAGER", "PLANTS_CREATE")).toBe(true);
    expect(can("MANAGER", "INVENTORY_CREATE")).toBe(true);
  });
});
