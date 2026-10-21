/** Presentation contracts only. No HTTP adapter, entitlement writer or public gate.
 * Future adapters must supply fresh server-authorized snapshots, not route params.
 * These types and UI checks are not authorization to purchase or enroll.
 */
export type GiftTerms = {
  version: string;
  expiry: string;
  duplicateAccess: string;
  courseUnavailable: string;
  refund?: string; // Required by the new server-reviewed sale binding.
};

export type GiftQuote = {
  courseId: string;
  title: string;
  amountCents: number;
  currency: "usd";
  checkoutAttemptId: string;
  terms: GiftTerms;
  sellerDisclosure?: GiftSellerDisclosure | null;
};

// Self-published name only; not verified legal identity or payment authority.
export type GiftSellerDisclosure = {
  source: "published_creator_profile";
  displayName: string;
};
export function validGiftSellerDisclosure(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    Object.keys(v).length === 2 &&
    Object.hasOwn(v, "source") &&
    Object.hasOwn(v, "displayName") &&
    v.source === "published_creator_profile" &&
    typeof v.displayName === "string" &&
    v.displayName.length > 0 &&
    v.displayName.length <= 80 &&
    v.displayName === v.displayName.trim() &&
    !/[\u0000-\u001f\u007f-\u009f]/.test(v.displayName)
  );
}

export type GiftCheckoutRequest = {
  courseId: string;
  checkoutAttemptId: string;
  recipientEmail: string;
  policyVersion: string;
};

// Mirrors the internal buyerStatus DTO. This does not contain learner progress,
// delivery acknowledgment, recipient enrollment or a seller's payout balance.
export type GiftBuyerStatus = {
  giftId: string;
  checkoutAttemptId: string;
  checkoutStatus: string;
  paymentRecorded: boolean;
  recoveryRequired: boolean;
};

export type GiftClaimResult = {
  action: "claimed";
  giftId: string;
  courseId: string;
  enrollmentId: string;
};

export type GiftRecipientState = {
  giftId: string;
  courseId: string;
  courseTitle: string;
  recipient: string; // Masked preview only; never the complete email or claim token.
  claimExpiresAt: string;
  // With this explicit policy, claimExpiresAt is a security-link deadline only.
  claimExpiryMode?: "none";
  inactivityFeeCents?: 0;
  code: string;
};

export function normalizedGiftEmail(value: string): string {
  const email = value.trim().toLowerCase();
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function usableGiftQuote(quote: GiftQuote | null): quote is GiftQuote {
  return Boolean(
    quote &&
    text(quote.courseId) &&
    text(quote.title) &&
    text(quote.checkoutAttemptId) &&
    Number.isSafeInteger(quote.amountCents) &&
    quote.amountCents > 0 &&
    quote.currency === "usd" &&
    validGiftSellerDisclosure(quote.sellerDisclosure) &&
    quote.terms &&
    [
      quote.terms.version,
      quote.terms.expiry,
      quote.terms.duplicateAccess,
      quote.terms.courseUnavailable
    ].every(text)
  );
}

export function boundBuyerStatus(value: GiftBuyerStatus, attemptId: string): boolean {
  return Boolean(
    value &&
    text(value.giftId) &&
    value.checkoutAttemptId === attemptId &&
    text(value.checkoutStatus) &&
    typeof value.paymentRecorded === "boolean" &&
    typeof value.recoveryRequired === "boolean"
  );
}

export function buyerGiftMessage(status: GiftBuyerStatus): string {
  if (status.recoveryRequired)
    return "This checkout needs review. Do not start another payment.";
  if (status.paymentRecorded) {
    return "A payment record exists. This does not confirm email delivery or current recipient access. It does not enroll you.";
  }
  // A return, canceled browser, failed read or open session is not payment truth.
  return "Payment is not confirmed here. Check this same attempt before trying another payment.";
}

export function recipientGiftMessage(code: string): string {
  switch (code) {
    case "SIGNED_OUT":
      return "Sign in with the email address that received this gift. Signing in does not claim it.";
    case "COURSE_GIFT_EMAIL_VERIFICATION_REQUIRED":
      return "Verify the recipient email address, then check this gift again.";
    case "COURSE_GIFT_RECIPIENT_MISMATCH":
      return "This account does not match the recipient. No account has been changed.";
    case "COURSE_GIFT_TRANSACTION_REQUIRED":
      return "Choose Claim course gift to request access. Your subscription, AI credits, and access to other features stay unchanged.";
    case "COURSE_GIFT_LINK_RENEWAL_REQUIRED":
      return "This security link has expired, not the gift. You can request a replacement invitation for the same recipient. This does not claim the course.";
    case "COURSE_GIFT_ALREADY_CLAIMED":
      return "This gift was already claimed. Current course access is checked separately when you open the course.";
    case "COURSE_GIFT_ACCESS_REVIEW_REQUIRED":
      return "Your existing access needs review. This check does not replace it or promise a refund.";
    case "COURSE_GIFT_PAYMENT_BLOCKED":
    case "COURSE_GIFT_PAYMENT_BINDING_REQUIRED":
      return "Payment or access needs review. This gift cannot be claimed now.";
    case "COURSE_GIFT_SELF_PURCHASE":
      return "The buyer and course author cannot claim this gift.";
    default:
      return "This gift cannot be claimed now. Check the original invitation or contact support.";
  }
}

export function maskedGiftRecipient(value: unknown): string {
  return typeof value === "string" && /^[^\s@]\*{3}@[^\s@]+$/.test(value)
    ? value
    : "Recipient hidden";
}

export function giftClaimDeadline(value: string): number {
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
    ? timestamp
    : NaN;
}

export function giftClaimTiming(state: GiftRecipientState): string {
  return state.claimExpiryMode === "none" && state.inactivityFeeCents === 0
    ? `This gift has no automatic claim expiry or inactivity fees. Security links expire separately; an expired link does not cancel the gift. Security link expires (UTC): ${state.claimExpiresAt}. Contact support@growpathai.com for manual review.`
    : `Claim by (UTC): ${state.claimExpiresAt}`;
}

export function boundClaimResult(
  value: GiftClaimResult,
  state: GiftRecipientState
): boolean {
  return Boolean(
    value &&
    value.action === "claimed" &&
    value.giftId === state.giftId &&
    value.courseId === state.courseId &&
    text(value.enrollmentId)
  );
}
