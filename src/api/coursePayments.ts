import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

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
