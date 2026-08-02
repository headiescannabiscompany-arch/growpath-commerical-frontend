import { isSafeStripeCheckoutUrl } from "@/api/subscription";

export type GiftCheckoutCreateResult = {
  url: string;
  sessionId: string;
  trialDays: 0;
  giftId: string;
  checkoutAttemptId: string;
  amountCents: number;
  currency: string;
  expiresAt: string;
};

export type ExpectedGiftCheckoutCreateResult = {
  checkoutAttemptId: string;
  amountCents: number;
  currency: string;
};

const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{3,252}$/;
const CHECKOUT_ATTEMPT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GIFT_ID_PATTERN = /^[0-9a-f]{24}$/i;

function isFutureCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    timestamp > Date.now() &&
    new Date(timestamp).toISOString() === value
  );
}

function invalidGiftCheckoutCreateResult(): never {
  throw new Error(
    "The gift checkout response did not match the reviewed attempt. Check its saved status before trying again."
  );
}

export function requireMatchingGiftCheckoutCreateResult(
  value: unknown,
  expected: ExpectedGiftCheckoutCreateResult
): GiftCheckoutCreateResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invalidGiftCheckoutCreateResult();
  }
  const result = value as Record<string, unknown>;
  const sessionId = typeof result.sessionId === "string" ? result.sessionId : "";
  const url = typeof result.url === "string" ? result.url : "";
  const expectedCurrency = expected.currency.trim().toLowerCase();
  let exactSessionPath = false;
  try {
    exactSessionPath = new URL(url).pathname === `/c/pay/${sessionId}`;
  } catch {
    exactSessionPath = false;
  }

  if (
    !CHECKOUT_ATTEMPT_ID_PATTERN.test(expected.checkoutAttemptId) ||
    result.checkoutAttemptId !== expected.checkoutAttemptId ||
    !SESSION_ID_PATTERN.test(sessionId) ||
    !isSafeStripeCheckoutUrl(url) ||
    !exactSessionPath ||
    result.trialDays !== 0 ||
    typeof result.giftId !== "string" ||
    !GIFT_ID_PATTERN.test(result.giftId) ||
    !Number.isSafeInteger(result.amountCents) ||
    Number(result.amountCents) <= 0 ||
    result.amountCents !== expected.amountCents ||
    typeof result.currency !== "string" ||
    !/^[a-z]{3}$/.test(result.currency) ||
    result.currency !== expectedCurrency ||
    !isFutureCanonicalIsoDate(result.expiresAt)
  ) {
    return invalidGiftCheckoutCreateResult();
  }

  return {
    url,
    sessionId,
    trialDays: 0,
    giftId: result.giftId,
    checkoutAttemptId: result.checkoutAttemptId,
    amountCents: result.amountCents,
    currency: result.currency,
    expiresAt: result.expiresAt
  };
}
