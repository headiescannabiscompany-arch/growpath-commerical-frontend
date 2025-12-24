import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function listGuilds() {
  return api(ROUTES.GUILDS.LIST);
}

export function getGuild(id) {
  return api(ROUTES.GUILDS.DETAIL(id));
}

export function createGuild(data) {
  return api(ROUTES.GUILDS.CREATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function joinGuild(id) {
  return api(ROUTES.GUILDS.JOIN(id), { method: "POST" });
}

export function leaveGuild(id) {
  return api(ROUTES.GUILDS.LEAVE(id), { method: "POST" });
}

export function deleteGuild(id) {
  return api(ROUTES.GUILDS.DELETE(id), { method: "DELETE" });
}
