import { api } from "./client";
import { endpoints } from "./endpoints";

export async function getFacilityBillingStatus(facilityId: string) {
  const url = `${endpoints.facilityBillingStatus}?facility=${encodeURIComponent(
    facilityId
  )}`;
  const res = await api.get(url);
  return res?.data ?? res;
}

export async function startFacilityCheckout(facilityId: string) {
  const res = await api.post(endpoints.facilityBillingCheckout, { facilityId });
  return res?.data ?? res;
}

export async function cancelFacilityPlan(facilityId: string) {
  const res = await api.post(endpoints.facilityBillingCancel, { facilityId });
  return res?.data ?? res;
}
