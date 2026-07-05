import { apiRequest } from "./apiRequest";

const STOREFRONT_BASE = "/api/commercial/storefront";

export type Storefront = {
  id: string;
  name: string;
  slug?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchStorefront(): Promise<Storefront | null> {
  const res = await apiRequest(STOREFRONT_BASE);
  return res?.storefront ?? res?.data?.storefront ?? res?.data ?? res ?? null;
}

export async function createStorefront(data: { name: string }) {
  return apiRequest(STOREFRONT_BASE, {
    method: "POST",
    body: data
  });
}

export async function updateStorefront(data: Partial<Storefront>) {
  return apiRequest(STOREFRONT_BASE, {
    method: "PATCH",
    body: data
  });
}

export async function fetchPublicStorefront(slug: string) {
  return apiRequest(`${STOREFRONT_BASE}/public/${encodeURIComponent(slug)}`, {
    method: "GET"
  });
}

export async function searchPublicStorefronts(
  options: {
    q?: string;
    similarTo?: string;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.q) params.set("q", options.q);
  if (options.similarTo) params.set("similarTo", options.similarTo);
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();

  return apiRequest(`${STOREFRONT_BASE}/public${query ? `?${query}` : ""}`, {
    method: "GET"
  });
}
