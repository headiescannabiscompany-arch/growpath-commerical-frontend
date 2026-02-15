import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function listLives() {
  return api(apiRoutes.LIVES.LIST);
}

export function getLive(id) {
  return api(apiRoutes.LIVES.DETAIL(id));
}

export function createLive(data) {
  return api(apiRoutes.LIVES.CREATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateLive(id, data) {
  return api(apiRoutes.LIVES.UPDATE(id), {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteLive(id) {
  return api(apiRoutes.LIVES.DELETE(id), { method: "DELETE" });
}
