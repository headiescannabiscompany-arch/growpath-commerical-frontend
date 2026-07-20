// CONTRACT: All facility-scoped resources must use endpoints.ts (no hardcoded paths)
// and must return canonical envelopes.
import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import routes from "./routes.js";

export type Grow = {
  id: string;
  name?: string;
  createdAt?: string;
  photo?: string;
  photoUrl?: string;
  photos?: string[];
  // Add fields as your backend defines them (keep optional to avoid UI breakage during migration)
};

function normalizeGrowList(res: any) {
  const raw = Array.isArray(res)
    ? res
    : (res?.grows ??
      res?.items ??
      res?.data?.grows ??
      res?.data?.items ??
      res?.data ??
      []);
  return Array.isArray(raw)
    ? raw.map((grow) => {
        if (!grow || typeof grow !== "object") return grow;
        if (grow.id && !grow._id) return { ...grow, _id: grow.id };
        if (grow._id && !grow.id) return { ...grow, id: grow._id };
        return grow;
      })
    : [];
}

function normalizeGrowEntity(res: any) {
  const grow = res?.created ?? res?.updated ?? res?.grow ?? res;
  if (!grow || typeof grow !== "object") return grow;
  if (grow.id && !grow._id) return { ...grow, _id: grow.id };
  if (grow._id && !grow.id) return { ...grow, id: grow._id };
  return grow;
}

export async function listGrows(
  filtersOrFacilityId: string | Record<string, any> = {}
): Promise<Grow[]> {
  if (typeof filtersOrFacilityId === "string" && filtersOrFacilityId) {
    const listRes = await apiRequest(endpoints.grows(filtersOrFacilityId), {
      method: "GET"
    });
    return normalizeGrowList(listRes);
  }
  const listRes = await apiRequest(routes.GROWS.LIST, {
    params:
      typeof filtersOrFacilityId === "object" && filtersOrFacilityId
        ? filtersOrFacilityId
        : {}
  });
  return normalizeGrowList(listRes);
}

export async function createGrow(
  a: string | Record<string, any>,
  b?: any
): Promise<Grow> {
  if (typeof a === "string" && b !== undefined) {
    const createRes = await apiRequest(endpoints.grows(a), {
      method: "POST",
      body: b
    });
    return normalizeGrowEntity(createRes);
  }
  const createRes = await apiRequest(routes.GROWS.CREATE, {
    method: "POST",
    body: a
  });
  return normalizeGrowEntity(createRes);
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
  return normalizeGrowEntity(updateRes);
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
  notes?: string;
  cultivar?: string;
  cropCommonName?: string;
  scientificName?: string;
  growTags?: string[];
  growInterests?: Record<string, string[]>;
  cropTypes?: string[];
  environmentTypes?: string[];
  growingMethods?: string[];
  planning?: {
    startType?: string;
    plantCount?: number;
    vegLengthWeeks?: number;
    expectedFlowerDays?: number;
    createStarterCalendar?: boolean;
  };
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

export async function appendGrowPhotos(
  growId: string,
  photos: string[]
): Promise<PersonalGrow | null> {
  const id = String(growId || "").trim();
  const photoUrls = (Array.isArray(photos) ? photos : [])
    .map((photo) => String(photo || "").trim())
    .filter(Boolean);
  if (!id || !photoUrls.length) return null;

  const res = await apiRequest(`/api/personal/grows/${encodeURIComponent(id)}/photos`, {
    method: "PATCH",
    body: { photos: photoUrls }
  });
  return (res as any)?.grow ?? (res as any)?.data?.grow ?? (res as any) ?? null;
}

export async function savePersonalGrowCropIdentity(
  growId: string,
  identity: {
    cropCommonName: string;
    scientificName?: string;
    commonNames?: string[] | string;
    cultivar?: string;
    cropProfileId?: string | null;
    confidence?: string;
    sourceToolRunId?: string | null;
    userConfirmed: true;
  }
): Promise<PersonalGrow> {
  const response: any = await apiRequest(
    `/api/personal/grows/${encodeURIComponent(growId)}/crop-identity`,
    { method: "PATCH", body: identity }
  );
  return (response?.grow ?? response?.data?.grow ?? response) as PersonalGrow;
}

export function addEntry(growId: string, data: Record<string, any> = {}) {
  return apiRequest(routes.GROWS.ENTRIES(growId), {
    method: "POST",
    body: data
  });
}

export function uploadEntryPhoto(growId: string, file: any) {
  const form = new FormData();
  form.append("photo", file);
  return apiRequest(routes.GROWS.ENTRY_PHOTO(growId), { method: "POST", body: form });
}

export function addPlantToGrow(growId: string, plant: Record<string, any>) {
  return apiRequest(routes.GROWS.ADD_PLANT(growId), {
    method: "POST",
    body: plant
  });
}
