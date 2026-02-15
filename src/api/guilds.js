import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function listGuilds() {
  return api(apiRoutes.GUILDS.LIST);
}

export function getGuild(id) {
  return api(apiRoutes.GUILDS.DETAIL(id));
}

export function createGuild(data) {
  return api(apiRoutes.GUILDS.CREATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function joinGuild(id) {
  return api(apiRoutes.GUILDS.JOIN(id), { method: "POST" });
}

export function leaveGuild(id) {
  return api(apiRoutes.GUILDS.LEAVE(id), { method: "POST" });
}

export function deleteGuild(id) {
  return api(apiRoutes.GUILDS.DELETE(id), { method: "DELETE" });
}
