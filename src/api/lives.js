import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function listLives() {
  return api(ROUTES.LIVES.LIST);
}

export function getLive(id) {
  return api(ROUTES.LIVES.DETAIL(id));
}

export function createLive(data) {
  return api(ROUTES.LIVES.CREATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateLive(id, data) {
  return api(ROUTES.LIVES.UPDATE(id), {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteLive(id) {
  return api(ROUTES.LIVES.DELETE(id), { method: "DELETE" });
}
