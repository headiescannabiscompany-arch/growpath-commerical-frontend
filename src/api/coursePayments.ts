import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export type CoursePaymentStatus = {
  enrolled?: boolean;
  isEnrolled?: boolean;
  paymentStatus?: string;
  checkoutStatus?: string;
  refundStatus?: string;
  disputeStatus?: string;
  earningsStatus?: string;
  enrollmentId?: string;
};

function idempotencyKey(prefix: string, courseId: string) {
  return `${prefix}:${courseId}:${Date.now()}`;
}

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

export async function startCourseCheckout(courseId: string) {
  const origin = currentOrigin();
  return apiRequest(apiRoutes.PAYMENTS.CHECKOUT(courseId), {
    method: "POST",
    body: origin
      ? {
          successUrl: `${origin}/courses?checkout=success`,
          cancelUrl: `${origin}/courses?checkout=canceled`
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
