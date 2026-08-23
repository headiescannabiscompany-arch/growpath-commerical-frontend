import { CAPABILITY_KEYS } from "../entitlements/capabilityKeys";
import {
  BUSINESS_DESK_ROUTE_ROOTS,
  hasBusinessDeskFacilityRole,
  isBusinessDeskRouteNamespace,
  isRegisteredBusinessDeskRoute
} from "./businessDeskRoutes";

export type RouteAccessSnapshot = {
  ready: boolean;
  mode: "personal" | "commercial" | "facility";
  capabilities: Record<string, unknown>;
  selectedFacilityId?: string | null;
  facilityRole?: string | null;
};

export type RoutePolicy = {
  mode: RouteAccessSnapshot["mode"] | RouteAccessSnapshot["mode"][];
  capabilities: string[];
  requiresFacility?: boolean;
  requiresBusinessDeskFacilityRole?: boolean;
  denied?: boolean;
};

type RouteRule = RoutePolicy & {
  matches: (pathname: string) => boolean;
};

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

function hasValidSelectedFacility(value: unknown) {
  const facilityId = typeof value === "string" ? value.trim() : "";
  const hasControlCharacter = Array.from(facilityId).some((character) => {
    const codePoint = character.charCodeAt(0);
    return codePoint < 32 || codePoint === 127;
  });
  return Boolean(facilityId && facilityId.length <= 128 && !hasControlCharacter);
}

const COMMERCIAL_RULES: RouteRule[] = [
  {
    matches: startsWith("/home/commercial/horticulture"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.BUSINESS_DESK_READ]
  },
  {
    matches: (pathname) =>
      isRegisteredBusinessDeskRoute(BUSINESS_DESK_ROUTE_ROOTS.commercial, pathname),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.BUSINESS_DESK_READ]
  },
  {
    matches: (pathname) =>
      isBusinessDeskRouteNamespace(BUSINESS_DESK_ROUTE_ROOTS.commercial, pathname),
    mode: "commercial",
    capabilities: [],
    denied: true
  },
  {
    matches: startsWith("/home/commercial/inventory/new"),
    mode: "commercial",
    capabilities: [
      CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW,
      CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE
    ]
  },
  {
    matches: startsWith("/home/commercial/inventory-create"),
    mode: "commercial",
    capabilities: [
      CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW,
      CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE
    ]
  },
  {
    matches: (pathname: string) =>
      pathname.startsWith("/home/commercial/inventory/") &&
      !pathname.startsWith("/home/commercial/inventory/new"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]
  },
  {
    matches: startsWith("/home/commercial/inventory-item"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]
  },
  {
    matches: startsWith("/home/commercial/inventory"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW]
  },
  {
    matches: (pathname: string) => pathname === "/home/commercial",
    mode: "commercial",
    capabilities: []
  },
  {
    matches: startsWith("/home/commercial"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_HOME]
  },
  {
    matches: startsWith("/feed"),
    mode: ["personal", "commercial", "facility"],
    capabilities: []
  },
  {
    matches: (pathname: string) => pathname.startsWith("/storefront/"),
    mode: ["personal", "commercial", "facility"],
    capabilities: []
  },
  {
    matches: startsWith("/alerts"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_ALERTS_VIEW]
  },
  {
    matches: startsWith("/tasks"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_TASKS_VIEW]
  },
  {
    matches: (pathname: string) => pathname === "/storefront",
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.STORE_FRONT_VIEW]
  },
  ...["/campaigns", "/orders", "/logs"].map((prefix) => ({
    matches: startsWith(prefix),
    mode: "commercial" as const,
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_HOME]
  }))
];

const PERSONAL_RULES: RouteRule[] = [
  {
    matches: startsWith("/home/personal"),
    mode: "personal",
    capabilities: []
  }
];

const FACILITY_RULES: RouteRule[] = [
  {
    matches: startsWith("/home/facility/horticulture"),
    mode: "facility",
    capabilities: [CAPABILITY_KEYS.BUSINESS_DESK_READ],
    requiresFacility: true,
    requiresBusinessDeskFacilityRole: true
  },
  {
    matches: (pathname) =>
      isRegisteredBusinessDeskRoute(BUSINESS_DESK_ROUTE_ROOTS.facility, pathname),
    mode: "facility",
    capabilities: [CAPABILITY_KEYS.BUSINESS_DESK_READ],
    requiresFacility: true,
    requiresBusinessDeskFacilityRole: true
  },
  {
    matches: (pathname) =>
      isBusinessDeskRouteNamespace(BUSINESS_DESK_ROUTE_ROOTS.facility, pathname),
    mode: "facility",
    capabilities: [],
    requiresFacility: true,
    denied: true
  },
  {
    matches: startsWith("/home/facility/select"),
    mode: "facility",
    capabilities: []
  },
  {
    matches: startsWith("/home/facility"),
    mode: "facility",
    capabilities: [],
    requiresFacility: true
  }
];

export function getHomeForUser(
  snapshot: Pick<RouteAccessSnapshot, "ready" | "mode" | "selectedFacilityId"> | null
) {
  if (!snapshot || !snapshot.ready) return "/login";
  if (snapshot.mode === "commercial") return "/home/commercial";
  if (snapshot.mode === "facility") {
    return hasValidSelectedFacility(snapshot.selectedFacilityId)
      ? "/home/facility"
      : "/home/facility/select";
  }
  return "/home/personal";
}

export function getRoutePolicy(pathname: string): RoutePolicy | null {
  const normalized = pathname || "/";
  const rule = [...FACILITY_RULES, ...PERSONAL_RULES, ...COMMERCIAL_RULES].find(
    (candidate) => candidate.matches(normalized)
  );
  if (!rule) return null;
  return {
    mode: rule.mode,
    capabilities: rule.capabilities,
    requiresFacility: rule.requiresFacility,
    requiresBusinessDeskFacilityRole: rule.requiresBusinessDeskFacilityRole,
    denied: rule.denied
  };
}

export function requiresFacility(pathname: string): boolean {
  return getRoutePolicy(pathname)?.requiresFacility === true;
}

export function canAccessRoute(pathname: string, snapshot: RouteAccessSnapshot): boolean {
  const policy = getRoutePolicy(pathname);
  if (!policy) return true;
  if (policy.denied) return false;
  const modes = Array.isArray(policy.mode) ? policy.mode : [policy.mode];
  if (!snapshot.ready || !modes.includes(snapshot.mode)) return false;
  if (policy.requiresFacility && !hasValidSelectedFacility(snapshot.selectedFacilityId)) {
    return false;
  }
  if (
    policy.requiresBusinessDeskFacilityRole &&
    !hasBusinessDeskFacilityRole(snapshot.facilityRole)
  ) {
    return false;
  }

  // Commercial mode pages should remain browsable as preview/walkthrough shells
  // before checkout is complete. Direct standalone routes and write-entry routes
  // still require their normal capabilities.
  const commercialPreview =
    snapshot.mode === "commercial" &&
    pathname.startsWith("/home/commercial") &&
    !pathname.startsWith("/home/commercial/business-desk") &&
    !pathname.startsWith("/home/commercial/horticulture") &&
    !pathname.startsWith("/home/commercial/inventory/new") &&
    !pathname.startsWith("/home/commercial/inventory-create");
  if (commercialPreview) return true;

  return policy.capabilities.every(
    (capability) => snapshot.capabilities?.[capability] === true
  );
}
