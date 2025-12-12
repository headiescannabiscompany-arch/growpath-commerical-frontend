import { api } from "./client";

export function getEntries() {
  return api("/growlog");
}

export function getEntry(id) {
  return api(`/growlog/${id}`);
}

export function createEntry(data) {
  return api("/growlog", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export function updateEntry(id, data) {
  return api(`/growlog/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

export function deleteEntry(id) {
  return api(`/growlog/${id}`, { method: "DELETE" });
}

export function autoTagEntry(id) {
  return api(`/growlog/${id}/auto-tag`, {
    method: "POST"
  });
}
