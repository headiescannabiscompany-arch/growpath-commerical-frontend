import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function listLives(params = {}) {
  return apiRequest(apiRoutes.LIVES.LIST, { params });
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

export function listLiveChat(id, after) {
  return apiRequest(apiRoutes.LIVES.CHAT(id), {
    params: { after: after || undefined },
    invalidateOn401: false
  });
}

export function sendLiveChat(id, body) {
  return apiRequest(apiRoutes.LIVES.CHAT(id), { method: "POST", body: { body } });
}

export function deleteLiveChatMessage(id, messageId, reason = "") {
  return apiRequest(apiRoutes.LIVES.CHAT_MESSAGE(id, messageId), {
    method: "DELETE",
    body: reason ? { reason } : undefined
  });
}

export function rotateLiveOverlayToken(id) {
  return apiRequest(apiRoutes.LIVES.ROTATE_OVERLAY_TOKEN(id), {
    method: "POST",
    body: {}
  });
}

export function getLiveOverlay(token, after) {
  return apiRequest(apiRoutes.LIVES.OVERLAY(token), {
    params: { after: after || undefined },
    invalidateOn401: false
  });
}

export function getHostedLiveStatus() {
  return apiRequest(apiRoutes.LIVES.HOSTED_STATUS);
}

export function listHostedLiveChannels() {
  return apiRequest(apiRoutes.LIVES.HOSTED_CHANNELS);
}

export function provisionHostedLiveInput(id, data = {}) {
  return apiRequest(apiRoutes.LIVES.HOSTED_INPUT(id), { method: "POST", body: data });
}

export function rotateHostedLiveInput(id) {
  return apiRequest(apiRoutes.LIVES.ROTATE_HOSTED_INPUT(id), {
    method: "POST",
    body: {}
  });
}

export function getHostedLiveLifecycle(id) {
  return apiRequest(apiRoutes.LIVES.HOSTED_LIFECYCLE(id));
}

export function getHostedLivePlayback(id) {
  return apiRequest(apiRoutes.LIVES.PLAYBACK(id), {
    method: "POST",
    body: {}
  });
}

export function removeHostedLiveChannel(channelId) {
  return apiRequest(apiRoutes.LIVES.HOSTED_CHANNEL(channelId), { method: "DELETE" });
}

export function releaseHostedLiveInput(id) {
  return apiRequest(apiRoutes.LIVES.HOSTED_INPUT(id), { method: "DELETE" });
}
