import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export async function getFacilityBillingStatus(facilityId: string) {
  const res = await apiRequest(endpoints.facilityBillingStatus, {
    params: { facility: facilityId }
  });
  return res?.data ?? res;
}

export async function startFacilityCheckout(facilityId: string) {
  const res = await apiRequest(endpoints.facilityBillingCheckout, {
    method: "POST",
    body: { facilityId }
  });
  return res?.data ?? res;
}

export async function cancelFacilityPlan(facilityId: string) {
  const res = await apiRequest(endpoints.facilityBillingCancel, {
    method: "POST",
    body: { facilityId }
  });
  return res?.data ?? res;
}
