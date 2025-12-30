import { client as api, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, value);
    }
  });
  const qs = params.toString();
  return qs ? `${ROUTES.GROWS.LIST}?${qs}` : ROUTES.GROWS.LIST;
}

export function listGrows(filters = {}) {
  const path = buildQuery(filters);
  return api(path);
}

export function createGrow(growData) {
  return api(ROUTES.GROWS.CREATE, {
    method: "POST",
    body: JSON.stringify(growData)
  });
}

export function addEntry(growId, note, tags) {
  return api(ROUTES.GROWS.ENTRIES(growId), {
    method: "POST",
    body: JSON.stringify({ note, tags })
  });
}

export function uploadEntryPhoto(growId, file) {
  const form = new FormData();
  form.append("photo", file);

  return postMultipart(ROUTES.GROWS.ENTRY_PHOTO(growId), form);
}
