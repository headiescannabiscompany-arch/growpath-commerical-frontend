import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export const FACILITY_CANCELLATION_CONFIRMATION = "CANCEL FACILITY RENEWAL";

export async function getFacilityBillingStatus(facilityId: string) {
  const statusRes = await apiRequest(endpoints.facilityBillingStatus, {
    params: { facility: facilityId }
  });
  return statusRes?.data ?? statusRes;
}

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

export async function startFacilityCheckout(
  facilityId: string,
  interval: "monthly" | "yearly" = "monthly"
) {
  const origin = currentOrigin();
  const checkoutRes = await apiRequest(endpoints.facilityBillingCheckout, {
    method: "POST",
    body: {
      facilityId,
      interval,
      ...(origin
        ? {
            successUrl: `${origin}/home/facility?facilityPlan=success`,
            cancelUrl: `${origin}/home/facility?facilityPlan=cancel`
          }
        : {})
    }
  });
  return checkoutRes?.data ?? checkoutRes;
}

function trustedStripeBillingPortalUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Stripe did not return a Facility billing management link.");
  }
  try {
    const url = new URL(value);
    if (url.origin !== "https://billing.stripe.com" || url.username || url.password) {
      throw new Error("untrusted");
    }
  } catch {
    throw new Error("Stripe returned an invalid Facility billing management link.");
  }
  return value;
}

export async function openFacilityBillingPortal(facilityId: string) {
  const portalRes = await apiRequest(endpoints.facilityBillingPortal, {
    method: "POST",
    body: { facilityId }
  });
  const payload = portalRes?.data ?? portalRes;
  return { url: trustedStripeBillingPortalUrl(payload?.url) };
}

export async function cancelFacilityPlan(facilityId: string, confirmation: string) {
  if (confirmation !== FACILITY_CANCELLATION_CONFIRMATION) {
    throw new Error("Confirm Facility cancellation before changing Stripe renewal.");
  }
  const cancelRes = await apiRequest(endpoints.facilityBillingCancel, {
    method: "POST",
    body: { facilityId, confirmation }
  });
  return cancelRes?.data ?? cancelRes;
}
