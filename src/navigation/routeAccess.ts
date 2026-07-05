import { CAPABILITY_KEYS } from "../entitlements/capabilityKeys";

export type RouteAccessSnapshot = {
  ready: boolean;
  mode: "personal" | "commercial" | "facility";
  capabilities: Record<string, unknown>;
  selectedFacilityId?: string | null;
};

export type RoutePolicy = {
  mode: RouteAccessSnapshot["mode"] | RouteAccessSnapshot["mode"][];
  capabilities: string[];
  requiresFacility?: boolean;
};

type RouteRule = RoutePolicy & {
  matches: (pathname: string) => boolean;
};

const startsWith = (prefix: string) => (pathname: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

const COMMERCIAL_RULES: RouteRule[] = [
  {
    matches: startsWith("/home/commercial/inventory-create"),
    mode: "commercial",
    capabilities: [
      CAPABILITY_KEYS.COMMERCIAL_INVENTORY_VIEW,
      CAPABILITY_KEYS.COMMERCIAL_INVENTORY_WRITE
    ]
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
    mode: ["commercial", "facility"],
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_FEED_VIEW]
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
    matches: startsWith("/storefront"),
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
    return snapshot.selectedFacilityId
      ? "/home/facility/dashboard"
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
    requiresFacility: rule.requiresFacility
  };
}

export function requiresFacility(pathname: string): boolean {
  return getRoutePolicy(pathname)?.requiresFacility === true;
}

export function canAccessRoute(pathname: string, snapshot: RouteAccessSnapshot): boolean {
  const policy = getRoutePolicy(pathname);
  if (!policy) return true;
  const modes = Array.isArray(policy.mode) ? policy.mode : [policy.mode];
  if (!snapshot.ready || !modes.includes(snapshot.mode)) return false;
  if (policy.requiresFacility && !snapshot.selectedFacilityId) return false;
  return policy.capabilities.every(
    (capability) => snapshot.capabilities?.[capability] === true
  );
}
