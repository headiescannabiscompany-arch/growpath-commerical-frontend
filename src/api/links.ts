import { apiRequest } from "./apiRequest";

export type Link = {
  id: string;
  url: string;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchLinks(): Promise<Link[]> {
  return apiRequest(`/commercial/links`);
}

export async function createLink(data: Partial<Link>) {
  return apiRequest(`/commercial/links`, { method: "POST", body: data });
}

export async function updateLink(linkId: string, data: Partial<Link>) {
  return apiRequest(`/commercial/links/${linkId}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteLink(linkId: string) {
  return apiRequest(`/commercial/links/${linkId}`, { method: "DELETE" });
}
