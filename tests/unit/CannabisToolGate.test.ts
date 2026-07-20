jest.mock("expo-router", () => ({
  Redirect: () => null,
  Stack: () => null,
  useLocalSearchParams: () => ({}),
  usePathname: () => "/home/personal/tools"
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { growInterests: {} } })
}));

import { canOpenCannabisTool } from "@/app/home/personal/(tabs)/tools/_layout";

describe("cannabis tool gate", () => {
  it("blocks cannabis tools without a Cannabis Tier 1 interest", () => {
    expect(
      canOpenCannabisTool("/home/personal/tools/harvest-readiness", {
        crops: ["Vegetables"]
      })
    ).toBe(false);
    expect(
      canOpenCannabisTool("/home/personal/tools/harvest-readiness", {
        crops: ["Cannabis"]
      })
    ).toBe(true);
  });

  it("does not block general horticulture tools", () => {
    expect(
      canOpenCannabisTool("/home/personal/tools/vpd", { crops: ["Vegetables"] })
    ).toBe(true);
  });

  it("allows cannabis tools when the account explicitly enables cannabis content", () => {
    expect(
      canOpenCannabisTool("/home/personal/tools/harvest-readiness", {}, "show")
    ).toBe(true);
  });

  it("recognizes Cannabis in a tiered or migrated interest field", () => {
    expect(
      canOpenCannabisTool("/home/personal/tools/harvest-readiness", {
        tier1: ["Cannabis"]
      })
    ).toBe(true);
  });

  it("gates legacy harvest aliases, genetics, and calendar routes", () => {
    for (const pathname of [
      "/home/personal/tools/harvest-estimator",
      "/home/personal/tools/genetics-inventory",
      "/home/personal/tools/auto-grow-calendar"
    ]) {
      expect(canOpenCannabisTool(pathname, { crops: ["Vegetables"] })).toBe(false);
    }
  });

  it("allows a cannabis tool from structured grow context without guessing from its name", () => {
    expect(
      canOpenCannabisTool(
        "/home/personal/tools/harvest-readiness",
        { crops: ["Vegetables"] },
        "hide",
        {
          id: "grow-cannabis",
          name: "My garden",
          growInterests: { crops: ["Cannabis"] }
        } as any
      )
    ).toBe(true);
    expect(
      canOpenCannabisTool("/home/personal/tools/harvest-readiness", {}, "hide", {
        id: "grow-name-only",
        name: "Cannabis words only"
      } as any)
    ).toBe(false);
  });

  it("keeps crop identification general even when the submitted crop is cannabis", () => {
    expect(
      canOpenCannabisTool("/home/personal/tools/species-crop-id", {
        crops: ["Vegetables"]
      })
    ).toBe(true);
  });
});
