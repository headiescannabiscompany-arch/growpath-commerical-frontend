import { client as api } from "./client.js";
import routes from "./routes.js";

function withQuery(base, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getEntries(filters) {
  return api(withQuery(routes.GROWLOG.LIST, filters));
}

export function getEntry(id) {
  return api(routes.GROWLOG.DETAIL(id));
}

export function createEntry(data) {
  return api(routes.GROWLOG.CREATE, {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateEntry(id, data) {
  return api(routes.GROWLOG.DETAIL(id), {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteEntry(id) {
  return api(routes.GROWLOG.DETAIL(id), { method: "DELETE" });
}

export function autoTagEntry(id) {
  return api(routes.GROWLOG.AUTO_TAG(id), {
    method: "POST"
  });
}

export function getPlants() {
  return api(routes.PLANTS.LIST);
}
