import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import {
  canAccessRoute,
  getHomeForUser,
  getRoutePolicy,
  requiresFacility
} from "../../src/navigation/routeAccess";

const commercial = (capabilities: Record<string, boolean>) => ({
  ready: true,
  mode: "commercial" as const,
  capabilities
});

const facility = (capabilities: Record<string, boolean>) => ({
  ready: true,
  mode: "facility" as const,
  capabilities,
  selectedFacilityId: "facility-1"
});

const personal = (capabilities: Record<string, boolean> = {}) => ({
  ready: true,
  mode: "personal" as const,
  capabilities
});

const COMMERCIAL_ONLY_ROUTES = [
  "/home/commercial",
  "/home/commercial/grows",
  "/home/commercial/grows/new",
  "/home/commercial/grows/grow-1",
  "/home/commercial/products",
  "/home/commercial/products/new",
  "/home/commercial/products/product-1",
  "/home/commercial/product-lines",
  "/home/commercial/product-lines/line-1",
  "/home/commercial/batch-planner",
  "/home/commercial/batch-planner/batch-1",
  "/home/commercial/trials",
  "/home/commercial/trials/trial-1",
  "/home/commercial/storefront",
  "/home/commercial/feed",
  "/home/commercial/community",
  "/home/commercial/courses",
  "/home/commercial/courses/course-1",
  "/home/commercial/lives",
  "/home/commercial/marketing",
  "/home/commercial/orders",
  "/home/commercial/tasks",
  "/home/commercial/analytics",
  "/home/commercial/profile",
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

  it("routes users to the correct home for their account type", () => {
    expect(getHomeForUser(personal())).toBe("/home/personal");
    expect(getHomeForUser(commercial({}))).toBe("/home/commercial");
    expect(getHomeForUser(facility({}))).toBe("/home/facility");
    expect(
      getHomeForUser({
        ready: true,
        mode: "facility",
        selectedFacilityId: null
      })
    ).toBe("/home/facility/select");
    expect(getHomeForUser(null)).toBe("/login");
  });

  it("blocks cross-account dashboards", () => {
    expect(canAccessRoute("/home/facility/dashboard", personal())).toBe(false);
    expect(canAccessRoute("/home/commercial", personal())).toBe(false);
    expect(canAccessRoute("/home/personal", commercial({}))).toBe(false);
    expect(canAccessRoute("/home/facility/dashboard", commercial({}))).toBe(false);
    expect(canAccessRoute("/home/personal", facility({}))).toBe(false);
  });

  it("requires selected facility for facility work routes", () => {
    const unselectedFacility = {
      ready: true,
      mode: "facility" as const,
      capabilities: {},
      selectedFacilityId: null
    };

    expect(requiresFacility("/home/facility/dashboard")).toBe(true);
    expect(requiresFacility("/home/facility/feed")).toBe(true);
    expect(canAccessRoute("/home/facility/select", unselectedFacility)).toBe(true);
    expect(canAccessRoute("/home/facility/dashboard", unselectedFacility)).toBe(false);
    expect(canAccessRoute("/home/facility/feed", unselectedFacility)).toBe(false);
    expect(canAccessRoute("/home/facility/dashboard", facility({}))).toBe(true);
    expect(canAccessRoute("/home/facility/feed", facility({}))).toBe(true);
  });

  it("allows every account mode to view shared campaign feed placements", () => {
    expect(canAccessRoute("/feed", personal())).toBe(true);
    expect(canAccessRoute("/feed", commercial({}))).toBe(true);
    expect(canAccessRoute("/feed", facility({}))).toBe(true);
    expect(getRoutePolicy("/feed")).toMatchObject({
      mode: ["personal", "commercial", "facility"],
      capabilities: []
    });
  });

  it("blocks direct entry when the required capability is absent", () => {
    expect(canAccessRoute("/storefront", commercial({}))).toBe(false);
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
