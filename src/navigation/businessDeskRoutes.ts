export const BUSINESS_DESK_ROUTE_ROOTS = Object.freeze({
  commercial: "/home/commercial/business-desk",
  facility: "/home/facility/business-desk"
} as const);

export const BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES = Object.freeze([
  "price-margin",
  "quotes",
  "leads",
  "jobs",
  "expenses",
  "vendors",
  "cash-flow"
] as const);

export type BusinessDeskDeterministicRouteSuffix =
  (typeof BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES)[number];

export function hasBusinessDeskFacilityRole(value: unknown) {
  const role = String(value || "")
    .trim()
    .toUpperCase();
  return role === "OWNER" || role === "MANAGER";
}

function withoutTrailingSlash(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

export function isRegisteredBusinessDeskRoute(
  root: (typeof BUSINESS_DESK_ROUTE_ROOTS)[keyof typeof BUSINESS_DESK_ROUTE_ROOTS],
  pathname: string
) {
  const normalized = withoutTrailingSlash(pathname || "/");
  if (normalized === root) return true;
  return BUSINESS_DESK_DETERMINISTIC_ROUTE_SUFFIXES.some(
    (suffix) => normalized === `${root}/${suffix}`
  );
}

export function isBusinessDeskRouteNamespace(
  root: (typeof BUSINESS_DESK_ROUTE_ROOTS)[keyof typeof BUSINESS_DESK_ROUTE_ROOTS],
  pathname: string
) {
  const normalized = withoutTrailingSlash(pathname || "/");
  return normalized === root || normalized.startsWith(`${root}/`);
}
