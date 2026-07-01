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

export interface PersonalGrowTimelineEvent {
  id: string;
  userId?: string;
  growId?: string | null;
  plantId?: string | null;
  type: string;
  sourceModel: string;
  sourceId: string;
  title: string;
  summary?: string;
  timestamp: string;
  tags?: string[];
  severity?: string | number | null;
  payload?: Record<string, any>;
}

// Removed unused PersonalGrowsResponse interface

/**
 * Fetch all grows for the authenticated personal mode user.
 * Personal mode is user-scoped; no facilityId parameter.
 */
export async function listPersonalGrows(): Promise<PersonalGrow[]> {
  try {
    const personalRes = await apiRequest("/api/personal/grows");
    if (Array.isArray(personalRes)) return personalRes as PersonalGrow[];
    if (personalRes && typeof personalRes === "object") {
      const topLevel = (personalRes as any).grows;
      if (Array.isArray(topLevel)) return topLevel as PersonalGrow[];
      const nested = (personalRes as any).data?.grows;
      if (Array.isArray(nested)) return nested as PersonalGrow[];
    }
    return [];
  } catch (_err) {
    return [];
  }
}

export async function getPersonalGrowTimeline(
  growId: string
): Promise<PersonalGrowTimelineEvent[]> {
  if (!growId) return [];
  try {
    const res = await apiRequest(
      `/api/personal/grows/${encodeURIComponent(growId)}/timeline`
    );
    const rows = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.timeline)
        ? (res as any).timeline
        : Array.isArray((res as any)?.events)
          ? (res as any).events
          : Array.isArray((res as any)?.items)
            ? (res as any).items
            : Array.isArray((res as any)?.data?.timeline)
              ? (res as any).data.timeline
              : [];
    return rows.filter((row: any) => row && typeof row === "object");
  } catch (err) {
    console.error("[getPersonalGrowTimeline] Error:", err);
    return [];
  }
}
