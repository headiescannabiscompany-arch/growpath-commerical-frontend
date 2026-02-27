import { apiRequest } from "./apiRequest";

const LINKS_BASE = "/commercial/links";

function normalizeLinksList(res) {
  if (Array.isArray(res)) return res;
  return res?.links ?? res?.data ?? [];
}

export async function fetchLinks() {
  const listRes = await apiRequest(LINKS_BASE);
  return normalizeLinksList(listRes);
}

export async function createLink(data) {
  return apiRequest(LINKS_BASE, { method: "POST", body: data });
}

export async function updateLink(linkId, data) {
  return apiRequest(`${LINKS_BASE}/${linkId}`, { method: "PATCH", body: data });
}

export async function deleteLink(linkId) {
  return apiRequest(`${LINKS_BASE}/${linkId}`, { method: "DELETE" });
}

// Legacy JS names kept for existing screens.
export const getLinks = fetchLinks;
export const addLink = createLink;
export const removeLink = deleteLink;
