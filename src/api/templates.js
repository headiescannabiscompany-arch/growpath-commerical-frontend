import { client } from "./client";

export function listTemplates(params = {}, token) {
  const qs = new URLSearchParams(params).toString();
  return client.get(`/templates${qs ? `?${qs}` : ""}`, token);
}

export function getTemplate(id, token) {
  return client.get(`/templates/${id}`, token);
}

export function createTemplate(data, token) {
  return client.post("/templates", data, token);
}

export function applyTemplateToPlant(templateId, plantId, token) {
  return client.post(`/templates/${templateId}/apply/${plantId}`, {}, token);
}
