// assertAccountMode.ts
// Deterministic runtime enforcement of account mode contract

export type AccountMode = "SINGLE_USER" | "COMMERCIAL" | "FACILITY";

export type AccountContext = {
  mode: AccountMode;
  facilityId?: string | null;
  brandId?: string | null;
};

export type ModeRequirement = {
  allowed: AccountMode[];
  requiresFacility?: boolean;
  requiresBrand?: boolean;
};

export type AssertAccountModeResult =
  | { ok: true }
  | { ok: false; redirectTo: string; reason: string };

export function assertAccountMode(
  ctx: AccountContext,
  requirement: ModeRequirement
): AssertAccountModeResult {
  // Check mode
  if (!requirement.allowed.includes(ctx.mode)) {
    // Redirect to home or upgrade depending on mode
    if (ctx.mode === "SINGLE_USER") {
      return {
        ok: false,
        redirectTo: "/upgrade",
        reason: "Feature requires Commercial or Facility mode"
      };
    }
    return {
      ok: false,
      redirectTo: "/home",
      reason: `Mode ${ctx.mode} not allowed for this route`
    };
  }

  // Facility requirement
  if (requirement.requiresFacility) {
    if (ctx.mode !== "FACILITY" || !ctx.facilityId) {
      return {
        ok: false,
        redirectTo: "/home/facility/select",
        reason: "Facility context required"
      };
    }
  }

  // Brand requirement
  if (requirement.requiresBrand) {
    if (!ctx.brandId) {
      return {
        ok: false,
        redirectTo: "/home/commercial/select",
        reason: "Brand context required"
      };
    }
  }

  // All checks passed
  return { ok: true };
}
