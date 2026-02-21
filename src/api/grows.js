import { apiRequest } from "./apiRequest";
import { postMultipart } from "./client.js";
import routes from "./routes.js";

export function listGrows(filters = {}) {
  return apiRequest(routes.GROWS.LIST, { params: filters });
}

export function createGrow(growData) {
  return apiRequest(routes.GROWS.CREATE, {
    method: "POST",
    body: growData
  });
}

export function addEntry(growId, data = {}) {
  return apiRequest(routes.GROWS.ENTRIES(growId), {
    method: "POST",
    body: data
  });
}

export function uploadEntryPhoto(growId, file) {
  const form = new FormData();
  form.append("photo", file);

  return postMultipart(routes.GROWS.ENTRY_PHOTO(growId), form);
}

export function addPlantToGrow(growId, plant) {
  return apiRequest(routes.GROWS.ADD_PLANT(growId), {
    method: "POST",
    body: plant
  });
}
