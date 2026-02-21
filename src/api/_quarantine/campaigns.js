import { client } from "./client.js";

export function getCampaigns(token) {
  return client.get("/api/campaigns", token);
}

export function addCampaign(data, token) {
  return client.post("/api/campaigns", data, token);
}

export function updateCampaign(id, data, token) {
  return client.put(`/api/campaigns/${id}`, data, token);
}

export function removeCampaign(id, token) {
  return client.delete(`/api/campaigns/${id}`, token);
}

export function getCampaignAnalytics(id, token) {
  return client.get(`/api/campaigns/${id}/analytics`, token);
}
