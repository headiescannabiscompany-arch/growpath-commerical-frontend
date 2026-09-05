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
