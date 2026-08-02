import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import apiRoutes from "./routes.js";

export async function getSubscriptionStatus() {
  const res = await apiRequest(endpoints.subscriptionStatus, { method: "GET" });
  return res?.data ?? res;
}

export async function getSubscriptionSetupStatus() {
  const res = await apiRequest("/api/subscription/status", { method: "GET" });
  return res?.data ?? res;
}

export async function getSubscription() {
  const res = await apiRequest("/api/subscription/me", { method: "GET" });
  return res?.data ?? res;
}

export type GiftClaimSummary = {
  recipientEmail: string;
  recipientName: string;
  plan: "pro" | "commercial" | "facility";
  interval: "monthly" | "yearly";
  message: string;
};

export async function getGiftClaim(token: string): Promise<GiftClaimSummary> {
  const res = await apiRequest("/api/subscription/gifts/claim/preview", {
    method: "POST",
    auth: false,
    cache: "no-store",
    body: { token }
  });
  return (res?.data ?? res)?.gift;
}

export type GiftClaimResult = {
  claimed: true;
  plan: GiftClaimSummary["plan"];
  interval: GiftClaimSummary["interval"];
  nextPath?: string;
};

export async function claimGift(token: string): Promise<GiftClaimResult> {
  const res = await apiRequest("/api/subscription/gifts/claim", {
    method: "POST",
    body: { token }
  });
  return res?.data ?? res;
}

export type SentGiftState =
  | "checkout_pending"
  | "delivery_in_progress"
  | "awaiting_claim"
  | "delivery_retrying"
  | "delivery_unknown"
  | "delivery_failed"
  | "claimed"
  | "refund_pending"
  | "refunded"
  | "support_required"
  | "canceled";

export type SentGift = {
  id: string;
  plan: string;
  interval: string;
  amountCents: number | null;
  currency: string | null;
  recipientEmailMasked: string;
  recipientName: string;
  message: string;
  state: SentGiftState;
  createdAt: string | null;
  paidAt: string | null;
  claimExpiresAt: string | null;
  claimedAt: string | null;
  refundedAt: string | null;
  nextActionAt: string | null;
  actions: {
    canResend: boolean;
    resendRequiresAcknowledgement: boolean;
    canCancelAndRefund: false;
    requiresSupport: boolean;
    nextActionAt?: string | null;
  };
};

export type SentGiftsPage = {
  gifts: SentGift[];
  nextCursor: string | null;
};

const SENT_GIFT_STATES = new Set<SentGiftState>([
  "checkout_pending",
  "delivery_in_progress",
  "awaiting_claim",
  "delivery_retrying",
  "delivery_unknown",
  "delivery_failed",
  "claimed",
  "refund_pending",
  "refunded",
  "support_required",
  "canceled"
]);

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isSentGift(value: unknown): value is SentGift {
  if (!value || typeof value !== "object") return false;
  const gift = value as Record<string, any>;
  const actions = gift.actions;
  return Boolean(
    typeof gift.id === "string" &&
    gift.id &&
    typeof gift.plan === "string" &&
    typeof gift.interval === "string" &&
    (gift.amountCents === null || Number.isSafeInteger(gift.amountCents)) &&
    nullableString(gift.currency) &&
    typeof gift.recipientEmailMasked === "string" &&
    typeof gift.recipientName === "string" &&
    typeof gift.message === "string" &&
    SENT_GIFT_STATES.has(gift.state) &&
    nullableString(gift.createdAt) &&
    nullableString(gift.paidAt) &&
    nullableString(gift.claimExpiresAt) &&
    nullableString(gift.claimedAt) &&
    nullableString(gift.refundedAt) &&
    nullableString(gift.nextActionAt) &&
    actions &&
    typeof actions === "object" &&
    typeof actions.canResend === "boolean" &&
    typeof actions.resendRequiresAcknowledgement === "boolean" &&
    actions.canCancelAndRefund === false &&
    typeof actions.requiresSupport === "boolean" &&
    (actions.nextActionAt === undefined || nullableString(actions.nextActionAt))
  );
}

function invalidSentGiftResponse(): never {
  throw new Error("The gift history response was invalid.");
}

export async function listSentGifts({
  limit = 20,
  cursor
}: {
  limit?: number;
  cursor?: string | null;
} = {}): Promise<SentGiftsPage> {
  const res = await apiRequest("/api/subscription/gifts", {
    method: "GET",
    cache: "no-store",
    params: { limit, cursor }
  });
  const payload = res?.data ?? res;
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.gifts) ||
    !payload.gifts.every(isSentGift) ||
    !(
      payload.nextCursor === null ||
      (typeof payload.nextCursor === "string" && payload.nextCursor)
    )
  ) {
    return invalidSentGiftResponse();
  }
  return {
    gifts: payload.gifts,
    nextCursor: payload.nextCursor
  };
}

export async function getSentGift(id: string): Promise<SentGift> {
  const res = await apiRequest(`/api/subscription/gifts/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store"
  });
  const gift = (res?.data ?? res)?.gift;
  return isSentGift(gift) ? gift : invalidSentGiftResponse();
}

export async function resendSentGift(
  id: string,
  {
    acknowledgePossibleDuplicate = false
  }: { acknowledgePossibleDuplicate?: boolean } = {}
): Promise<{ sent: boolean; gift: SentGift }> {
  const res = await apiRequest(
    `/api/subscription/gifts/${encodeURIComponent(id)}/resend`,
    {
      method: "POST",
      body: acknowledgePossibleDuplicate ? { acknowledgePossibleDuplicate: true } : {}
    }
  );
  const payload = res?.data ?? res;
  if (typeof payload?.sent !== "boolean" || !isSentGift(payload?.gift)) {
    return invalidSentGiftResponse();
  }
  return payload;
}

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

export async function createCheckoutSession(
  data: {
    plan: string;
    interval?: string;
    billingInterval?: string;
    successUrl?: string;
    cancelUrl?: string;
    giftMode?: boolean;
    giftRecipientEmail?: string;
    giftRecipientName?: string;
    giftMessage?: string;
    checkoutAttemptId?: string;
  } = { plan: "pro", interval: "monthly" }
) {
  const origin = currentOrigin();
  const successUrl =
    data.successUrl || (origin ? `${origin}/offers?subscription=success` : "");
  const cancelUrl =
    data.cancelUrl || (origin ? `${origin}/offers?subscription=canceled` : "");
  const checkoutAttemptId = data.checkoutAttemptId?.trim() || "";
  const body = {
    plan: data.plan || "pro",
    interval: data.interval || data.billingInterval || "monthly",
    paymentMethodTypes: ["card"],
    disallowBankDebits: true,
    ...(successUrl ? { successUrl } : {}),
    ...(cancelUrl ? { cancelUrl } : {}),
    ...(data.giftMode ? { giftMode: true } : {}),
    ...(data.giftRecipientEmail
      ? { giftRecipientEmail: data.giftRecipientEmail.trim().toLowerCase() }
      : {}),
    ...(data.giftRecipientName
      ? { giftRecipientName: data.giftRecipientName.trim() }
      : {}),
    ...(data.giftMessage ? { giftMessage: data.giftMessage.trim() } : {}),
    ...(data.giftMode && checkoutAttemptId ? { checkoutAttemptId } : {})
  };
  const res = await apiRequest("/api/subscription/create-checkout-session", {
    method: "POST",
    body
  });
  return res?.data ?? res;
}

export async function verifyIapReceipt({
  receipt,
  platform,
  productId,
  transactionId
}: {
  receipt: string;
  platform: string;
  productId?: string;
  transactionId?: string;
}) {
  return apiRequest(apiRoutes.SUBSCRIBE.VERIFY_IAP, {
    method: "POST",
    body: {
      receipt,
      platform,
      productId,
      transactionId
    }
  });
}
