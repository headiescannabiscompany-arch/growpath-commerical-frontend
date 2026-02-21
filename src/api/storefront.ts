import { apiRequest } from "./apiRequest";

export type Storefront = {
  id: string;
  name: string;
  slug?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchStorefront(): Promise<Storefront | null> {
  // Return null if none exists yet
  const res = await apiRequest(`/commercial/storefront`);
  // Normalize: if API returns {storefront: ...}, unwrap here
  if (res && res.storefront !== undefined) return res.storefront;
  return res || null;
}

export async function createStorefront(data: { name: string }) {
  return apiRequest(`/commercial/storefront`, {
    method: "POST",
    body: data
  });
}

export async function updateStorefront(data: Partial<Storefront>) {
  return apiRequest(`/commercial/storefront`, {
    method: "PATCH",
    body: data
  });
}
