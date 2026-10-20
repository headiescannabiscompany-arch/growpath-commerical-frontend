import {
  boundBuyerStatus,
  boundClaimResult,
  giftClaimDeadline,
  maskedGiftRecipient,
  type GiftBuyerStatus,
  type GiftClaimResult,
  type GiftRecipientState
} from "@/components/courseGifts/courseGiftPresentation";
import {
  courseGiftAttemptId,
  createCourseGiftContinuation,
  type CourseGiftAuth
} from "@/utils/courseGiftContinuation";

export const COURSE_GIFT_REQUEST_MS = 20_000;
import {
  validGiftSaleBody,
  type GiftWireBody,
  type SaleOperation
} from "./courseGiftSaleContract";
import type { GiftSaleRecovery } from "@/utils/courseGiftSaleRecovery";
import { giftUuid } from "./courseGiftSaleContract";
import { boundGiftRenewal, type GiftRenewalResult } from "./courseGiftRenewalContract";
type Continuation = ReturnType<typeof createCourseGiftContinuation>;
type Operation =
  | "recipient_review"
  | "recipient_claim"
  | "recipient_renew"
  | "buyer_status"
  | SaleOperation;
type TransportRequest = {
  operation: Operation;
  body: Readonly<GiftWireBody>;
  authorization: string;
  signal: AbortSignal;
  retries: 0;
  cache: "no-store";
  redirect: "error";
};
type Options = {
  platform: "web" | "native";
  continuation: Continuation;
  auth: () => CourseGiftAuth;
  getAccessToken: (signal: AbortSignal) => Promise<string>;
  invoke: (request: TransportRequest) => Promise<unknown>;
  newRenewalId?: () => string;
};
const objectId = (value: unknown): value is string =>
  typeof value === "string" && value.length === 24 && /^[a-f0-9]{24}$/.test(value);
const SAFE_ERROR_CODES = new Set([
  "COURSE_GIFT_REQUEST_CANCELED",
  "COURSE_GIFT_REQUEST_UNKNOWN",
  "COURSE_GIFT_SESSION_CHANGED",
  "COURSE_GIFT_SIGN_IN_REQUIRED"
]);
const CHECKOUT_STATES = new Set([
  "reserved",
  "creating",
  "creation_unknown",
  "open",
  "completed",
  "expired",
  "failed"
]);
const REVIEW_CODES = new Set([
  "COURSE_GIFT_LINK_RENEWAL_REQUIRED",
  "COURSE_GIFT_CLAIM_INVALID",
  "COURSE_GIFT_RECIPIENT_UNAVAILABLE",
  "COURSE_GIFT_RECIPIENT_MISMATCH",
  "COURSE_GIFT_EMAIL_VERIFICATION_REQUIRED",
  "COURSE_GIFT_SELF_PURCHASE",
  "COURSE_GIFT_COURSE_UNAVAILABLE",
  "COURSE_GIFT_PAYMENT_BINDING_REQUIRED",
  "COURSE_GIFT_PAYMENT_BLOCKED",
  "COURSE_GIFT_ENROLLMENT_READ_REQUIRED",
  "COURSE_GIFT_ALREADY_CLAIMED",
  "COURSE_GIFT_ACCESS_REVIEW_REQUIRED",
  "COURSE_GIFT_TRANSACTION_REQUIRED"
]);

export class CourseGiftClientError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "CourseGiftClientError";
  }
}
const fail = (code: string): never => {
  throw new CourseGiftClientError(code);
};

/** No runtime/env switch or caller adapter can open the public client. */
export function courseGiftClient() {
  return fail("COURSE_GIFTING_NOT_RELEASED");
}

/** Internal orchestration only, no HTTP endpoint or live credential is wired.
 * The trusted future transport must authenticate server-side and perform current
 * course/payment/recipient/Facility checks. Browser state is never authority.
 * All operations are explicit; construction and auth changes make no requests.
 */
export function createInternalCourseGiftClient(options: Options) {
  if (options.platform !== "web") fail("COURSE_GIFTING_NOT_RELEASED");
  let disposed = false;
  let active: AbortController | null = null;
  let cancelActive: (() => void) | null = null;
  let review: GiftRecipientState | null = null;
  let reviewRevision = -1;
  let reviewScope = "";
  let claimed = false;
  // Same-operation recovery is instance memory only. Never store this or a token.
  let renewal: {
    scope: string;
    revision: number;
    giftId: string;
    operationId: string;
  } | null = null;
  let boundReview: {
    scope: string;
    revision: number;
    giftId: string;
    courseId: string;
  } | null = null;
  const expectedBuyerGifts = new Map<string, string>();

  function session() {
    let auth: CourseGiftAuth;
    try {
      auth = { ...options.auth() };
    } catch {
      return fail("COURSE_GIFT_SIGN_IN_REQUIRED");
    }
    const scope = options.continuation.observe(auth);
    if (
      renewal &&
      (renewal.scope !== scope ||
        renewal.revision !== options.continuation.revision() ||
        auth.emailVerified !== true)
    )
      renewal = null;
    if (disposed || auth.state !== "ready" || !scope)
      fail("COURSE_GIFT_SIGN_IN_REQUIRED");
    return { auth, scope, revision: options.continuation.revision() };
  }
  async function request(
    operation: Operation,
    body: GiftWireBody,
    expected: ReturnType<typeof session>
  ) {
    if (active) fail("COURSE_GIFT_REQUEST_BUSY");
    const controller = new AbortController();
    active = controller;
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      cancelActive = () => {
        controller.abort();
        reject(new CourseGiftClientError("COURSE_GIFT_REQUEST_CANCELED"));
      };
      timeout = setTimeout(() => {
        controller.abort();
        reject(new CourseGiftClientError("COURSE_GIFT_REQUEST_UNKNOWN"));
      }, COURSE_GIFT_REQUEST_MS);
    });
    function current() {
      const next = session();
      if (
        controller.signal.aborted ||
        next.scope !== expected.scope ||
        next.revision !== expected.revision ||
        next.auth.emailVerified !== expected.auth.emailVerified
      )
        fail("COURSE_GIFT_SESSION_CHANGED");
    }
    try {
      return await Promise.race([
        deadline,
        (async () => {
          current();
          const authorization = await options.getAccessToken(controller.signal);
          current(); // Deadline/auth fence includes credential retrieval, not just fetch.
          if (
            typeof authorization !== "string" ||
            !authorization ||
            /[\r\n]/.test(authorization)
          )
            fail("COURSE_GIFT_SIGN_IN_REQUIRED");
          const result = await options.invoke({
            operation,
            body: Object.freeze({ ...body }),
            authorization,
            signal: controller.signal,
            retries: 0,
            cache: "no-store",
            redirect: "error"
          });
          current();
          return result;
        })()
      ]);
    } catch (error) {
      // Do not forward transport messages/data/cause, URLs, credentials or tokens.
      if (error instanceof CourseGiftClientError && SAFE_ERROR_CODES.has(error.code))
        throw new CourseGiftClientError(error.code);
      return fail("COURSE_GIFT_REQUEST_UNKNOWN");
    } finally {
      clearTimeout(timeout!);
      if (active === controller) {
        active = null;
        cancelActive = null;
      }
    }
  }
  function claimToken(expected: ReturnType<typeof session>) {
    const token = options.continuation.tokenForScope(expected.scope);
    if (!token) fail("COURSE_GIFT_REOPEN_INVITATION");
    return token;
  }
  function readReview(value: unknown): GiftRecipientState {
    const row = value as GiftRecipientState;
    if (
      !row ||
      !objectId(row.giftId) ||
      !objectId(row.courseId) ||
      typeof row.courseTitle !== "string" ||
      !row.courseTitle.trim() ||
      row.courseTitle.length > 300 ||
      maskedGiftRecipient(row.recipient) === "Recipient hidden" ||
      !Number.isFinite(giftClaimDeadline(row.claimExpiresAt)) ||
      ((row.claimExpiryMode !== undefined || row.inactivityFeeCents !== undefined) &&
        (row.claimExpiryMode !== "none" || row.inactivityFeeCents !== 0)) ||
      !REVIEW_CODES.has(row.code)
    )
      fail("COURSE_GIFT_RESPONSE_INVALID");
    if (
      row.code === "COURSE_GIFT_LINK_RENEWAL_REQUIRED" &&
      (row.claimExpiryMode !== "none" ||
        row.inactivityFeeCents !== 0 ||
        giftClaimDeadline(row.claimExpiresAt) > Date.now())
    )
      fail("COURSE_GIFT_RESPONSE_INVALID");
    return {
      giftId: row.giftId,
      courseId: row.courseId,
      courseTitle: row.courseTitle,
      recipient: row.recipient,
      claimExpiresAt: row.claimExpiresAt,
      ...(row.claimExpiryMode === "none"
        ? { claimExpiryMode: "none" as const, inactivityFeeCents: 0 as const }
        : {}),
      code: row.code
    };
  }
  return Object.freeze({
    currentScope() {
      const current = session();
      return JSON.stringify([
        current.scope,
        current.revision,
        current.auth.emailVerified
      ]);
    },
    rememberBuyerAttempt(attempt: string) {
      session();
      return options.continuation.rememberCheckout(attempt);
    },
    recoverSale(courseId: string, kind: GiftSaleRecovery["kind"]) {
      session();
      return options.continuation.recoverSale(courseId, kind);
    },
    rememberSale(value: GiftSaleRecovery) {
      session();
      return options.continuation.rememberSale(value);
    },
    clearCreatorRecovery(courseId: string, requestId: string) {
      session();
      return options.continuation.clearSale(courseId, requestId);
    },
    // Internal sale screens reuse this deadline/identity/no-retry boundary, not
    // a parallel authenticated transport. Server composition remains unmounted.
    async requestSale(operation: SaleOperation, body: GiftWireBody): Promise<unknown> {
      const expected = session();
      if (!validGiftSaleBody(operation, body)) fail("COURSE_GIFT_RESPONSE_INVALID");
      if (
        operation !== "creatorReview" &&
        operation !== "creatorRevoke" &&
        expected.auth.emailVerified !== true
      )
        fail("COURSE_GIFT_SIGN_IN_REQUIRED");
      return request(operation, body, expected);
    },
    async reviewRecipient(): Promise<GiftRecipientState> {
      const expected = session();
      const previous =
        boundReview &&
        boundReview.revision === expected.revision &&
        boundReview.scope === expected.scope
          ? boundReview
          : null;
      review = null;
      const result = readReview(
        await request("recipient_review", { token: claimToken(expected) }, expected)
      );
      if (
        previous &&
        (previous.giftId !== result.giftId || previous.courseId !== result.courseId)
      )
        fail("COURSE_GIFT_RESPONSE_INVALID");
      boundReview = {
        scope: expected.scope,
        revision: expected.revision,
        giftId: result.giftId,
        courseId: result.courseId
      };
      review = result;
      reviewRevision = expected.revision;
      reviewScope = expected.scope;
      return { ...result };
    },
    async renewRecipient({
      confirmed
    }: {
      confirmed: boolean;
    }): Promise<GiftRenewalResult> {
      const expected = session();
      if (confirmed !== true || expected.auth.emailVerified !== true || claimed)
        fail("COURSE_GIFT_FRESH_REVIEW_REQUIRED");
      if (!renewal) {
        if (
          !review ||
          reviewScope !== expected.scope ||
          reviewRevision !== expected.revision ||
          review.code !== "COURSE_GIFT_LINK_RENEWAL_REQUIRED"
        )
          return fail("COURSE_GIFT_FRESH_REVIEW_REQUIRED");
        let operationId: string;
        try {
          operationId = options.newRenewalId
            ? options.newRenewalId()
            : globalThis.crypto.randomUUID();
        } catch {
          return fail("COURSE_GIFT_REQUEST_UNKNOWN");
        }
        if (!giftUuid(operationId)) fail("COURSE_GIFT_REQUEST_UNKNOWN");
        renewal = {
          scope: expected.scope,
          revision: expected.revision,
          giftId: review.giftId,
          operationId
        };
      }
      const attempt = renewal;
      const token = claimToken(expected);
      review = null;
      const result = await request(
        "recipient_renew",
        {
          giftId: attempt.giftId,
          token,
          operationId: attempt.operationId
        },
        expected
      );
      if (!boundGiftRenewal(result, attempt.giftId))
        return fail("COURSE_GIFT_RESPONSE_INVALID");
      return { giftId: result.giftId, deliveryStatus: result.deliveryStatus };
    },
    async claimRecipient({
      confirmed
    }: {
      confirmed: boolean;
    }): Promise<GiftClaimResult> {
      const expected = session();
      if (
        confirmed !== true ||
        claimed ||
        expected.auth.emailVerified !== true ||
        !review ||
        reviewRevision !== expected.revision ||
        reviewScope !== expected.scope ||
        review.code !== "COURSE_GIFT_TRANSACTION_REQUIRED" ||
        giftClaimDeadline(review.claimExpiresAt) <= Date.now()
      )
        return fail("COURSE_GIFT_FRESH_REVIEW_REQUIRED");
      const approved = review;
      review = null; // Uncertain writes must re-read; never auto-replay a claim.
      const result = (await request(
        "recipient_claim",
        { token: claimToken(expected) },
        expected
      )) as GiftClaimResult;
      if (!boundClaimResult(result, approved) || !objectId(result.enrollmentId))
        fail("COURSE_GIFT_RESPONSE_INVALID");
      claimed = true;
      options.continuation.clear();
      return {
        action: "claimed",
        giftId: result.giftId,
        courseId: result.courseId,
        enrollmentId: result.enrollmentId
      };
    },
    async readBuyerStatus(
      attemptId: string,
      expectedGiftId?: string
    ): Promise<GiftBuyerStatus> {
      const expected = session();
      if (!courseGiftAttemptId(attemptId)) fail("COURSE_GIFT_ATTEMPT_INVALID");
      if (expectedGiftId !== undefined && !objectId(expectedGiftId))
        fail("COURSE_GIFT_RESPONSE_INVALID");
      const result = (await request(
        "buyer_status",
        { checkoutAttemptId: attemptId },
        expected
      )) as GiftBuyerStatus;
      if (
        !boundBuyerStatus(result, attemptId) ||
        !objectId(result.giftId) ||
        (expectedGiftId !== undefined && result.giftId !== expectedGiftId) ||
        !CHECKOUT_STATES.has(result.checkoutStatus)
      )
        fail("COURSE_GIFT_RESPONSE_INVALID");
      const key = JSON.stringify([expected.scope, attemptId]);
      const existing = expectedBuyerGifts.get(key);
      if (existing && existing !== result.giftId) fail("COURSE_GIFT_RESPONSE_INVALID");
      expectedBuyerGifts.set(key, result.giftId);
      return {
        giftId: result.giftId,
        checkoutAttemptId: result.checkoutAttemptId,
        checkoutStatus: result.checkoutStatus,
        paymentRecorded: result.paymentRecorded,
        recoveryRequired: result.recoveryRequired
      };
    },
    dispose() {
      disposed = true;
      review = null;
      renewal = null;
      boundReview = null;
      expectedBuyerGifts.clear();
      cancelActive?.();
      options.continuation.dispose();
    }
  });
}
