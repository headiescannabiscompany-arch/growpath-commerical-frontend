import { apiRequest } from "./apiRequest";

const STOREFRONT_BASE = "/api/commercial/storefront";

export type Storefront = {
  id: string;
  name: string;
  slug?: string;
  storefrontType?: "general" | "dispensary";
  city?: string;
  stateCode?: string;
  latitude?: number;
  longitude?: number;
  websiteUrl?: string;
  pickupAvailable?: boolean;
  pickupInstructions?: string;
  logoUrl?: string;
  bannerUrl?: string;
  imageUrl?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicProductAccessResult = {
  allowed: boolean;
  decision: "allowed" | "denied" | "review_required" | "not_regulated";
  reasonCodes?: string[];
  policyVersion?: string | null;
  externalPurchaseUrl?: string;
  message?: string;
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

export async function checkPublicProductAccess(
  productId: string,
  input: {
    capability: string;
    destination: { countryCode: string; subdivisionCode?: string };
    buyerEligibility: string;
    fulfillmentMethod: string;
  }
): Promise<PublicProductAccessResult> {
  return apiRequest(
    `${STOREFRONT_BASE}/public/products/${encodeURIComponent(productId)}/access`,
    { method: "POST", body: input }
  );
}

export async function searchPublicStorefronts(
  options: {
    q?: string;
    similarTo?: string;
    storefrontType?: "general" | "dispensary";
    stateCode?: string;
    latitude?: number;
    longitude?: number;
    radiusMiles?: number;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.q) params.set("q", options.q);
  if (options.similarTo) params.set("similarTo", options.similarTo);
  if (options.storefrontType) params.set("storefrontType", options.storefrontType);
  if (options.stateCode) params.set("state", options.stateCode);
  if (Number.isFinite(options.latitude)) params.set("latitude", String(options.latitude));
  if (Number.isFinite(options.longitude))
    params.set("longitude", String(options.longitude));
  if (Number.isFinite(options.radiusMiles))
    params.set("radiusMiles", String(options.radiusMiles));
  if (options.limit) params.set("limit", String(options.limit));
  const query = params.toString();

  return apiRequest(`${STOREFRONT_BASE}/public${query ? `?${query}` : ""}`, {
    method: "GET"
  });
}
