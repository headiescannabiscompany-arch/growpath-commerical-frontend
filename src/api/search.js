import api from "./client";

export function search(q) {
  return api(`/search?q=${encodeURIComponent(q)}`);
}
