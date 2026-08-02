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

const SETTLED_GIFT_STATES = new Set<SentGiftState>([
  "delivery_in_progress",
  "awaiting_claim",
  "delivery_retrying",
  "delivery_unknown",
  "delivery_failed",
  "claimed",
  "refund_pending",
  "refunded",
  "support_required"
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

export type GiftCheckoutInterval = "monthly" | "yearly";

export type GiftCheckoutQuote = {
  schemaVersion: "gift_quote_v1";
  version: 1;
  plan: "pro";
  interval: GiftCheckoutInterval;
  quantity: 1;
  amountCents: number;
  currency: string;
  renews: false;
  issuedAt: string;
  expiresAt: string;
  confirmationToken: string;
};

export type GiftCheckoutQuoteRequest = {
  plan: "pro";
  interval: GiftCheckoutInterval;
  checkoutAttemptId: string;
  giftRecipientEmail: string;
  giftRecipientName?: string;
  giftMessage?: string;
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isGiftCheckoutQuote(value: unknown): value is GiftCheckoutQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as Record<string, unknown>;
  return Boolean(
    quote.schemaVersion === "gift_quote_v1" &&
    quote.version === 1 &&
    quote.plan === "pro" &&
    ["monthly", "yearly"].includes(String(quote.interval || "")) &&
    quote.quantity === 1 &&
    Number.isSafeInteger(quote.amountCents) &&
    Number(quote.amountCents) > 0 &&
    /^[a-z]{3}$/.test(String(quote.currency || "")) &&
    quote.renews === false &&
    isIsoDate(quote.issuedAt) &&
    isIsoDate(quote.expiresAt) &&
    Date.parse(quote.expiresAt as string) > Date.parse(quote.issuedAt as string) &&
    typeof quote.confirmationToken === "string" &&
    /^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(quote.confirmationToken) &&
    quote.confirmationToken.length <= 4096
  );
}

function invalidGiftCheckoutQuote(): never {
  throw new Error(
    "The gift checkout quote response was invalid. No checkout was created."
  );
}

export async function createGiftCheckoutQuote(
  request: GiftCheckoutQuoteRequest
): Promise<GiftCheckoutQuote> {
  const body = {
    plan: "pro" as const,
    interval: request.interval,
    checkoutAttemptId: request.checkoutAttemptId.trim(),
    giftRecipientEmail: request.giftRecipientEmail.trim().toLowerCase(),
    ...(request.giftRecipientName?.trim()
      ? { giftRecipientName: request.giftRecipientName.trim() }
      : {}),
    ...(request.giftMessage?.trim() ? { giftMessage: request.giftMessage.trim() } : {})
  };
  const res = await apiRequest("/api/subscription/gifts/checkout/quote", {
    method: "POST",
    auth: true,
    cache: "no-store",
    body
  });
  const quote = (res?.data ?? res)?.quote;
  return isGiftCheckoutQuote(quote) &&
    quote.plan === request.plan &&
    quote.interval === request.interval
    ? quote
    : invalidGiftCheckoutQuote();
}

export type GiftCheckoutReconcileState =
  | "verifying"
  | "pending"
  | "open_unpaid"
  | "payment_processing"
  | "settled"
  | "expired"
  | "support";

export type GiftCheckoutReconcileResult = {
  state: GiftCheckoutReconcileState;
  paymentConfirmed: boolean;
  canResume: boolean;
  canStartNewAttempt: boolean;
  checkoutUrl: string | null;
  amountCents: number | null;
  currency: string | null;
  expiresAt: string | null;
  gift: SentGift;
};

export type GiftCheckoutReconcileRequest = {
  sessionId?: string;
  checkoutAttemptId?: string;
};

export function isSafeStripeCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "checkout.stripe.com" &&
      !parsed.port &&
      !parsed.username &&
      !parsed.password &&
      /^\/c\/pay\/cs_[A-Za-z0-9_]+$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function isGiftCheckoutReconcileResult(
  value: unknown
): value is GiftCheckoutReconcileResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, any>;
  const amountValid =
    result.amountCents === null ||
    (Number.isSafeInteger(result.amountCents) && result.amountCents > 0);
  const currencyValid =
    result.currency === null || /^[a-z]{3}$/.test(String(result.currency || ""));
  const expiryValid = result.expiresAt === null || isIsoDate(result.expiresAt);
  const giftValid = isSentGift(result.gift);
  const giftContractValid =
    giftValid &&
    result.gift.plan === "pro" &&
    ["monthly", "yearly"].includes(result.gift.interval) &&
    result.amountCents === result.gift.amountCents &&
    result.currency === result.gift.currency;
  const states: GiftCheckoutReconcileState[] = [
    "verifying",
    "pending",
    "open_unpaid",
    "payment_processing",
    "settled",
    "expired",
    "support"
  ];
  const stateValid = states.includes(result.state);
  const paymentValid =
    result.state === "settled"
      ? result.paymentConfirmed === true &&
        isIsoDate(result.gift?.paidAt) &&
        SETTLED_GIFT_STATES.has(result.gift?.state)
      : result.paymentConfirmed === false;
  const settledAmountValid =
    result.state !== "settled" ||
    (Number.isSafeInteger(result.amountCents) &&
      Number(result.amountCents) > 0 &&
      typeof result.currency === "string");
  const resumeValid =
    result.state === "open_unpaid"
      ? result.canResume === true && isSafeStripeCheckoutUrl(result.checkoutUrl)
      : result.canResume === false && result.checkoutUrl === null;
  const openUnpaidValid =
    result.state !== "open_unpaid" ||
    (result.gift?.state === "checkout_pending" &&
      result.gift?.paidAt === null &&
      typeof result.expiresAt === "string" &&
      isIsoDate(result.expiresAt) &&
      Date.parse(result.expiresAt) > Date.now());
  const mayStartFromSupport =
    result.state === "support" &&
    result.gift?.state === "canceled" &&
    result.gift?.paidAt === null;
  const startValid = result.canStartNewAttempt
    ? result.state === "expired" || mayStartFromSupport
    : result.state !== "expired";
  const expiredValid =
    result.state !== "expired" ||
    (result.gift?.state === "canceled" && result.gift?.paidAt === null);

  return Boolean(
    stateValid &&
    typeof result.paymentConfirmed === "boolean" &&
    typeof result.canResume === "boolean" &&
    typeof result.canStartNewAttempt === "boolean" &&
    paymentValid &&
    settledAmountValid &&
    resumeValid &&
    openUnpaidValid &&
    startValid &&
    amountValid &&
    currencyValid &&
    expiryValid &&
    giftContractValid &&
    expiredValid
  );
}

function invalidGiftCheckoutReconcileResult(): never {
  throw new Error("The gift checkout status response was invalid.");
}

export async function reconcileGiftCheckout(
  request: GiftCheckoutReconcileRequest
): Promise<GiftCheckoutReconcileResult> {
  const sessionId = request.sessionId?.trim() || "";
  const checkoutAttemptId = request.checkoutAttemptId?.trim() || "";
  if (!sessionId && !checkoutAttemptId) {
    throw new Error("A checkout session or saved attempt is required to check status.");
  }

  const res = await apiRequest("/api/subscription/gifts/checkout/reconcile", {
    method: "POST",
    auth: true,
    cache: "no-store",
    body: {
      ...(sessionId ? { sessionId } : {}),
      ...(checkoutAttemptId ? { checkoutAttemptId } : {})
    }
  });
  const payload = res?.data ?? res;
  const result = payload?.result ?? payload?.reconciliation ?? payload;
  return isGiftCheckoutReconcileResult(result)
    ? result
    : invalidGiftCheckoutReconcileResult();
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
    giftQuoteToken?: string;
  } = { plan: "pro", interval: "monthly" }
) {
  const origin = currentOrigin();
  const successUrl = data.giftMode
    ? ""
    : data.successUrl || (origin ? `${origin}/offers?subscription=success` : "");
  const cancelUrl = data.giftMode
    ? ""
    : data.cancelUrl || (origin ? `${origin}/offers?subscription=canceled` : "");
  const checkoutAttemptId = data.checkoutAttemptId?.trim() || "";
  const giftQuoteToken = data.giftQuoteToken?.trim() || "";
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
    ...(data.giftMode && checkoutAttemptId ? { checkoutAttemptId } : {}),
    ...(data.giftMode && giftQuoteToken ? { giftQuoteToken } : {})
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
