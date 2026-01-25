import { api } from "./client";

export type Link = {
  id: string;
  url: string;
  label?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchLinks(): Promise<Link[]> {
  return api.get(`/commercial/links`);
}

export async function createLink(data: Partial<Link>) {
  return api.post(`/commercial/links`, data);
}

export async function updateLink(linkId: string, data: Partial<Link>) {
  return api.patch(`/commercial/links/${linkId}`, data);
}

export async function deleteLink(linkId: string) {
  return api.del(`/commercial/links/${linkId}`);
}
