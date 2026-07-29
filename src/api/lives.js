import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function listLives() {
  return apiRequest(apiRoutes.LIVES.LIST);
}

export function getLive(id) {
  return apiRequest(apiRoutes.LIVES.DETAIL(id));
}

export function getLiveRsvp(id) {
  return apiRequest(apiRoutes.LIVES.RSVP(id));
}

export function rsvpLive(id) {
  return apiRequest(apiRoutes.LIVES.RSVP(id), { method: "POST", body: {} });
}

export function cancelLiveRsvp(id) {
  return apiRequest(apiRoutes.LIVES.RSVP(id), { method: "DELETE" });
}

export function createLive(data) {
  return apiRequest(apiRoutes.LIVES.CREATE, {
    method: "POST",
    body: data
  });
}

export function updateLive(id, data) {
  return apiRequest(apiRoutes.LIVES.UPDATE(id), {
    method: "PUT",
    body: data
  });
}

export function deleteLive(id) {
  return apiRequest(apiRoutes.LIVES.DELETE(id), { method: "DELETE" });
}
