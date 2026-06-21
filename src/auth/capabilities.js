import { buildCan } from "../entitlements/can";

// Compatibility adapter. Capability grants must come from /api/auth/me.
export function buildCaps(context = {}) {
  const capabilities = context?.capabilities || {};
  return {
    mode: context?.mode || "personal",
    facilityRole: context?.facilityRole || null,
    capabilities,
    can: buildCan(capabilities)
  };
}
