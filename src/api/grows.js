import { apiRequest } from "./apiRequest";
import routes from "./routes.js";
import { endpoints } from "./endpoints";

function normalizeGrowList(res) {
  if (Array.isArray(res)) return res;
  return res?.grows ?? res?.data ?? [];
}

function normalizeGrowEntity(res) {
  return res?.created ?? res?.updated ?? res?.grow ?? res;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function listGrows(filtersOrFacilityId = {}) {
  if (typeof filtersOrFacilityId === "string" && filtersOrFacilityId) {
    const facilityRes = await apiRequest(endpoints.grows(filtersOrFacilityId), { method: "GET" });
    return normalizeGrowList(facilityRes);
  }
  const listRes = await apiRequest(routes.GROWS.LIST, { params: filtersOrFacilityId || {} });
  return normalizeGrowList(listRes);
}

export async function createGrow(a, b) {
  if (typeof a === "string" && b !== undefined) {
    const facilityCreateRes = await apiRequest(endpoints.grows(a), {
      method: "POST",
      body: b
    });
    return normalizeGrowEntity(facilityCreateRes);
  }

  const createRes = await apiRequest(routes.GROWS.CREATE, {
    method: "POST",
    body: a
  });
  return normalizeGrowEntity(createRes);
}

export async function updateGrow(facilityId, id, patch) {
  const updateRes = await apiRequest(endpoints.grow(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return normalizeGrowEntity(updateRes);
}

export async function deleteGrow(facilityId, id) {
  const deleteRes = await apiRequest(endpoints.grow(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}

export async function listPersonalGrows() {
  try {
    const personalRes = await apiRequest("/api/personal/grows");
    if (isPlainObject(personalRes) && isPlainObject(personalRes.data)) {
      return personalRes.data.grows ?? [];
    }
    return [];
  } catch (_err) {
    return [];
  }
}

export function addEntry(growId, data = {}) {
  return apiRequest(routes.GROWS.ENTRIES(growId), {
    method: "POST",
    body: data
  });
}

export function uploadEntryPhoto(growId, file) {
  const form = new FormData();
  form.append("photo", file);

  return apiRequest(routes.GROWS.ENTRY_PHOTO(growId), { method: "POST", body: form });
}

export function addPlantToGrow(growId, plant) {
  return apiRequest(routes.GROWS.ADD_PLANT(growId), {
    method: "POST",
    body: plant
  });
}
