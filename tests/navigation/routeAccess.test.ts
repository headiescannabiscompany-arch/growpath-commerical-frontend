import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import { canAccessRoute, getRoutePolicy } from "../../src/navigation/routeAccess";

const commercial = (capabilities: Record<string, boolean>) => ({
  ready: true,
  mode: "commercial" as const,
  capabilities
});

describe("route access policy", () => {
  it("blocks Facility mode from Commercial routes", () => {
    expect(
      canAccessRoute("/storefront", {
        ready: true,
        mode: "facility",
        capabilities: { [CAPABILITY_KEYS.STORE_FRONT_VIEW]: true }
      })
    ).toBe(false);
  });

  it("blocks direct entry when the required capability is absent", () => {
    expect(canAccessRoute("/storefront", commercial({}))).toBe(false);
    expect(canAccessRoute("/feed", commercial({}))).toBe(false);
  });

  it("allows direct entry when mode and capability match", () => {
    expect(
      canAccessRoute(
        "/storefront",
        commercial({ [CAPABILITY_KEYS.STORE_FRONT_VIEW]: true })
      )
    ).toBe(true);
  });

  it("requires both inventory capabilities for the create route", () => {
    expect(
      canAccessRoute(
        "/home/commercial/inventory-create",
        commercial({ [CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE]: true })
      )
    ).toBe(false);
    expect(
      canAccessRoute(
        "/home/commercial/inventory-create",
        commercial({
          [CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]: true,
          [CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE]: true
        })
      )
    ).toBe(true);
  });

  it("leaves routes without a policy unchanged", () => {
    expect(getRoutePolicy("/login")).toBeNull();
    expect(
      canAccessRoute("/login", {
        ready: true,
        mode: "personal",
        capabilities: {}
      })
    ).toBe(true);
  });
});
