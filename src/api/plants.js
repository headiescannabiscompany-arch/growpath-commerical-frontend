import client from "./client";

export async function createPlant(data, token) {
  return client.post("/api/plants", data, token);
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
