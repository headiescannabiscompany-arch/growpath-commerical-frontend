import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function getFacilityBillingStatus(facilityId: string) {
  const statusRes = await apiRequest(endpoints.facilityBillingStatus, {
    params: { facility: facilityId }
  });
  return statusRes?.data ?? statusRes;
}

export async function startFacilityCheckout(facilityId: string) {
  const checkoutRes = await apiRequest(endpoints.facilityBillingCheckout, {
    method: "POST",
    body: { facilityId }
  });
  return checkoutRes?.data ?? checkoutRes;
}

export async function cancelFacilityPlan(facilityId: string) {
  const cancelRes = await apiRequest(endpoints.facilityBillingCancel, {
    method: "POST",
    body: { facilityId }
  });
  return cancelRes?.data ?? cancelRes;
}
