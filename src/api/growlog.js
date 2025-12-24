import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function getEntries() {
  return api(ROUTES.GROWLOG.LIST);
}

export function getEntry(id) {
  return api(ROUTES.GROWLOG.DETAIL(id));
}

export function createEntry(data) {
  return api(ROUTES.GROWLOG.CREATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateEntry(id, data) {
  return api(ROUTES.GROWLOG.DETAIL(id), {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteEntry(id) {
  return api(ROUTES.GROWLOG.DETAIL(id), { method: "DELETE" });
}

export function autoTagEntry(id) {
  return api(ROUTES.GROWLOG.AUTO_TAG(id), {
    method: "POST"
  });
}

export function getPlants() {
  return api(ROUTES.PLANTS.LIST);
}
