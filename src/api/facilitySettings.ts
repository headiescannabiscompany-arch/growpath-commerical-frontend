import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type FacilitySettings = {
  id?: string;
  _id?: string;
  name?: string;
  timezone?: string;
  address?: string;
  notes?: string;
  complianceMode?: "basic" | "strict";
};

export async function getFacilityDetail(facilityId: string): Promise<FacilitySettings> {
  const res = await apiRequest(`${endpoints.facilities}/${facilityId}`);
  return res?.facility ?? res?.data ?? res;
}

export async function updateFacilityDetail(
  facilityId: string,
  payload: any
): Promise<FacilitySettings> {
  const res = await apiRequest(`${endpoints.facilities}/${facilityId}`, {
    method: "PATCH",
    body: payload
  });
  return res?.updated ?? res?.facility ?? res;
}
