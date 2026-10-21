// Owner-directed pause, October 21, 2026. Reopening requires a reviewed release
// and the existing eligibility checks, not a URL, account preference or env flag.
// Retain saved records and ordinary horticulture/course access separately.
export function isDispensaryDiscoveryAvailable(): boolean {
  return false;
}

export const DISPENSARY_DISCOVERY_UNAVAILABLE =
  "Dispensary discovery is unavailable. Browse other stores or open Courses for learning content.";

export function dispensaryDiscoveryUnavailableError() {
  return Object.assign(new Error(DISPENSARY_DISCOVERY_UNAVAILABLE), {
    code: "DISPENSARY_DISCOVERY_UNAVAILABLE"
  });
}

export function isPublicStorefrontAvailable(storefront: unknown): boolean {
  if (isDispensaryDiscoveryAvailable()) return true;
  if (!storefront || typeof storefront !== "object") return true;
  const record = storefront as Record<string, unknown>;
  // Any explicit legacy classification must keep the pause intact, even when
  // another field still contains a stale general-store value.
  return (
    record.isDispensary !== true &&
    ![record.storefrontType, record.businessType, record.type].some(
      (value) => String(value || "").trim().toLowerCase() === "dispensary"
    )
  );
}
