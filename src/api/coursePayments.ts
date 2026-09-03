import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import {
  pollAuthoritativeCheckoutStatus,
  type AuthoritativeCheckoutState,
  type CheckoutReconciliation
} from "../utils/buyerCheckoutRecovery";

export type CoursePaymentStatus = {
  enrolled?: boolean;
  isEnrolled?: boolean;
  paymentStatus?: string;
  checkoutStatus?: string;
  refundStatus?: string;
  disputeStatus?: string;
  earningsStatus?: string;
  enrollmentId?: string;
  status?: string;
};

export type CourseAccessSnapshot = CoursePaymentStatus & {
  enrollment?: unknown;
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
  const encodedCourseId = encodeURIComponent(courseId);
  return `${origin}${path}${separator}checkout=${status}&courseId=${encodedCourseId}&course=${encodedCourseId}`;
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

const PAYMENT_RECORDED_COURSE_STATUSES = new Set([
  "active",
  "complete",
  "completed",
  "enrolled",
  "fulfilled",
  "paid",
  "recorded"
]);
const PENDING_COURSE_STATUSES = new Set([
  "checkout_pending",
  "created",
  "open",
  "pending",
  "processing",
  "submitted"
]);
const TERMINAL_COURSE_STATUSES = new Set([
  "canceled",
  "cancelled",
  "chargeback",
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
  if (statuses.some((status) => TERMINAL_COURSE_STATUSES.has(status))) {
    return "terminal";
  }
  if (
    ["open", "reported"].includes(
      String(snapshot?.disputeStatus || "")
        .trim()
        .toLowerCase()
    )
  ) {
    return "terminal";
  }
  if (snapshot?.enrolled === true || snapshot?.isEnrolled === true) return "confirmed";
  if (statuses.some((status) => PENDING_COURSE_STATUSES.has(status))) return "pending";
  if (statuses.some((status) => PAYMENT_RECORDED_COURSE_STATUSES.has(status))) {
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

export async function requestCourseRefund(courseId: string, reason: string) {
  return apiRequest(apiRoutes.PAYMENTS.REFUND_REQUEST(courseId), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("refund", courseId) },
    body: { reason }
  });
}

export async function openCourseDispute(courseId: string, reason: string) {
  return apiRequest(apiRoutes.PAYMENTS.DISPUTE(courseId), {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey("dispute", courseId) },
    body: { reason }
  });
}
