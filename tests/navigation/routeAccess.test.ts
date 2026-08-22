import { describe, expect, it } from "@jest/globals";
import { CAPABILITY_KEYS } from "../../src/entitlements/capabilityKeys";
import {
  BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES,
  BUSINESS_DESK_PROVIDER_ROUTE_SUFFIXES
} from "../../src/navigation/businessDeskRoutes";
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
  selectedFacilityId: "facility-1",
  facilityRole: "OWNER"
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
  "/home/commercial/evidence-runs",
  "/home/commercial/evidence-runs/new",
  "/home/commercial/evidence-runs/grow-1",
  "/home/commercial/products",
  "/home/commercial/products/new",
  "/home/commercial/products/product-1",
  "/home/commercial/product-lines",
  "/home/commercial/product-lines/line-1",
  "/home/commercial/batch-planner",
  "/home/commercial/batch-planner/batch-1",
  "/home/commercial/tools/soil-nutrient-batch",
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
  "/home/commercial/inventory/new",
  "/home/commercial/inventory/item-1",
  "/home/commercial/inventory-create",
  "/home/commercial/inventory-item/item-1",
  "/home/commercial/business-desk",
  "/home/commercial/business-desk/price-margin",
  "/home/commercial/business-desk/quotes",
  "/home/commercial/business-desk/leads",
  "/home/commercial/business-desk/jobs",
  "/home/commercial/business-desk/expenses",
  "/home/commercial/business-desk/vendors",
  "/home/commercial/business-desk/cash-flow",
  "/home/commercial/business-desk/ask-ai",
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
    expect(
      canAccessRoute("/home/facility/business-desk", {
        ...unselectedFacility,
        selectedFacilityId: "   "
      })
    ).toBe(false);
    expect(
      getHomeForUser({
        ready: true,
        mode: "facility",
        selectedFacilityId: "bad\u0000facility"
      })
    ).toBe("/home/facility/select");
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

  it("allows public storefront slug aliases while keeping the owner redirect gated", () => {
    expect(canAccessRoute("/storefront/living-soil-labs", personal())).toBe(true);
    expect(canAccessRoute("/storefront/living-soil-labs", commercial({}))).toBe(true);
    expect(canAccessRoute("/storefront/living-soil-labs", facility({}))).toBe(true);
    expect(getRoutePolicy("/storefront/living-soil-labs")).toMatchObject({
      mode: ["personal", "commercial", "facility"],
      capabilities: []
    });
    expect(canAccessRoute("/storefront", commercial({}))).toBe(false);
  });

  it("blocks direct entry when the required capability is absent", () => {
    expect(canAccessRoute("/storefront", commercial({}))).toBe(false);
    expect(canAccessRoute("/home/commercial/business-desk", commercial({}))).toBe(false);
    expect(canAccessRoute("/home/facility/business-desk", facility({}))).toBe(false);
  });

  it("allows all seven registered tools for an eligible Commercial workspace", () => {
    expect(
      canAccessRoute(
        "/storefront",
        commercial({ [CAPABILITY_KEYS.STORE_FRONT_VIEW]: true })
      )
    ).toBe(true);
    expect(
      canAccessRoute(
        "/home/commercial/business-desk/price-margin",
        commercial({ [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true })
      )
    ).toBe(true);
    for (const suffix of BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES) {
      expect(
        canAccessRoute(
          `/home/commercial/business-desk/${suffix}`,
          commercial({ [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true })
        )
      ).toBe(true);
    }
  });

  it("allows all seven registered Facility tools only to OWNER and MANAGER", () => {
    for (const role of ["OWNER", "MANAGER"]) {
      for (const suffix of BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES) {
        expect(
          canAccessRoute(`/home/facility/business-desk/${suffix}`, {
            ...facility({ [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true }),
            facilityRole: role
          })
        ).toBe(true);
      }
    }

    for (const role of ["STAFF", "VIEWER", "QA", null]) {
      expect(
        canAccessRoute("/home/facility/business-desk/price-margin", {
          ...facility({ [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true }),
          facilityRole: role
        })
      ).toBe(false);
    }
  });

  it("denies Personal mode and unregistered Desk paths even with stale capability bits", () => {
    const staleCapability = { [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true };

    expect(
      canAccessRoute(
        "/home/commercial/business-desk/price-margin",
        personal(staleCapability)
      )
    ).toBe(false);
    expect(
      canAccessRoute(
        "/home/facility/business-desk/price-margin",
        personal(staleCapability)
      )
    ).toBe(false);

    for (const path of [
      "/home/commercial/business-desk/not-a-tool",
      "/home/facility/business-desk/not-a-tool",
      "/home/commercial/business-desk/quotes/nested",
      "/home/facility/business-desk/quotes/nested"
    ]) {
      const snapshot = path.includes("/facility/")
        ? facility(staleCapability)
        : commercial(staleCapability);
      expect(getRoutePolicy(path)).toMatchObject({ denied: true });
      expect(canAccessRoute(path, snapshot)).toBe(false);
    }
  });

  it("guards registered provider routes with the same workspace and Facility role rules", () => {
    const capability = { [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true };
    for (const suffix of BUSINESS_DESK_PROVIDER_ROUTE_SUFFIXES) {
      expect(
        canAccessRoute(`/home/commercial/business-desk/${suffix}`, commercial(capability))
      ).toBe(true);
      expect(
        canAccessRoute(`/home/facility/business-desk/${suffix}`, {
          ...facility(capability),
          facilityRole: "MANAGER"
        })
      ).toBe(true);
      expect(
        canAccessRoute(`/home/facility/business-desk/${suffix}`, {
          ...facility(capability),
          facilityRole: "STAFF"
        })
      ).toBe(false);
      expect(
        canAccessRoute(`/home/commercial/business-desk/${suffix}`, personal(capability))
      ).toBe(false);
    }
  });

  it("accepts a harmless trailing slash on each registered Desk route", () => {
    expect(
      canAccessRoute(
        "/home/commercial/business-desk/quotes/",
        commercial({ [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true })
      )
    ).toBe(true);
    expect(
      canAccessRoute("/home/facility/business-desk/vendors/", {
        ...facility({ [CAPABILITY_KEYS.BUSINESS_DESK_READ]: true }),
        facilityRole: "MANAGER"
      })
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
        "/home/commercial/inventory/new",
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
    expect(
      canAccessRoute(
        "/home/commercial/inventory/new",
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
