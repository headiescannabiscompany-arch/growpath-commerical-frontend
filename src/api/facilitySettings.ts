import { api } from "./client";
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
  const res = await api.get(`${endpoints.facilities}/${facilityId}`);
  return res?.facility ?? res?.data ?? res;
}

export async function updateFacilityDetail(
  facilityId: string,
  payload: any
): Promise<FacilitySettings> {
  const res = await api.patch(`${endpoints.facilities}/${facilityId}`, payload);
  return res?.updated ?? res?.facility ?? res;
}
