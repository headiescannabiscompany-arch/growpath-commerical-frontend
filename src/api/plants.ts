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
  const listRes = await apiRequest(endpoints.plants(facilityId));
  // Contract: { plants: [...] }
  return listRes?.plants ?? [];
}

export async function createPlant(facilityId: string, data: any): Promise<Plant> {
  const createRes = await apiRequest(endpoints.plants(facilityId), {
    method: "POST",
    body: data
  });
  // Contract options: { created } preferred; tolerate { plant } / raw
  return createRes?.created ?? createRes?.plant ?? createRes;
}

export async function updatePlant(
  facilityId: string,
  id: string,
  patch: any
): Promise<Plant> {
  const updateRes = await apiRequest(endpoints.plant(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return updateRes?.updated ?? updateRes?.plant ?? updateRes;
}

export async function deletePlant(facilityId: string, id: string) {
  const deleteRes = await apiRequest(endpoints.plant(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}
