import { client as api, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

export function listGrows() {
  return api(ROUTES.GROWS.LIST);
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
