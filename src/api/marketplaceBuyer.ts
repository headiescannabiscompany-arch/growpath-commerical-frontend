import { apiRequest } from "./apiRequest";
import {
  pollAuthoritativeCheckoutStatus,
  type AuthoritativeCheckoutState,
  type CheckoutReconciliation
} from "../utils/buyerCheckoutRecovery";

export type MarketplaceContent = Record<string, unknown>;

export type MarketplaceBuyerSnapshot = {
  content: MarketplaceContent | null;
  state: AuthoritativeCheckoutState;
};

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
  data?: {
    delivery?: {
      fileUrl?: string;
    };
    downloadUrl?: string;
    url?: string;
  };
  delivery?: {
    fileUrl?: string;
  };
  download?: {
    url?: string;
  };
  downloadUrl?: string;
  url?: string;
};

const enc = (value: unknown) => encodeURIComponent(String(value ?? ""));

export const MARKETPLACE_BUYER_ROUTES = {
  DOWNLOAD: (contentId: string) => `/api/marketplace/${enc(contentId)}/download`,
  PURCHASES: "/api/marketplace/user/purchases",
  PURCHASE_STATUS: (contentId: string) =>
    `/api/marketplace/${enc(contentId)}/purchase-status`
};

const CONFIRMED_STATUSES = new Set([
  "active",
  "available",
  "complete",
  "completed",
  "entitled",
  "fulfilled",
  "granted",
  "owned"
]);
const PAYMENT_RECORDED_STATUSES = new Set(["complete", "completed", "paid", "recorded"]);
const PENDING_STATUSES = new Set([
  "checkout_pending",
  "created",
  "open",
  "pending",
  "processing",
  "submitted"
]);
const TERMINAL_STATUSES = new Set([
  "canceled",
  "cancelled",
  "disputed",
  "expired",
  "failed",
  "refunded",
  "revoked",
  "void"
]);

function objects(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  return [root, root.buyer, root.entitlement, root.purchase, root.access].filter(
    (candidate): candidate is Record<string, unknown> =>
      Boolean(candidate && typeof candidate === "object")
  );
}

export function marketplaceBuyerState(content: unknown): AuthoritativeCheckoutState {
  const sources = objects(content);
  const accessStatusFields = [
    "accessStatus",
    "deliveryEntitlementStatus",
    "entitlementStatus"
  ];
  const statusFields = [
    ...accessStatusFields,
    "checkoutStatus",
    "fulfillmentStatus",
    "paymentStatus",
    "purchaseStatus"
  ];
  const statuses = sources.flatMap((source) =>
    statusFields
      .map((key) =>
        String(source[key] || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  );
  if (statuses.some((status) => TERMINAL_STATUSES.has(status))) return "terminal";

  const entitlementFlags = [
    "canDownload",
    "entitled",
    "hasAccess",
    "inLibrary",
    "isOwned",
    "isPurchased",
    "owned",
    "purchased"
  ];
  if (sources.some((source) => entitlementFlags.some((key) => source[key] === true))) {
    return "confirmed";
  }
  const accessStatuses = sources.flatMap((source) =>
    accessStatusFields
      .map((key) =>
        String(source[key] || "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  );
  if (accessStatuses.some((status) => CONFIRMED_STATUSES.has(status))) {
    return "confirmed";
  }
  if (statuses.some((status) => PENDING_STATUSES.has(status))) return "pending";
  if (
    sources.some((source) => entitlementFlags.some((key) => source[key] === false)) ||
    statuses.some((status) => PAYMENT_RECORDED_STATUSES.has(status))
  ) {
    return "pending";
  }
  return "unknown";
}

export async function getMarketplaceBuyerStatus(
  contentId: string
): Promise<MarketplaceBuyerSnapshot> {
  const response = await apiRequest(MARKETPLACE_BUYER_ROUTES.PURCHASE_STATUS(contentId), {
    method: "GET"
  });
  const payload = (response?.data ?? response ?? {}) as MarketplaceContent;
  const content = {
    ...payload,
    uploadId: String(payload.uploadId || contentId)
  };
  return { content, state: marketplaceBuyerState(content) };
}

export async function pollMarketplaceBuyerStatus(
  contentId: string,
  options: {
    onSnapshot?: (snapshot: MarketplaceBuyerSnapshot) => void;
    shouldContinue?: () => boolean;
  } = {}
): Promise<CheckoutReconciliation<MarketplaceBuyerSnapshot>> {
  return pollAuthoritativeCheckoutStatus({
    classify: (snapshot) => snapshot.state,
    onSnapshot: options.onSnapshot,
    read: () => getMarketplaceBuyerStatus(contentId),
    shouldContinue: options.shouldContinue
  });
}

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
