import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export function getEntries(filters) {
  return apiRequest(routes.GROWLOG.LIST, { params: filters });
}

export function getEntry(id) {
  return apiRequest(routes.GROWLOG.DETAIL(id));
}

export function createEntry(data) {
  return apiRequest(routes.GROWLOG.CREATE, {
    method: "POST",
    body: data
  });
}

export function updateEntry(id, data) {
  return apiRequest(routes.GROWLOG.DETAIL(id), {
    method: "PUT",
    body: data
  });
}

export function deleteEntry(id) {
  return apiRequest(routes.GROWLOG.DETAIL(id), { method: "DELETE" });
}

export function autoTagEntry(id) {
  return apiRequest(routes.GROWLOG.AUTO_TAG(id), {
    method: "POST"
  });
}

export function getPlants() {
  return apiRequest(routes.PLANTS.LIST);
}
