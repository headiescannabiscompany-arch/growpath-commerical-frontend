import { apiRequest } from "./apiRequest";

export type MarketplaceContent = Record<string, unknown>;

export type MarketplacePurchase = {
  purchaseId: string;
  purchasedAt?: string;
  upload: MarketplaceContent;
};

export type MarketplacePurchaseLibrary = {
  pagination: Record<string, unknown> | null;
  purchases: MarketplacePurchase[];
};

export type MarketplaceDownloadResponse = {
  data?: { delivery?: { fileUrl?: string }; downloadUrl?: string; url?: string };
  delivery?: { fileUrl?: string };
  download?: { url?: string };
  downloadUrl?: string;
  url?: string;
};

const enc = (value: unknown) => encodeURIComponent(String(value ?? ""));

export const MARKETPLACE_BUYER_ROUTES = {
  DOWNLOAD: (contentId: string) => `/api/marketplace/${enc(contentId)}/download`,
  PURCHASES: "/api/marketplace/user/purchases"
};

export async function downloadMarketplaceContent(
  contentId: string
): Promise<MarketplaceDownloadResponse> {
  return apiRequest(MARKETPLACE_BUYER_ROUTES.DOWNLOAD(contentId), {
    method: "POST"
  });
}

export async function getMarketplacePurchases(
  page = 1,
  limit = 20
): Promise<MarketplacePurchaseLibrary> {
  const response = await apiRequest(MARKETPLACE_BUYER_ROUTES.PURCHASES, {
    method: "GET",
    params: { page, limit: Math.min(50, Math.max(1, limit)) }
  });
  const payload = response?.data ?? response ?? {};
  return {
    purchases: Array.isArray(payload?.purchases) ? payload.purchases : [],
    pagination: payload?.pagination ?? null
  };
}

export function marketplaceDownloadUrl(response: MarketplaceDownloadResponse): string {
  return String(
    response?.url ||
      response?.downloadUrl ||
      response?.delivery?.fileUrl ||
      response?.download?.url ||
      response?.data?.url ||
      response?.data?.downloadUrl ||
      response?.data?.delivery?.fileUrl ||
      ""
  ).trim();
}
