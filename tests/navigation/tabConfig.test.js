import { CAPABILITIES } from "../../src/capabilities/keys";
import { PLANS } from "../../src/capabilities/plans";
import { TAB_CONFIG, canAccess } from "../../src/navigation/tabConfig";

describe("legacy tab configuration", () => {
  it("uses only defined capability keys", () => {
    const defined = new Set(Object.values(CAPABILITIES));
    const required = TAB_CONFIG.flatMap((tab) => tab.requiredCaps || []);

    expect(required.length).toBeGreaterThan(0);
    expect(required.every(Boolean)).toBe(true);
    expect(required.every((capability) => defined.has(capability))).toBe(true);
  });

  it("keeps default plan tabs usable without undefined capability gaps", () => {
    const personalCaps = Object.fromEntries(PLANS.personal.map((cap) => [cap, true]));

    expect(canAccess([CAPABILITIES.SEARCH], personalCaps)).toBe(true);
    expect(canAccess([CAPABILITIES.VIEW_FEED], personalCaps)).toBe(true);
    expect(canAccess([CAPABILITIES.DEBUG], personalCaps)).toBe(false);
  });
});
