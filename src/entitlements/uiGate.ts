export type UiGate = "enabled" | "cta" | "hidden";

export function hasCap(ent: any, cap: string): boolean {
  return Array.isArray(ent?.capabilities) && ent.capabilities.includes(cap);
}

/**
 * Mirrors backend can():
 * - must have cap
 * - facility.* caps require facility context (facilityId + facilityRole)
 * - optional UI role-hints (server is still source of truth)
 */
export function uiGate(
  ent: any,
  cap: string,
  opts?: {
    behaviorMissingCap?: "cta" | "hidden";
    behaviorMissingFacilityContext?: "cta" | "hidden";
    behaviorMissingRole?: "cta" | "hidden";
    allowedFacilityRoles?: string[];
  }
): UiGate {
  const behaviorMissingCap = opts?.behaviorMissingCap ?? "cta";
  const behaviorMissingFacilityContext = opts?.behaviorMissingFacilityContext ?? "cta";
  const behaviorMissingRole = opts?.behaviorMissingRole ?? "cta";

  if (!hasCap(ent, cap)) return behaviorMissingCap;

  const isFacilityCap = String(cap).startsWith("facility.");
  if (!isFacilityCap) return "enabled";

  if (!ent?.facilityId || !ent?.facilityRole) return behaviorMissingFacilityContext;

  if (Array.isArray(opts?.allowedFacilityRoles) && opts.allowedFacilityRoles.length > 0) {
    if (!opts.allowedFacilityRoles.includes(ent.facilityRole)) return behaviorMissingRole;
  }

  return "enabled";
}
