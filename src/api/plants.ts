import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import routes from "./routes.js";
import { persistImageUri } from "@/utils/photoUploads";

export type Plant = {
  id: string;
  name?: string;
  createdAt?: string;
  // Keep fields optional during migration; tighten later from backend schema
};

function normalizePlantList(res: any) {
  if (Array.isArray(res)) return res;
  return (
    res?.plants ?? res?.items ?? res?.data?.plants ?? res?.data?.items ?? res?.data ?? []
  );
}

function normalizePlantEntity(res: any) {
  return res?.created ?? res?.updated ?? res?.plant ?? res;
}

function asLegacyTokenOptions(token?: string) {
  return { auth: token ? true : false };
}

// CONTRACT: facility-scoped resources must use endpoints.ts (no hardcoded paths)
// and must return canonical envelopes.

export async function getPlants(facilityIdOrToken?: string): Promise<Plant[]> {
  if (facilityIdOrToken) {
    const listRes = await apiRequest(endpoints.plants(facilityIdOrToken), {
      method: "GET"
    });
    return normalizePlantList(listRes);
  }
  const listRes = await apiRequest(routes.PLANTS.LIST);
  return normalizePlantList(listRes);
}

export async function createPlant(a: string | any, b?: any): Promise<Plant> {
  if (typeof a === "string" && b !== undefined) {
    const createRes = await apiRequest(endpoints.plants(a), {
      method: "POST",
      body: b
    });
    return normalizePlantEntity(createRes);
  }
  const createRes = await apiRequest(routes.PLANTS.CREATE, {
    method: "POST",
    body: a
  });
  return normalizePlantEntity(createRes);
}

export async function updatePlant(a: string, b: string | any, c?: any): Promise<Plant> {
  if (typeof b === "string" && c !== undefined) {
    const updateRes = await apiRequest(endpoints.plant(a, b), {
      method: "PATCH",
      body: c
    });
    return normalizePlantEntity(updateRes);
  }
  const updateRes = await apiRequest(routes.PLANTS.DETAIL(a), {
    method: "PUT",
    ...asLegacyTokenOptions(c),
    body: b
  });
  return normalizePlantEntity(updateRes);
}

export async function deletePlant(a: string, b?: string) {
  if (typeof b === "string") {
    const deleteRes = await apiRequest(endpoints.plant(a, b), { method: "DELETE" });
    return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
  }
  const deleteRes = await apiRequest(routes.PLANTS.DETAIL(a), {
    method: "DELETE",
    ...asLegacyTokenOptions(b)
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}

export async function uploadPlantPhoto(file: any) {
  const uri = file && typeof file === "object" && file.uri ? file.uri : file;
  const url = await persistImageUri(uri);
  return { url };
}

export async function getPlantWithLogs(plantId: string, token?: string) {
  const [plant, logs] = await Promise.all([
    apiRequest(routes.PLANTS.DETAIL(plantId), asLegacyTokenOptions(token)),
    apiRequest(routes.PLANTS.LOGS(plantId), asLegacyTokenOptions(token))
  ]);
  return {
    plant: plant?.plant ?? plant,
    logs: logs?.logs ?? logs?.data ?? logs ?? []
  };
}

export async function exportPlantPdf(plantId: string, token?: string) {
  return apiRequest(routes.PLANTS.EXPORT_PDF(plantId), {
    method: "GET",
    ...asLegacyTokenOptions(token)
  });
}

// ===== Personal Mode Plants (User/Grow-Scoped) =====

export type PersonalPlant = Plant & {
  growId: string;
  strain?: string;
  cultivar?: string;
  cropCommonName?: string;
  scientificName?: string;
  cropProfileId?: string | null;
  growthProfile?: {
    id?: string;
    cropProfile?: string | null;
    confirmationStatus?: string;
    sizeMetrics?: Record<string, unknown>;
    timingAdjustments?: Record<string, unknown>;
    waterUseProfile?: Record<string, unknown>;
    phenoLabel?: string;
    stressSensitivities?: string[];
    pestDiseaseSensitivities?: string[];
  } | null;
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
  cropCommonName?: string;
  scientificName?: string;
  cropProfileId?: string;
  confirmationStatus?:
    | "user_confirmed"
    | "ai_suggested"
    | "needs_confirmation"
    | "unknown";
  sizeMetrics?: Record<string, unknown>;
  timingAdjustments?: Record<string, unknown>;
  waterUseProfile?: Record<string, unknown>;
  phenoLabel?: string;
  stressSensitivities?: string[];
  pestDiseaseSensitivities?: string[];
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
