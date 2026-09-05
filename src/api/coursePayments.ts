import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import {
  pollAuthoritativeCheckoutStatus,
  type AuthoritativeCheckoutState,
  type CheckoutReconciliation
} from "../utils/buyerCheckoutRecovery";

export type CoursePaymentStatus = {
  recordId?: string | null;
  amountCents?: number;
  currency?: string;
  refundedAmountCents?: number;
  enrolled?: boolean;
  isEnrolled?: boolean;
  paymentStatus?: string;
  checkoutStatus?: string;
  refundStatus?: string;
  refundRequestStatus?: string;
  refundLifecycleStatus?: string;
  disputeStatus?: string;
  providerDisputeStatus?: string;
  disputeReportStatus?: string;
  connectRecoveryStatus?: string;
  earningsStatus?: string;
  enrollmentId?: string;
};

export type CourseAccessSnapshot = CoursePaymentStatus & {
  enrollment?: unknown;
  status?: string;
};

function idempotencyKey(prefix: string, courseId: string) {
  return `${prefix}:${courseId}:${Date.now()}`;
}

export type CourseCheckoutOptions = {
  returnPath?: string;
};

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

function checkoutReturnUrl(
  origin: string,
  returnPath: string,
  status: "success" | "canceled",
  courseId: string
) {
  const path = returnPath || "/courses";
  const separator = path.includes("?") ? "&" : "?";
  return `${origin}${path}${separator}checkout=${status}&course=${encodeURIComponent(
    courseId
  )}`;
}

export async function startCourseCheckout(
  courseId: string,
  options: CourseCheckoutOptions = {}
) {
  const origin = currentOrigin();
  const returnPath = options.returnPath || "/courses";
  return apiRequest(apiRoutes.PAYMENTS.CHECKOUT(courseId), {
    method: "POST",
    body: origin
      ? {
          successUrl: checkoutReturnUrl(origin, returnPath, "success", courseId),
          cancelUrl: checkoutReturnUrl(origin, returnPath, "canceled", courseId)
        }
      : {}
  });
}

export async function getCoursePaymentStatus(
  courseId: string
): Promise<CoursePaymentStatus> {
  const response = await apiRequest(apiRoutes.PAYMENTS.COURSE_STATUS(courseId), {
    method: "GET"
  });
  return response?.data ?? response ?? {};
}

const COURSE_PENDING_STATUSES = new Set([
  "checkout_pending",
  "created",
  "open",
  "pending",
  "processing",
  "submitted"
]);
const COURSE_TERMINAL_STATUSES = new Set([
  "canceled",
  "cancelled",
  "disputed",
  "expired",
  "failed",
  "refunded",
  "revoked",
  "void",
  "voided"
]);

export function coursePaymentReconciliationState(
  snapshot: CourseAccessSnapshot | null | undefined
): AuthoritativeCheckoutState {
  const statuses = [
    snapshot?.paymentStatus,
    snapshot?.checkoutStatus,
    snapshot?.refundStatus,
    snapshot?.status
  ]
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
  if (statuses.some((status) => COURSE_TERMINAL_STATUSES.has(status))) {
    return "terminal";
  }
  const providerDispute = String(
    snapshot?.providerDisputeStatus || snapshot?.disputeStatus || ""
  ).toLowerCase();
  if (["open", "lost"].includes(providerDispute)) return "terminal";
  if (snapshot?.enrolled === true || snapshot?.isEnrolled === true) return "confirmed";
  if (statuses.some((status) => COURSE_PENDING_STATUSES.has(status))) return "pending";
  if (statuses.some((status) => ["paid", "recorded", "completed"].includes(status))) {
    return "pending";
  }
  return "unknown";
}

export async function getCourseAccessStatus(
  courseId: string
): Promise<CourseAccessSnapshot> {
  const [paymentResult, enrollmentResult] = await Promise.allSettled([
    getCoursePaymentStatus(courseId),
    apiRequest(apiRoutes.COURSES.STATUS(courseId), { method: "GET" })
  ]);
  if (paymentResult.status === "rejected" && enrollmentResult.status === "rejected") {
    throw paymentResult.reason;
  }
  const payment = paymentResult.status === "fulfilled" ? paymentResult.value : {};
  const enrollmentResponse =
    enrollmentResult.status === "fulfilled" ? enrollmentResult.value : {};
  const enrollment = enrollmentResponse?.data ?? enrollmentResponse ?? {};
  return { ...payment, ...enrollment };
}

export async function pollCourseAccessStatus(
  courseId: string,
  options: {
    onSnapshot?: (snapshot: CourseAccessSnapshot) => void;
    shouldContinue?: () => boolean;
  } = {}
): Promise<CheckoutReconciliation<CourseAccessSnapshot>> {
  return pollAuthoritativeCheckoutStatus({
    classify: coursePaymentReconciliationState,
    onSnapshot: options.onSnapshot,
    read: () => getCourseAccessStatus(courseId),
    shouldContinue: options.shouldContinue
  });
}

export type CoursePaymentReviewInput = {
  recordId: string;
  expectedRefundedAmountCents: number;
  reason: string;
};

export async function requestCourseRefund(
  courseId: string,
  input: CoursePaymentReviewInput
) {
  return apiRequest(apiRoutes.PAYMENTS.REFUND_REQUEST(courseId), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("refund", courseId) },
    body: input
  });
}

export async function openCourseDispute(
  courseId: string,
  input: CoursePaymentReviewInput
) {
  return apiRequest(apiRoutes.PAYMENTS.DISPUTE(courseId), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("dispute", courseId) },
    body: input
  });
}
