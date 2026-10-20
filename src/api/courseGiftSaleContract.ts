import {
  normalizedGiftEmail,
  type GiftQuote
} from "@/components/courseGifts/courseGiftPresentation";

export const giftObjectId = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{24}$/.test(v);
export const giftUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const ref = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/.test(v);
const hash = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const text = (v: unknown, max = 10000): v is string =>
  typeof v === "string" && Boolean(v.trim()) && v.length <= max;
export const SALE_PATHS = {
  creatorReview: "/api/course-gifts/creator/review",
  creatorAccept: "/api/course-gifts/creator/accept",
  creatorRevoke: "/api/course-gifts/creator/revoke",
  buyerReview: "/api/course-gifts/buyer/review",
  buyerReserve: "/api/course-gifts/buyer/reserve",
  buyerCheckout: "/api/course-gifts/buyer/checkout"
} as const;
export type SaleOperation = keyof typeof SALE_PATHS;
export type GiftWireBody = Record<string, string | boolean | null>;
const buyer = {
  courseId: giftObjectId,
  checkoutAttemptId: giftUuid,
  recipientEmail: (v: unknown) =>
    typeof v === "string" && Boolean(v) && normalizedGiftEmail(v) === v
};
const rules: Record<SaleOperation, Record<string, (value: unknown) => boolean>> = {
  creatorReview: { courseId: giftObjectId },
  creatorAccept: {
    courseId: giftObjectId,
    requestId: giftUuid,
    policyReference: ref,
    policyFingerprint: hash,
    expectedConsentRef: (v) => v === null || ref(v),
    accepted: (v) => v === true
  },
  creatorRevoke: { courseId: giftObjectId, reference: ref, confirmed: (v) => v === true },
  buyerReview: buyer,
  buyerReserve: {
    ...buyer,
    reviewFingerprint: hash,
    policyVersion: ref,
    accepted: (v) => v === true
  },
  buyerCheckout: { giftId: giftObjectId }
};
export function validGiftSaleBody(operation: SaleOperation, body: GiftWireBody) {
  if (!Object.hasOwn(rules, operation)) return false;
  const checks = rules[operation];
  return Boolean(
    checks &&
    body &&
    Object.getPrototypeOf(body) === Object.prototype &&
    Object.keys(body).length === Object.keys(checks).length &&
    Object.entries(checks).every(
      ([key, check]) => Object.hasOwn(body, key) && check(body[key])
    )
  );
}
export type GiftSaleQuote = GiftQuote & {
  version: "course-gift-sale-review-v1";
  recipientEmail: string;
  reviewFingerprint: string;
  terms: GiftQuote["terms"] & { refund: string };
};
export type CreatorConsent = {
  reference: string;
  revision: number;
  enabled: boolean;
  revokedAt: string | null;
  replayed: boolean;
};
export type CreatorGiftReview = {
  courseId: string;
  policy: {
    reference: string;
    fingerprint: string;
    version: string;
    creatorTermsText: string;
  } | null;
  consent: CreatorConsent | null;
  canAccept: boolean;
  matchesPolicy: boolean;
};
export function validGiftSaleQuote(
  v: any,
  courseId: string,
  attempt: string,
  email: string
): v is GiftSaleQuote {
  return Boolean(
    v &&
    v.version === "course-gift-sale-review-v1" &&
    v.courseId === courseId &&
    v.checkoutAttemptId === attempt &&
    v.recipientEmail === email &&
    hash(v.reviewFingerprint) &&
    text(v.title, 300) &&
    Number.isSafeInteger(v.amountCents) &&
    v.amountCents > 0 &&
    v.currency === "usd" &&
    ref(v.terms?.version) &&
    [
      v.terms?.expiry,
      v.terms?.duplicateAccess,
      v.terms?.courseUnavailable,
      v.terms?.refund
    ].every((s) => text(s))
  );
}
export function validCreatorConsent(v: any): v is CreatorConsent {
  return Boolean(
    v &&
    ref(v.reference) &&
    Number.isSafeInteger(v.revision) &&
    v.revision > 0 &&
    typeof v.enabled === "boolean" &&
    typeof v.replayed === "boolean" &&
    (v.revokedAt === null ||
      (typeof v.revokedAt === "string" &&
        Number.isFinite(Date.parse(v.revokedAt)) &&
        new Date(v.revokedAt).toISOString() === v.revokedAt)) &&
    (!v.enabled || v.revokedAt === null)
  );
}
export function validCreatorReview(v: any, courseId: string): v is CreatorGiftReview {
  return Boolean(
    v &&
    v.courseId === courseId &&
    typeof v.canAccept === "boolean" &&
    typeof v.matchesPolicy === "boolean" &&
    (v.consent === null || validCreatorConsent(v.consent)) &&
    (v.policy === null ||
      (ref(v.policy?.reference) &&
        hash(v.policy?.fingerprint) &&
        ref(v.policy?.version) &&
        text(v.policy?.creatorTermsText))) &&
    (!v.canAccept || v.policy) &&
    (!v.matchesPolicy || (v.policy && v.consent?.enabled))
  );
}
export function safeGiftCheckoutUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 4096 || value !== value.trim())
    return "";
  try {
    const url = new URL(value);
    return url.origin === "https://checkout.stripe.com" &&
      !url.username &&
      !url.password &&
      url.pathname.startsWith("/c/pay/")
      ? url.href
      : "";
  } catch {
    return "";
  }
}
