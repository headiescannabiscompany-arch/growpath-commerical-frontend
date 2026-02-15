import { client as api, postMultipart } from "./client.js";
import routes from "./routes.js";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `${routes.GROWS.LIST}?${qs}` : routes.GROWS.LIST;
}

export function listGrows(filters = {}) {
  const path = buildQuery(filters);
  return api(path);
}

export function createGrow(growData) {
  return api(routes.GROWS.CREATE, {
    method: "POST",
    body: JSON.stringify(growData)
  });
}

export function addEntry(growId, data = {}) {
  return api(routes.GROWS.ENTRIES(growId), {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function uploadEntryPhoto(growId, file) {
  const form = new FormData();
  form.append("photo", file);

  return postMultipart(routes.GROWS.ENTRY_PHOTO(growId), form);
}

export function addPlantToGrow(growId, plant) {
  return api(routes.GROWS.ADD_PLANT(growId), {
    method: "POST",
    body: JSON.stringify(plant)
  });
}
