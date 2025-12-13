import { client as api } from "./client.js";

export function listGrows() {
  return api("/api/grows");
}

export function createGrow(growData) {
  return api("/api/grows", {
    method: "POST",
    body: JSON.stringify(growData)
  });
}

export function addEntry(growId, note, tags) {
  return api(`/api/grows/${growId}/entries`, {
    method: "POST",
    body: JSON.stringify({ note, tags })
  });
}

export function uploadEntryPhoto(growId, file) {
  const form = new FormData();
  form.append("photo", file);

  return api(`/api/grows/${growId}/entries/photo`, {
    method: "POST",
    body: form
  });
}
