import { CAPABILITY_KEYS } from "../entitlements/capabilityKeys";

export type RouteAccessSnapshot = {
  ready: boolean;
  mode: "personal" | "commercial" | "facility";
  capabilities: Record<string, unknown>;
};

export type RoutePolicy = {
  mode: RouteAccessSnapshot["mode"];
  capabilities: string[];
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
    matches: startsWith("/home/commercial"),
    mode: "commercial",
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_HOME]
  },
  {
    matches: startsWith("/feed"),
    mode: "commercial",
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
  ...["/campaigns", "/offers", "/orders", "/logs"].map((prefix) => ({
    matches: startsWith(prefix),
    mode: "commercial" as const,
    capabilities: [CAPABILITY_KEYS.COMMERCIAL_HOME]
  }))
];

export function getRoutePolicy(pathname: string): RoutePolicy | null {
  const normalized = pathname || "/";
  const rule = COMMERCIAL_RULES.find((candidate) => candidate.matches(normalized));
  if (!rule) return null;
  return { mode: rule.mode, capabilities: rule.capabilities };
}

export function canAccessRoute(pathname: string, snapshot: RouteAccessSnapshot): boolean {
  const policy = getRoutePolicy(pathname);
  if (!policy) return true;
  if (!snapshot.ready || snapshot.mode !== policy.mode) return false;
  return policy.capabilities.every(
    (capability) => snapshot.capabilities?.[capability] === true
  );
}
