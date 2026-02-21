import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Plant = {
  id: string;
  name?: string;
  createdAt?: string;
  // Keep fields optional during migration; tighten later from backend schema
};

// CONTRACT: facility-scoped resources must use endpoints.ts (no hardcoded paths)
// and must return canonical envelopes.

export async function getPlants(facilityId: string): Promise<Plant[]> {
  const res = await apiRequest(endpoints.plants(facilityId));
  // Contract: { plants: [...] }
  return res?.plants ?? [];
}

export async function createPlant(facilityId: string, data: any): Promise<Plant> {
  const res = await apiRequest(endpoints.plants(facilityId), {
    method: "POST",
    body: data
  });
  // Contract options: { created } preferred; tolerate { plant } / raw
  return res?.created ?? res?.plant ?? res;
}

export async function updatePlant(
  facilityId: string,
  id: string,
  patch: any
): Promise<Plant> {
  const res = await apiRequest(endpoints.plant(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return res?.updated ?? res?.plant ?? res;
}

export async function deletePlant(facilityId: string, id: string) {
  const res = await apiRequest(endpoints.plant(facilityId, id), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
