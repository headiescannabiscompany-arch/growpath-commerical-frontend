import { client } from "./client.js";

export function getTeam(token) {
  return client.get("/api/team", token);
}

export function addTeamMember(data, token) {
  return client.post("/api/team", data, token);
}

export function updateTeamMember(id, data, token) {
  return client.put(`/api/team/${id}`, data, token);
}

export function removeTeamMember(id, token) {
  return client.delete(`/api/team/${id}`, token);
}
