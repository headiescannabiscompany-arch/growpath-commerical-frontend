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
  const detailRes = await apiRequest(`${endpoints.facilities}/${facilityId}`);
  return detailRes?.facility ?? detailRes?.data ?? detailRes;
}

export async function updateFacilityDetail(
  facilityId: string,
  payload: any
): Promise<FacilitySettings> {
  const updateRes = await apiRequest(`${endpoints.facilities}/${facilityId}`, {
    method: "PATCH",
    body: payload
  });
  return updateRes?.updated ?? updateRes?.facility ?? updateRes;
}
