import { buildCan } from "../entitlements/can";

/** Compatibility adapter for callers that have a server entitlement context. */
export function getEntitlements(source = {}) {
  const capabilities = source?.ctx?.capabilities || source?.capabilities || {};
  const can = buildCan(capabilities);
  return {
    capabilities,
    can,
    isEntitled: Object.values(capabilities).some(Boolean)
  };
}
