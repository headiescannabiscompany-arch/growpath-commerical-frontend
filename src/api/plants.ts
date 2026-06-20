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

// ===== Personal Mode Plants (User/Grow-Scoped) =====

export type PersonalPlant = Plant & {
  growId: string;
  strain?: string;
  cultivar?: string;
  stage?: string;
  medium?: string;
  status?: string;
  updatedAt?: string;
};

function normalizePersonalPlants(response: any): PersonalPlant[] {
  const rows = Array.isArray(response)
    ? response
    : (response?.plants ??
      response?.items ??
      response?.data?.plants ??
      response?.data?.items);
  return Array.isArray(rows) ? (rows as PersonalPlant[]) : [];
}

export async function listPersonalPlants(options?: {
  growId?: string;
}): Promise<PersonalPlant[]> {
  try {
    const response = await apiRequest("/api/personal/plants", {
      method: "GET",
      params: options?.growId ? { growId: options.growId } : undefined
    });
    return normalizePersonalPlants(response);
  } catch (_error) {
    return [];
  }
}

export async function createPersonalPlant(data: {
  growId: string;
  name: string;
  cultivar?: string;
  strain?: string;
  stage?: string;
  medium?: string;
  notes?: string;
}): Promise<PersonalPlant | null> {
  try {
    const response: any = await apiRequest("/api/personal/plants", {
      method: "POST",
      body: data
    });
    return (response?.created ??
      response?.plant ??
      response?.data?.plant ??
      response) as PersonalPlant;
  } catch (_error) {
    return null;
  }
}
