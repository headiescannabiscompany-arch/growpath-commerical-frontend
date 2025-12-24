import { client } from "./client.js";
import ROUTES from "./routes.js";

// Accepts FormData for media upload
export async function createPlant(formData, token) {
  return client.postMultipart(ROUTES.PLANTS.CREATE, formData, token);
}

export async function getPlants(token) {
  return client.get(ROUTES.PLANTS.LIST, token);
}

export async function getPlantWithLogs(id, token) {
  return client.get(ROUTES.PLANTS.DETAIL(id), token);
}

export async function createPlantLog(id, data, token) {
  return client.post(ROUTES.PLANTS.LOGS(id), data, token);
}

export async function getPlantStats(id, token) {
  return client.get(ROUTES.PLANTS.STATS(id), token);
}

export async function exportPlantPdf(plantId) {
  return client.get(ROUTES.PLANTS.EXPORT_PDF(plantId), {
    responseType: "blob"
  });
}