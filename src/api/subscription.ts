import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import apiRoutes from "./routes.js";

const SUBSCRIPTION_PAYMENT_STATES = new Set(["paid", "nonpaid"]);

function checkedSubscriptionResponse(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !SUBSCRIPTION_PAYMENT_STATES.has(
      (value as Record<string, unknown>).paymentState as string
    )
  ) {
    throw new Error("The subscription billing response was invalid.");
  }
  return value as Record<string, any>;
}

export async function getSubscriptionStatus() {
  const res = await apiRequest(endpoints.subscriptionStatus, { method: "GET" });
  return res?.data ?? res;
}

export type RecurringPricePlan = "pro" | "commercial" | "facility";
export type RecurringPriceInterval = "monthly" | "yearly";

export type RecurringPriceTrialTerms = {
  days: number;
  eligibility: "one_per_account";
  paymentMethodRequired: true;
  renewsUnlessCanceled: true;
};

type RecurringPriceQuoteBase = {
  plan: RecurringPricePlan;
  interval: RecurringPriceInterval;
  trialTerms: RecurringPriceTrialTerms;
};

export type AvailableRecurringPriceQuote = RecurringPriceQuoteBase & {
  available: true;
  unitAmount: number;
  currency: string;
  formattedAmount: string;
  verifiedAt: string;
  unavailableReason?: never;
};

export type UnavailableRecurringPriceQuote = RecurringPriceQuoteBase & {
  available: false;
  unitAmount: null;
  currency: null;
  formattedAmount: null;
  verifiedAt: null;
  unavailableReason: string;
};

export type RecurringPriceQuote =
  | AvailableRecurringPriceQuote
  | UnavailableRecurringPriceQuote;

export type RecurringPriceQuotes = Partial<
  Record<RecurringPricePlan, Partial<Record<RecurringPriceInterval, RecurringPriceQuote>>>
>;

export type SubscriptionSetupStatus = Record<string, unknown> & {
  mode?: "live" | "test" | "unknown";
  giftCheckoutConfigured?: boolean;
  catalogReady: boolean;
  quotes: RecurringPriceQuotes;
  trial?: {
    enabled?: boolean;
    days?: number;
  };
};

export const RECURRING_PRICE_PLANS = ["pro", "commercial", "facility"] as const;
export const RECURRING_PRICE_INTERVALS = ["monthly", "yearly"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function isRecurringPriceTrialTerms(value: unknown): value is RecurringPriceTrialTerms {
  if (!isRecord(value)) return false;
  return Boolean(
    Number.isSafeInteger(value.days) &&
    Number(value.days) >= 1 &&
    Number(value.days) <= 365 &&
    value.eligibility === "one_per_account" &&
    value.paymentMethodRequired === true &&
    value.renewsUnlessCanceled === true
  );
}

export function isRecurringPriceQuote(
  value: unknown,
  expectedPlan?: RecurringPricePlan,
  expectedInterval?: RecurringPriceInterval
): value is RecurringPriceQuote {
  if (!isRecord(value)) return false;
  const plan = value.plan;
  const interval = value.interval;
  if (!RECURRING_PRICE_PLANS.includes(plan as RecurringPricePlan)) return false;
  if (!RECURRING_PRICE_INTERVALS.includes(interval as RecurringPriceInterval)) {
    return false;
  }
  if (expectedPlan && plan !== expectedPlan) return false;
  if (expectedInterval && interval !== expectedInterval) return false;
  if (!isRecurringPriceTrialTerms(value.trialTerms)) return false;

  if (value.available === true) {
    return Boolean(
      Number.isSafeInteger(value.unitAmount) &&
      Number(value.unitAmount) > 0 &&
      typeof value.currency === "string" &&
      /^[a-z]{3}$/.test(value.currency) &&
      typeof value.formattedAmount === "string" &&
      value.formattedAmount.length > 0 &&
      value.formattedAmount.length <= 64 &&
      value.formattedAmount.trim() === value.formattedAmount &&
      !hasControlCharacters(value.formattedAmount) &&
      isCanonicalIsoDate(value.verifiedAt) &&
      value.unavailableReason === undefined
    );
  }

  return Boolean(
    value.available === false &&
    value.unitAmount === null &&
    value.currency === null &&
    value.formattedAmount === null &&
    value.verifiedAt === null &&
    typeof value.unavailableReason === "string" &&
    /^[A-Z][A-Z0-9_]{2,127}$/.test(value.unavailableReason)
  );
}

export function parseRecurringPriceQuotes(value: unknown): RecurringPriceQuotes {
  if (!isRecord(value)) return {};
  const quotes: RecurringPriceQuotes = {};

  for (const plan of RECURRING_PRICE_PLANS) {
    const planQuotes = value[plan];
    if (!isRecord(planQuotes)) continue;
    for (const interval of RECURRING_PRICE_INTERVALS) {
      const quote = planQuotes[interval];
      if (!isRecurringPriceQuote(quote, plan, interval)) continue;
      quotes[plan] ||= {};
      quotes[plan]![interval] = quote;
    }
  }

  return quotes;
}

export function getVerifiedRecurringPriceQuote(
  quotes: unknown,
  plan: RecurringPricePlan,
  interval: RecurringPriceInterval
): AvailableRecurringPriceQuote | null {
  if (!isRecord(quotes) || !isRecord(quotes[plan])) return null;
  const quote = (quotes[plan] as Record<string, unknown>)[interval];
  return isRecurringPriceQuote(quote, plan, interval) && quote.available ? quote : null;
}

export function hasCompleteRecurringPriceCatalog(quotes: RecurringPriceQuotes): boolean {
  return RECURRING_PRICE_PLANS.every((plan) =>
    RECURRING_PRICE_INTERVALS.every(
      (interval) => getVerifiedRecurringPriceQuote(quotes, plan, interval) !== null
    )
  );
}

function invalidSubscriptionSetupStatus(): never {
  throw new Error("The subscription setup response was invalid.");
}

export async function getSubscriptionSetupStatus(): Promise<SubscriptionSetupStatus> {
  const res = await apiRequest("/api/subscription/status", {
    method: "GET",
    cache: "no-store"
  });
  const value = res?.data ?? res;
  if (!isRecord(value)) return invalidSubscriptionSetupStatus();
  const quotes = parseRecurringPriceQuotes(value.quotes);
  return {
    ...value,
    catalogReady: value.catalogReady === true && hasCompleteRecurringPriceCatalog(quotes),
    quotes
  } as SubscriptionSetupStatus;
}

export async function getSubscription() {
  const res = await apiRequest("/api/subscription/me", { method: "GET" });
  return checkedSubscriptionResponse(res?.data ?? res);
}

export async function openSubscriptionPortal(): Promise<string> {
  const res = await apiRequest(apiRoutes.SUBSCRIBE.PORTAL, {
    method: "POST",
    body: {}
  });
  const urlValue = String((res?.data ?? res)?.url || "").trim();
  try {
    const url = new URL(urlValue);
    if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com") {
      throw new Error("invalid provider host");
    }
    return url.toString();
  } catch {
    throw new Error("Stripe subscription management returned an invalid link.");
  }
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
export type GiftCheckoutPlan = "pro" | "commercial" | "facility";

export type GiftCheckoutQuote = {
  schemaVersion: "gift_quote_v1";
  version: 1;
  plan: GiftCheckoutPlan;
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
  plan: GiftCheckoutPlan;
  interval: GiftCheckoutInterval;
  checkoutAttemptId: string;
  giftRecipientEmail: string;
  giftRecipientName?: string;
  giftMessage?: string;
  giftOriginType?: "live_chat";
  giftLiveSessionId?: string;
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
    ["pro", "commercial", "facility"].includes(String(quote.plan || "")) &&
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
    plan: request.plan,
    interval: request.interval,
    checkoutAttemptId: request.checkoutAttemptId.trim(),
    giftRecipientEmail: request.giftRecipientEmail.trim().toLowerCase(),
    ...(request.giftRecipientName?.trim()
      ? { giftRecipientName: request.giftRecipientName.trim() }
      : {}),
    ...(request.giftMessage?.trim() ? { giftMessage: request.giftMessage.trim() } : {}),
    ...(request.giftOriginType === "live_chat" && request.giftLiveSessionId?.trim()
      ? {
          giftOriginType: "live_chat",
          giftLiveSessionId: request.giftLiveSessionId.trim().toLowerCase()
        }
      : {})
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
  | "not_created"
  | "support";

export type GiftCheckoutReconcileResult = {
  state: GiftCheckoutReconcileState;
  checkoutAttemptId: string;
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

export type GiftCheckoutRecoveryAttempt = {
  checkoutAttemptId: string;
  checkoutState: "reserved" | "creating" | "creation_unknown" | "open";
  plan: GiftCheckoutPlan;
  interval: GiftCheckoutInterval;
  amountCents: number;
  currency: string;
  expiresAt: string;
  canReconcile: true;
};

export type GiftCheckoutRecoveryStatus =
  | { state: "none"; attempt: null }
  | { state: "support"; attempt: null }
  | { state: "recoverable"; attempt: GiftCheckoutRecoveryAttempt };

const GIFT_CHECKOUT_SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{3,252}$/;
const GIFT_CHECKOUT_ATTEMPT_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === expected.length && actual.every((key) => expected.includes(key))
  );
}

function isGiftCheckoutRecoveryStatus(
  value: unknown
): value is GiftCheckoutRecoveryStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const status = value as Record<string, any>;
  if (!hasExactKeys(status, ["state", "attempt"]) || typeof status.state !== "string") {
    return false;
  }
  if (status.state === "none" || status.state === "support") {
    return status.attempt === null;
  }
  const attempt = status.attempt;
  return Boolean(
    status.state === "recoverable" &&
    attempt &&
    typeof attempt === "object" &&
    !Array.isArray(attempt) &&
    hasExactKeys(attempt, [
      "checkoutAttemptId",
      "checkoutState",
      "plan",
      "interval",
      "amountCents",
      "currency",
      "expiresAt",
      "canReconcile"
    ]) &&
    typeof attempt.checkoutAttemptId === "string" &&
    GIFT_CHECKOUT_ATTEMPT_ID_PATTERN.test(attempt.checkoutAttemptId) &&
    typeof attempt.checkoutState === "string" &&
    ["reserved", "creating", "creation_unknown", "open"].includes(
      attempt.checkoutState
    ) &&
    typeof attempt.plan === "string" &&
    ["pro", "commercial", "facility"].includes(String(attempt.plan || "")) &&
    typeof attempt.interval === "string" &&
    ["monthly", "yearly"].includes(attempt.interval) &&
    Number.isSafeInteger(attempt.amountCents) &&
    attempt.amountCents > 0 &&
    typeof attempt.currency === "string" &&
    /^[a-z]{3}$/.test(attempt.currency) &&
    isIsoDate(attempt.expiresAt) &&
    attempt.canReconcile === true
  );
}

function invalidGiftCheckoutRecoveryStatus(): never {
  throw new Error("The gift checkout recovery response was invalid.");
}

export async function getGiftCheckoutRecovery(): Promise<GiftCheckoutRecoveryStatus> {
  const res = await apiRequest("/api/subscription/gifts/checkout/recovery", {
    method: "GET",
    auth: true,
    cache: "no-store"
  });
  const status = res?.data ?? res;
  return isGiftCheckoutRecoveryStatus(status)
    ? status
    : invalidGiftCheckoutRecoveryStatus();
}

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
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, any>;
  if (
    !hasExactKeys(result, [
      "state",
      "checkoutAttemptId",
      "paymentConfirmed",
      "canResume",
      "canStartNewAttempt",
      "checkoutUrl",
      "amountCents",
      "currency",
      "expiresAt",
      "gift"
    ])
  ) {
    return false;
  }
  const amountValid =
    result.amountCents === null ||
    (Number.isSafeInteger(result.amountCents) && result.amountCents > 0);
  const currencyValid =
    result.currency === null ||
    (typeof result.currency === "string" && /^[a-z]{3}$/.test(result.currency));
  const expiryValid = result.expiresAt === null || isIsoDate(result.expiresAt);
  const giftValid = isSentGift(result.gift);
  const giftContractValid =
    giftValid &&
    ["pro", "commercial", "facility"].includes(String(result.gift.plan || "")) &&
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
    "not_created",
    "support"
  ];
  const stateValid =
    typeof result.state === "string" && states.includes(result.state as any);
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
  const notCreatedValid =
    result.state !== "not_created" ||
    (result.gift?.state === "canceled" && result.gift?.paidAt === null);
  const shouldAllowNewAttempt =
    result.state === "settled" ||
    result.state === "expired" ||
    result.state === "not_created";
  const startValid = result.canStartNewAttempt === shouldAllowNewAttempt;
  const expiredValid =
    result.state !== "expired" ||
    (result.gift?.state === "canceled" && result.gift?.paidAt === null);

  return Boolean(
    stateValid &&
    typeof result.checkoutAttemptId === "string" &&
    GIFT_CHECKOUT_ATTEMPT_ID_PATTERN.test(result.checkoutAttemptId) &&
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
    expiredValid &&
    notCreatedValid
  );
}

function invalidGiftCheckoutReconcileResult(): never {
  throw new Error("The gift checkout status response was invalid.");
}

export async function reconcileGiftCheckout(
  request: GiftCheckoutReconcileRequest
): Promise<GiftCheckoutReconcileResult> {
  const selectorKeys = Object.keys(request);
  const sessionId = request.sessionId?.trim() || "";
  const checkoutAttemptId = request.checkoutAttemptId?.trim() || "";
  const selectorCount = Number(Boolean(sessionId)) + Number(Boolean(checkoutAttemptId));
  if (
    selectorKeys.length !== 1 ||
    !selectorKeys.every((key) => key === "sessionId" || key === "checkoutAttemptId") ||
    selectorCount !== 1 ||
    (sessionId && !GIFT_CHECKOUT_SESSION_ID_PATTERN.test(sessionId)) ||
    (checkoutAttemptId && !GIFT_CHECKOUT_ATTEMPT_ID_PATTERN.test(checkoutAttemptId))
  ) {
    throw new Error("Exactly one valid gift checkout identity is required.");
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
  if (
    !isGiftCheckoutReconcileResult(result) ||
    (checkoutAttemptId && result.checkoutAttemptId !== checkoutAttemptId)
  ) {
    return invalidGiftCheckoutReconcileResult();
  }
  return result;
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
    giftOriginType?: "live_chat";
    giftLiveSessionId?: string;
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
    ...(data.giftMode && giftQuoteToken ? { giftQuoteToken } : {}),
    ...(data.giftMode &&
    data.giftOriginType === "live_chat" &&
    data.giftLiveSessionId?.trim()
      ? {
          giftOriginType: "live_chat",
          giftLiveSessionId: data.giftLiveSessionId.trim().toLowerCase()
        }
      : {})
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
