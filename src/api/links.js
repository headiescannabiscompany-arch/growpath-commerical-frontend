import { apiRequest } from "./apiRequest";

const LINKS_BASE = "/api/commercial/links";

function normalizeLinksList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.links)) return res.links;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.links)) return res.data.links;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

export async function fetchLinks() {
  const listRes = await apiRequest(LINKS_BASE);
  return normalizeLinksList(listRes);
}

export async function createLink(data) {
  return apiRequest(LINKS_BASE, { method: "POST", body: data });
}

export async function updateLink(linkId, data) {
  return apiRequest(`${LINKS_BASE}/${encodeURIComponent(linkId)}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteLink(linkId) {
  return apiRequest(`${LINKS_BASE}/${encodeURIComponent(linkId)}`, { method: "DELETE" });
}

// Legacy JS names kept for existing screens.
export const getLinks = fetchLinks;
export const addLink = createLink;
export const removeLink = deleteLink;
