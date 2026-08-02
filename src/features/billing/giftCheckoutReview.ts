import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createCheckoutSession,
  createGiftCheckoutQuote,
  type GiftCheckoutInterval,
  type GiftCheckoutQuote
} from "@/api/subscription";
import {
  canonicalizeGiftCheckoutFingerprint,
  downgradeGiftCheckoutToQuoteOnly,
  getStoredGiftCheckoutAttempt,
  markGiftCheckoutRequested,
  prepareGiftCheckoutQuoteAttempt,
  type GiftCheckoutFingerprintInput
} from "@/features/billing/giftCheckoutAttempt";
import { requireMatchingGiftCheckoutCreateResult } from "@/features/billing/giftCheckoutCreateResult";

export type GiftCheckoutReviewMaterial = GiftCheckoutFingerprintInput & {
  plan: "pro";
  interval: GiftCheckoutInterval;
  recipientEmail: string;
};

export type GiftCheckoutReviewFeedback = (
  tone: "info" | "success" | "error",
  message: string
) => void;

type GiftCheckoutReview = {
  quote: GiftCheckoutQuote;
  checkoutAttemptId: string;
  fingerprint: string;
};

type UseGiftCheckoutReviewOptions = {
  material: GiftCheckoutReviewMaterial;
  onFeedback: GiftCheckoutReviewFeedback;
  openCheckoutUrl: (url: string) => Promise<void>;
};

const DEFINITELY_UNCREATED_QUOTE_CODES = new Set([
  "UNAUTHENTICATED",
  "ACCOUNT_BANNED",
  "ACCOUNT_SUSPENDED",
  "GIFT_QUOTE_EXPIRED",
  "GIFT_QUOTE_CHANGED",
  "GIFT_QUOTE_INVALID",
  "GIFT_SUBSCRIPTION_NOT_CONFIGURED",
  "GIFT_PRICE_LOOKUP_FAILED",
  "GIFT_PRICE_LOOKUP_NOT_CONFIGURED",
  "GIFT_PRICE_INVALID",
  "MISSING_STRIPE_PRICE",
  "PAYMENT_PROVIDER_NOT_CONFIGURED",
  "TEST_ACCOUNT_PLAN_LOCKED",
  "INVALID_GIFT_RECIPIENT",
  "GIFT_RECIPIENT_IS_PURCHASER",
  "GIFT_PLAN_NOT_SUPPORTED",
  "GIFT_PURCHASER_EMAIL_INVALID",
  "GIFT_QUOTE_NOT_CONFIGURED",
  "UNTRUSTED_CHECKOUT_RETURN_URL"
]);

export function isDefinitelyUncreatedGiftCheckoutError(error: unknown): boolean {
  return DEFINITELY_UNCREATED_QUOTE_CODES.has(String((error as any)?.code || ""));
}

function errorMessage(error: unknown, fallback: string): string {
  return String((error as any)?.message || fallback);
}

export function formatGiftCheckoutAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase()
    }).format(amountCents / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amountCents / 100).toFixed(2)}`;
  }
}

export function useGiftCheckoutReview({
  material,
  onFeedback,
  openCheckoutUrl
}: UseGiftCheckoutReviewOptions) {
  const fingerprint = useMemo(
    () => canonicalizeGiftCheckoutFingerprint(material),
    [material]
  );
  const latestFingerprintRef = useRef(fingerprint);
  latestFingerprintRef.current = fingerprint;
  const feedbackRef = useRef(onFeedback);
  feedbackRef.current = onFeedback;
  const openCheckoutUrlRef = useRef(openCheckoutUrl);
  openCheckoutUrlRef.current = openCheckoutUrl;
  const inFlightRef = useRef(false);
  const reviewRef = useRef<GiftCheckoutReview | null>(null);
  const [review, setReview] = useState<GiftCheckoutReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsReconciliation, setNeedsReconciliation] = useState(false);

  const replaceReview = useCallback((next: GiftCheckoutReview | null) => {
    reviewRef.current = next;
    setReview(next);
  }, []);

  useEffect(() => {
    let mounted = true;
    getStoredGiftCheckoutAttempt()
      .then((attempt) => {
        if (mounted && attempt?.phase === "checkout_requested") {
          setNeedsReconciliation(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setNeedsReconciliation(true);
          feedbackRef.current(
            "error",
            "Secure checkout retry storage could not be verified. Check Gifts you sent before another checkout."
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const current = reviewRef.current;
    if (current && current.fingerprint !== fingerprint) {
      replaceReview(null);
    }
  }, [fingerprint, replaceReview]);

  const requestQuote = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    if (needsReconciliation) {
      feedbackRef.current(
        "error",
        "Check the saved gift checkout before requesting another price."
      );
      return false;
    }
    inFlightRef.current = true;
    setBusy(true);
    const requestedFingerprint = canonicalizeGiftCheckoutFingerprint(material);
    try {
      const attempt = await prepareGiftCheckoutQuoteAttempt(material);
      const quote = await createGiftCheckoutQuote({
        plan: "pro",
        interval: material.interval,
        checkoutAttemptId: attempt.checkoutAttemptId,
        giftRecipientEmail: material.recipientEmail,
        ...(material.recipientName?.trim()
          ? { giftRecipientName: material.recipientName }
          : {}),
        ...(material.message?.trim() ? { giftMessage: material.message } : {})
      });
      if (latestFingerprintRef.current !== requestedFingerprint) {
        feedbackRef.current(
          "info",
          "Gift details changed while the price was loading. Review the current details again."
        );
        return false;
      }
      replaceReview({
        quote,
        checkoutAttemptId: attempt.checkoutAttemptId,
        fingerprint: requestedFingerprint
      });
      setNeedsReconciliation(false);
      feedbackRef.current(
        "info",
        `Review the server-confirmed ${formatGiftCheckoutAmount(
          quote.amountCents,
          quote.currency
        )} total, then confirm only when you are ready to open Stripe.`
      );
      return true;
    } catch (error) {
      replaceReview(null);
      if (
        String((error as any)?.code || "") === "GIFT_CHECKOUT_ATTEMPT_RECONCILE_REQUIRED"
      ) {
        setNeedsReconciliation(true);
      }
      feedbackRef.current(
        "error",
        errorMessage(error, "Unable to load the authoritative gift price.")
      );
      return false;
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, [material, needsReconciliation, replaceReview]);

  const confirmAndContinue = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    if (needsReconciliation) {
      feedbackRef.current(
        "error",
        "Check the saved gift checkout before trying to continue."
      );
      return false;
    }
    const current = reviewRef.current;
    const currentFingerprint = canonicalizeGiftCheckoutFingerprint(material);
    if (!current || current.fingerprint !== currentFingerprint) {
      replaceReview(null);
      feedbackRef.current(
        "error",
        "Gift details changed. Review the current server price before continuing."
      );
      return false;
    }
    if (Date.parse(current.quote.expiresAt) <= Date.now()) {
      replaceReview(null);
      feedbackRef.current(
        "error",
        "This gift price expired. Review the current server price before continuing."
      );
      return false;
    }

    inFlightRef.current = true;
    setBusy(true);
    let definitelyUncreated = false;
    try {
      await markGiftCheckoutRequested(material, current.checkoutAttemptId);
      replaceReview(null);
      setNeedsReconciliation(true);
      let response: Awaited<ReturnType<typeof createCheckoutSession>>;
      try {
        response = await createCheckoutSession({
          plan: "pro",
          interval: material.interval,
          giftMode: true,
          giftRecipientEmail: material.recipientEmail.trim().toLowerCase(),
          ...(material.recipientName?.trim()
            ? { giftRecipientName: material.recipientName.trim() }
            : {}),
          ...(material.message?.trim() ? { giftMessage: material.message.trim() } : {}),
          checkoutAttemptId: current.checkoutAttemptId,
          giftQuoteToken: current.quote.confirmationToken
        });
      } catch (error) {
        if (isDefinitelyUncreatedGiftCheckoutError(error)) {
          try {
            await downgradeGiftCheckoutToQuoteOnly(material, current.checkoutAttemptId);
            replaceReview(null);
            definitelyUncreated = true;
          } catch {
            // Keep checkout_requested when the exact downgrade cannot be verified.
          }
        }
        throw error;
      }
      const createdCheckout = requireMatchingGiftCheckoutCreateResult(response, {
        checkoutAttemptId: current.checkoutAttemptId,
        amountCents: current.quote.amountCents,
        currency: current.quote.currency
      });
      await openCheckoutUrlRef.current(createdCheckout.url);
      feedbackRef.current(
        "info",
        "Stripe gift checkout opened. Returning to GrowPath will verify the payment with the server."
      );
      return true;
    } catch (error) {
      setNeedsReconciliation(!definitelyUncreated);
      feedbackRef.current(
        "error",
        errorMessage(
          error,
          "Unable to open gift checkout. Its saved attempt must be reconciled before another one starts."
        )
      );
      return false;
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, [material, needsReconciliation, replaceReview]);

  return {
    quote: review?.fingerprint === fingerprint ? review.quote : null,
    busy,
    needsReconciliation,
    requestQuote,
    confirmAndContinue
  };
}
