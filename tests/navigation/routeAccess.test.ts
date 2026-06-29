import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import { canAccessRoute, getRoutePolicy } from "../../src/navigation/routeAccess";

const commercial = (capabilities: Record<string, boolean>) => ({
  ready: true,
  mode: "commercial" as const,
  capabilities
});

const facility = (capabilities: Record<string, boolean>) => ({
  ready: true,
  mode: "facility" as const,
  capabilities
});

const COMMERCIAL_ONLY_ROUTES = [
  "/home/commercial",
  "/home/commercial/inventory",
  "/home/commercial/inventory-create",
  "/home/commercial/inventory-item/item-1",
  "/alerts",
  "/tasks",
  "/storefront",
  "/campaigns",
  "/orders",
  "/logs"
];

describe("route access policy", () => {
  it("blocks Facility mode from commercial-only routes", () => {
    const allCommercialCaps = Object.fromEntries(
      [
        CAPABILITY_KEYS.COMMERCIAL_HOME,
        CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW,
        CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE,
        CAPABILITY_KEYS.COMMERCIAL_FEED_VIEW,
        CAPABILITY_KEYS.COMMERCIAL_ALERTS_VIEW,
        CAPABILITY_KEYS.COMMERCIAL_TASKS_VIEW,
        CAPABILITY_KEYS.STORE_FRONT_VIEW
      ].map((capability) => [capability, true])
    );

    for (const route of COMMERCIAL_ONLY_ROUTES) {
      expect(getRoutePolicy(route)).not.toBeNull();
      expect(canAccessRoute(route, facility(allCommercialCaps))).toBe(false);
    }
  });

  it("allows Facility mode into the education feed", () => {
    expect(
      canAccessRoute("/feed", facility({ [CAPABILITY_KEYS.COMMERCIAL_FEED_VIEW]: true }))
    ).toBe(true);
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
