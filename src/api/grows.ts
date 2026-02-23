// CONTRACT: All facility-scoped resources must use endpoints.ts (no hardcoded paths)
// and must return canonical envelopes.
import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Grow = {
  id: string;
  name?: string;
  createdAt?: string;
  // Add fields as your backend defines them (keep optional to avoid UI breakage during migration)
};

export async function listGrows(facilityId: string): Promise<Grow[]> {
  const listRes = await apiRequest(endpoints.grows(facilityId));
  // Contract: { grows: [...] }
  return listRes?.grows ?? [];
}

export async function createGrow(facilityId: string, data: any): Promise<Grow> {
  const createRes = await apiRequest(endpoints.grows(facilityId), {
    method: "POST",
    body: data
  });
  // Contract options: { created: grow } (preferred) or { grow } or raw object
  return createRes?.created ?? createRes?.grow ?? createRes;
}

export async function updateGrow(
  facilityId: string,
  id: string,
  patch: any
): Promise<Grow> {
  const updateRes = await apiRequest(endpoints.grow(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return updateRes?.updated ?? updateRes?.grow ?? updateRes;
}

export async function deleteGrow(facilityId: string, id: string) {
  const deleteRes = await apiRequest(endpoints.grow(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}

// ===== Personal Mode Grows (User-Scoped) =====

export interface PersonalGrow extends Grow {
  startDate: string;
  strain: string;
  location: string;
  status: "vegetating" | "flowering" | "curing" | "harvested";
  updatedAt: string;
}

// Removed unused PersonalGrowsResponse interface

/**
 * Fetch all grows for the authenticated personal mode user.
 * Personal mode is user-scoped; no facilityId parameter.
 */
export async function listPersonalGrows(): Promise<PersonalGrow[]> {
  try {
    const personalRes = await apiRequest("/api/personal/grows");
    if (
      typeof personalRes === "object" &&
      personalRes !== null &&
      "data" in personalRes &&
      personalRes.data &&
      "grows" in personalRes.data
    ) {
      return personalRes.data.grows as PersonalGrow[];
    }
    return [];
  } catch (err) {
    console.error("[listPersonalGrows] Error:", err);
    return [];
  }
}
