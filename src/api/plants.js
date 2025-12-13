// ...existing code...
export async function exportPlantPdf(plantId) {
  // This is a stub. Replace with real implementation if needed.
  return api.get(`/exports/plants/${plantId}.pdf`, {
    responseType: "blob"
  });
}
import { client } from "./client";

// Accepts FormData for media upload
export async function createPlant(formData, token) {
  return client.postMultipart("/api/plants", formData, token);
}

export async function getPlants(token) {
  return client.get("/api/plants", token);
}

export async function getPlantWithLogs(id, token) {
  return client.get(`/api/plants/${id}`, token);
}

export async function createPlantLog(id, data, token) {
  return client.post(`/api/plants/${id}/logs`, data, token);
}

export async function getPlantStats(id, token) {
  return client.get(`/api/plants/${id}/stats`, token);
}
