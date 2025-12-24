import { client } from "./client.js";

export function listTemplates(params = {}, token) {
  const qs = new URLSearchParams(params).toString();
  return client.get(`/api/templates${qs ? `?${qs}` : ""}`, token);
}

export function getTemplate(id, token) {
  return client.get(`/api/templates/${id}`, token);
}

export function createTemplate(data, token) {
  return client.post("/api/templates", data, token);
}

export function applyTemplateToPlant(templateId, plantId, token) {
  return client.post(`/api/templates/${templateId}/apply/${plantId}`, {}, token);
}