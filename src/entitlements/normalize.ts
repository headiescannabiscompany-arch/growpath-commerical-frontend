import { CAPABILITY_ALIASES, ROLE_ALIASES } from "./capabilityAliases";

export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER";

export function normalizeFacilityRole(role?: string | null): FacilityRole | null {
  if (!role) return null;
  const raw = String(role).trim().toUpperCase();
  if (ROLE_ALIASES[raw]) return ROLE_ALIASES[raw];
  if (raw === "OWNER" || raw === "MANAGER" || raw === "STAFF" || raw === "VIEWER") {
    return raw as FacilityRole;
  }
  return null;
}

export function normalizeCapabilityKey(key?: string | null): string | null {
  if (!key) return null;
  const raw = String(key).trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (CAPABILITY_ALIASES[upper]) return CAPABILITY_ALIASES[upper];

  const normalized = upper
    .replace(/[.\s-]+/g, "_")
    .replace(/__+/g, "_");

  return CAPABILITY_ALIASES[normalized] || normalized;
}
