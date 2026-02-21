import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function listGuilds() {
  return apiRequest(apiRoutes.GUILDS.LIST);
}

export function getGuild(id) {
  return apiRequest(apiRoutes.GUILDS.DETAIL(id));
}

export function createGuild(data) {
  return apiRequest(apiRoutes.GUILDS.CREATE, {
    method: "POST",
    body: data
  });
}

export function joinGuild(id) {
  return apiRequest(apiRoutes.GUILDS.JOIN(id), { method: "POST" });
}

export function leaveGuild(id) {
  return apiRequest(apiRoutes.GUILDS.LEAVE(id), { method: "POST" });
}

export function deleteGuild(id) {
  return apiRequest(apiRoutes.GUILDS.DELETE(id), { method: "DELETE" });
}
