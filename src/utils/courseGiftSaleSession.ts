import {
  createInternalCourseGiftClient,
  CourseGiftClientError
} from "@/api/courseGiftClient";
import {
  giftObjectId,
  giftUuid,
  safeGiftCheckoutUrl,
  validCreatorConsent,
  validCreatorReview,
  validGiftSaleQuote,
  type CreatorGiftReview,
  type GiftSaleQuote
} from "@/api/courseGiftSaleContract";
import {
  boundBuyerStatus,
  normalizedGiftEmail,
  type GiftBuyerStatus,
  type GiftCheckoutRequest
} from "@/components/courseGifts/courseGiftPresentation";
import { sameGiftRecovery, type GiftSaleRecovery } from "./courseGiftSaleRecovery";

type Client = ReturnType<typeof createInternalCourseGiftClient>;
function fail(): never {
  throw new CourseGiftClientError("COURSE_GIFT_REQUEST_UNKNOWN");
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const consentView = (v: NonNullable<CreatorGiftReview["consent"]>) => ({
  reference: v.reference,
  revision: v.revision,
  enabled: v.enabled,
  revokedAt: v.revokedAt,
  replayed: v.replayed
});

/** Internal web binding, never installed by a public course route. A single
 * course/session/attempt owns this object; it stores no email, terms or URL in
 * browser storage. All provider/consent authority stays with the existing server.
 */
export function createInternalCourseGiftSaleSession({
  client,
  courseId,
  attemptId,
  newRequestId
}: {
  client: Client;
  courseId: string;
  attemptId: string;
  newRequestId: () => string;
}) {
  if (!giftObjectId(courseId) || !giftUuid(attemptId)) fail();
  const scope = client.currentScope();
  const recoveredBuyer = client.recoverSale(courseId, "buyer");
  const recoveredCreator = client.recoverSale(courseId, "creator");
  let buyerHint = recoveredBuyer.value?.kind === "buyer" ? recoveredBuyer.value : null;
  let creatorHint =
    recoveredCreator.value?.kind === "creator" ? recoveredCreator.value : null;
  // A host-provided fresh ID must never replace this course's unresolved attempt.
  if (buyerHint) attemptId = buyerHint.attemptId;
  let buyerBlocked = recoveredBuyer.state === "blocked";
  let creatorBlocked = recoveredCreator.state === "blocked";
  let statusChecked = false,
    retryReviewed = false;
  let disposed = false,
    busy = false,
    reserved = Boolean(buyerHint) || buyerBlocked;
  let creator: CreatorGiftReview | null = null,
    quote: GiftSaleQuote | null = null;
  let buyer: GiftBuyerStatus | null = null,
    requestId = "",
    consentMaterial = "";
  let giftId = buyerHint?.giftId || "",
    reloadSaved = recoveredBuyer.state === "ready" || recoveredCreator.state === "ready";
  function current() {
    if (disposed || client.currentScope() !== scope) fail();
  }
  function checkRecoveryWrite(hint: GiftSaleRecovery) {
    const latest = client.recoverSale(courseId, hint.kind);
    if (
      latest.state === "blocked" ||
      (latest.value && !sameGiftRecovery(latest.value, hint))
    ) {
      if (hint.kind === "buyer") buyerBlocked = true;
      else creatorBlocked = true;
      fail();
    }
  }
  async function run<T>(work: () => Promise<T>): Promise<T> {
    current();
    if (busy) fail();
    busy = true;
    try {
      const result = await work();
      current();
      return result;
    } finally {
      busy = false;
    }
  }
  function status(value: any) {
    if (
      !boundBuyerStatus(value, attemptId) ||
      !giftObjectId(value.giftId) ||
      ![
        "reserved",
        "creating",
        "creation_unknown",
        "open",
        "completed",
        "expired",
        "failed"
      ].includes(value.checkoutStatus) ||
      (giftId && value.giftId !== giftId)
    )
      fail();
    giftId = value.giftId;
    if (buyerHint) {
      buyerHint = { ...buyerHint, giftId };
      // Reading status must not renew an expired hint or silently replace it.
      if (!buyerBlocked) reloadSaved = client.rememberSale(buyerHint);
    }
    buyer = {
      giftId,
      checkoutAttemptId: attemptId,
      checkoutStatus: value.checkoutStatus,
      paymentRecorded: value.paymentRecorded,
      recoveryRequired: value.recoveryRequired
    };
    return copy(buyer);
  }
  return Object.freeze({
    scope,
    courseId,
    attemptId,
    reviewCreator: () =>
      run(async () => {
        creator = null;
        const result = await client.requestSale("creatorReview", { courseId });
        current();
        if (!validCreatorReview(result, courseId)) fail();
        const material = JSON.stringify([
          result.policy,
          result.consent?.reference || null
        ]);
        if (!creatorHint && material !== consentMaterial) {
          requestId = "";
          consentMaterial = material;
        }
        creator = {
          courseId,
          policy: result.policy
            ? {
                reference: result.policy.reference,
                fingerprint: result.policy.fingerprint,
                version: result.policy.version,
                creatorTermsText: result.policy.creatorTermsText
              }
            : null,
          consent: result.consent ? consentView(result.consent) : null,
          canAccept:
            result.canAccept &&
            !creatorBlocked &&
            (!creatorHint ||
              (creatorHint.policyReference === result.policy?.reference &&
                creatorHint.policyFingerprint === result.policy?.fingerprint)),
          matchesPolicy: result.matchesPolicy
        };
        return copy(creator);
      }),
    acceptCreator: (accepted: boolean) =>
      run(async () => {
        if (accepted !== true || !creator?.canAccept || !creator.policy) fail();
        const approved = creator;
        creator = null; // Any uncertain save requires a fresh explicit read.
        if (creatorBlocked) fail();
        if (creatorHint) requestId = creatorHint.requestId;
        if (!requestId) requestId = newRequestId();
        if (!giftUuid(requestId)) fail();
        if (!creatorHint)
          creatorHint = {
            kind: "creator",
            courseId,
            requestId,
            policyReference: approved.policy!.reference,
            policyFingerprint: approved.policy!.fingerprint,
            expectedConsentRef: approved.consent?.reference || null
          };
        checkRecoveryWrite(creatorHint);
        reloadSaved = client.rememberSale(creatorHint);
        const result = await client.requestSale("creatorAccept", {
          courseId,
          requestId,
          policyReference: creatorHint.policyReference,
          policyFingerprint: creatorHint.policyFingerprint,
          expectedConsentRef: creatorHint.expectedConsentRef,
          accepted: true
        });
        current();
        if (!validCreatorConsent(result)) fail();
        creatorBlocked = !client.clearCreatorRecovery(courseId, requestId);
        creatorHint = null;
        requestId = "";
        consentMaterial = "";
        return consentView(result);
      }),
    revokeCreator: (confirmed: boolean) =>
      run(async () => {
        if (
          confirmed !== true ||
          !creator?.consent?.enabled ||
          creatorHint ||
          creatorBlocked
        )
          fail();
        const reference = creator.consent.reference;
        creator = null;
        const result = await client.requestSale("creatorRevoke", {
          courseId,
          reference,
          confirmed: true
        });
        current();
        if (
          !validCreatorConsent(result) ||
          result.reference !== reference ||
          result.enabled
        )
          fail();
        return consentView(result);
      }),
    reviewBuyer: (email: string) =>
      run(async () => {
        retryReviewed = false;
        if (reserved && (buyerBlocked || !buyerHint || giftId || !statusChecked)) fail();
        quote = null;
        const recipientEmail = normalizedGiftEmail(email);
        if (!recipientEmail) fail();
        const result = await client.requestSale("buyerReview", {
          courseId,
          checkoutAttemptId: attemptId,
          recipientEmail
        });
        current();
        if (!validGiftSaleQuote(result, courseId, attemptId, recipientEmail)) fail();
        if (buyerHint && result.reviewFingerprint !== buyerHint.fingerprint) fail();
        quote = {
          version: result.version,
          courseId,
          checkoutAttemptId: attemptId,
          recipientEmail,
          title: result.title,
          amountCents: result.amountCents,
          currency: result.currency,
          reviewFingerprint: result.reviewFingerprint,
          sellerDisclosure: result.sellerDisclosure
            ? {
                source: result.sellerDisclosure.source,
                displayName: result.sellerDisclosure.displayName
              }
            : null,
          terms: {
            version: result.terms.version,
            expiry: result.terms.expiry,
            duplicateAccess: result.terms.duplicateAccess,
            courseUnavailable: result.terms.courseUnavailable,
            refund: result.terms.refund
          }
        };
        retryReviewed = reserved;
        return copy(quote);
      }),
    reserveBuyer: (request: GiftCheckoutRequest) =>
      run(async () => {
        if (
          (reserved && !retryReviewed) ||
          buyerBlocked ||
          !quote ||
          request.courseId !== courseId ||
          request.checkoutAttemptId !== attemptId ||
          request.recipientEmail !== quote.recipientEmail ||
          request.policyVersion !== quote.terms.version
        )
          fail();
        reserved = true; // Set before write; lost response never makes a new attempt.
        retryReviewed = false;
        statusChecked = false;
        buyerHint = buyerHint || {
          kind: "buyer",
          courseId,
          attemptId,
          fingerprint: quote.reviewFingerprint,
          giftId: null
        };
        checkRecoveryWrite(buyerHint);
        client.rememberBuyerAttempt(attemptId);
        reloadSaved = client.rememberSale(buyerHint);
        const approved = quote;
        quote = null; // Every retry needs a new read and unchecked confirmation.
        const result = await client.requestSale("buyerReserve", {
          courseId,
          checkoutAttemptId: attemptId,
          recipientEmail: approved.recipientEmail,
          reviewFingerprint: approved.reviewFingerprint,
          policyVersion: approved.terms.version,
          accepted: true
        });
        current();
        return status(result);
      }),
    readBuyerStatus: () =>
      run(async () => {
        if (!reserved) fail();
        buyer = null;
        quote = null;
        retryReviewed = false;
        statusChecked = true;
        // Seed the existing transport's response binding with the reserved gift;
        // a mismatched first status must not poison later same-attempt recovery.
        const result = await client.readBuyerStatus(attemptId, giftId || undefined);
        current();
        return status(result);
      }),
    openCheckout: () =>
      run(async () => {
        if (
          !reserved ||
          !buyer ||
          buyer.paymentRecorded ||
          !["reserved", "open", "creation_unknown"].includes(buyer.checkoutStatus)
        )
          fail();
        const expectedGift = giftId;
        buyer = null; // Lost create/return: explicit status read before recovery.
        const result: any = await client.requestSale("buyerCheckout", {
          giftId: expectedGift
        });
        current();
        const url = safeGiftCheckoutUrl(result?.url);
        if (
          result?.giftId !== expectedGift ||
          result?.checkoutAttemptId !== attemptId ||
          result?.checkoutStatus !== "open" ||
          !url
        )
          fail();
        return url; // UI must still be mounted/current before navigating.
      }),
    reloadSaved: () => reloadSaved,
    recovery: () => {
      current();
      return Object.freeze({
        buyerPending: reserved,
        buyerBlocked,
        canReviewRetry:
          reserved && !buyerBlocked && Boolean(buyerHint) && !giftId && statusChecked,
        creatorPending: Boolean(creatorHint),
        creatorBlocked
      });
    },
    assertCurrent: current,
    dispose() {
      disposed = true;
      creator = null;
      quote = null;
      buyer = null;
      client.dispose();
    }
  });
}
