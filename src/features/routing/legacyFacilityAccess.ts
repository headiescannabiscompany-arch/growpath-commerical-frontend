export type LegacyFacilityAccessInput = {
  mode: "personal" | "commercial" | "facility" | string | null | undefined;
  routeFacilityId: string | string[] | null | undefined;
  selectedFacilityId?: string | null;
  entitledFacilityId?: string | null;
};

export type LegacyFacilityAccessDecision =
  | { allowed: true; facilityId: string }
  | { allowed: false; redirect: string; reason: "wrong_mode" | "missing_facility" | "facility_mismatch" };

function firstParam(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeId(value: string | null | undefined) {
  return String(value || "").trim();
}

export function decideLegacyFacilityAccess({
  mode,
  routeFacilityId,
  selectedFacilityId,
  entitledFacilityId
}: LegacyFacilityAccessInput): LegacyFacilityAccessDecision {
  if (mode !== "facility") {
    return {
      allowed: false,
      redirect: mode === "commercial" ? "/home/commercial" : "/home/personal",
      reason: "wrong_mode"
    };
  }

  const routeId = normalizeId(firstParam(routeFacilityId));
  if (!routeId) {
    return {
      allowed: false,
      redirect: "/home/facility/select",
      reason: "missing_facility"
    };
  }

  const allowedIds = new Set(
    [selectedFacilityId, entitledFacilityId].map(normalizeId).filter(Boolean)
  );

  if (allowedIds.size > 0 && !allowedIds.has(routeId)) {
    return {
      allowed: false,
      redirect: "/home/facility/select",
      reason: "facility_mismatch"
    };
  }

  return { allowed: true, facilityId: routeId };
}
