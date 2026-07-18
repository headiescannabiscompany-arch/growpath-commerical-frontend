jest.mock("expo-router", () => ({
  Redirect: () => null,
  Stack: () => null,
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
});
