import { apiRequest } from "./apiRequest";
import routes from "./routes.js";
import { endpoints } from "./endpoints";

function normalizePlantList(res) {
  if (Array.isArray(res)) return res;
  return res?.plants ?? res?.data ?? [];
}

function normalizePlantEntity(res) {
  return res?.created ?? res?.updated ?? res?.plant ?? res;
}

function asLegacyTokenOptions(token) {
  return { auth: token ? true : false };
}

// Dual-mode: facility-scoped when facilityId is provided, personal/global otherwise.
export async function getPlants(facilityIdOrToken) {
  if (facilityIdOrToken) {
    const facilityRes = await apiRequest(endpoints.plants(facilityIdOrToken), { method: "GET" });
    return normalizePlantList(facilityRes);
  }
  const listRes = await apiRequest(routes.PLANTS.LIST);
  return normalizePlantList(listRes);
}

export async function createPlant(a, b) {
  // Facility mode: createPlant(facilityId, data)
  if (typeof a === "string" && b !== undefined) {
    const createRes = await apiRequest(endpoints.plants(a), {
      method: "POST",
      body: b
    });
    return normalizePlantEntity(createRes);
  }

  // Legacy mode: createPlant(formData)
  const createRes = await apiRequest(routes.PLANTS.CREATE, {
    method: "POST",
    body: a
  });
  return normalizePlantEntity(createRes);
}

export async function updatePlant(a, b, c) {
  // Facility mode: updatePlant(facilityId, id, patch)
  if (typeof a === "string" && typeof b === "string" && c !== undefined) {
    const updateRes = await apiRequest(endpoints.plant(a, b), {
      method: "PATCH",
      body: c
    });
    return normalizePlantEntity(updateRes);
  }

  // Legacy mode: updatePlant(id, patch, token?)
  const updateRes = await apiRequest(routes.PLANTS.DETAIL(a), {
    method: "PUT",
    ...asLegacyTokenOptions(c),
    body: b
  });
  return normalizePlantEntity(updateRes);
}

export async function deletePlant(a, b) {
  // Facility mode: deletePlant(facilityId, id)
  if (typeof a === "string" && typeof b === "string") {
    const deleteRes = await apiRequest(endpoints.plant(a, b), { method: "DELETE" });
    return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
  }

  // Legacy mode: deletePlant(id, token?)
  const deleteRes = await apiRequest(routes.PLANTS.DETAIL(a), {
    method: "DELETE",
    ...asLegacyTokenOptions(b)
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}

export async function uploadPlantPhoto(file, token) {
  const form = new FormData();
  const value =
    file && typeof file === "object" && file.uri
      ? { uri: file.uri, type: file.type || "image/jpeg", name: file.name || "plant.jpg" }
      : file;
  form.append("photo", value);
  return apiRequest(routes.PLANTS.UPLOAD_PHOTO, {
    method: "POST",
    ...asLegacyTokenOptions(token),
    body: form
  });
}

export async function getPlantWithLogs(plantId, token) {
  const [plant, logs] = await Promise.all([
    apiRequest(routes.PLANTS.DETAIL(plantId), asLegacyTokenOptions(token)),
    apiRequest(routes.PLANTS.LOGS(plantId), asLegacyTokenOptions(token))
  ]);
  return {
    plant: plant?.plant ?? plant,
    logs: logs?.logs ?? logs?.data ?? logs ?? []
  };
}

export async function exportPlantPdf(plantId, token) {
  return apiRequest(routes.PLANTS.EXPORT_PDF(plantId), {
    method: "GET",
    ...asLegacyTokenOptions(token)
  });
}
