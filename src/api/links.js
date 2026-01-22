import { client } from "./client.js";

export function getLinks(token) {
  return client.get("/api/links", token);
}

export function addLink(data, token) {
  return client.post("/api/links", data, token);
}

export function updateLink(id, data, token) {
  return client.put(`/api/links/${id}`, data, token);
}

export function removeLink(id, token) {
  return client.delete(`/api/links/${id}`, token);
}
