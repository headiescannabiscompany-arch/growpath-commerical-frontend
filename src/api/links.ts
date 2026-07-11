import { apiRequest } from "./apiRequest";

const LINKS_BASE = "/api/commercial/links";

export type Link = {
  id: string;
  url: string;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchLinks(): Promise<Link[]> {
  const res = await apiRequest(LINKS_BASE);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.links)) return res.links;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.links)) return res.data.links;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

export async function createLink(data: Partial<Link>) {
  return apiRequest(LINKS_BASE, { method: "POST", body: data });
}

export async function updateLink(linkId: string, data: Partial<Link>) {
  return apiRequest(`${LINKS_BASE}/${encodeURIComponent(linkId)}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteLink(linkId: string) {
  return apiRequest(`${LINKS_BASE}/${encodeURIComponent(linkId)}`, { method: "DELETE" });
}

export const getLinks = fetchLinks;
export const addLink = createLink;
export const removeLink = deleteLink;
