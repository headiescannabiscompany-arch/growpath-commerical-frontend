import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";
import { persistImageUri } from "@/utils/photoUploads";

function data(response) {
  return response?.data ?? response;
}

export function markPayoutPaid(payoutId) {
  return apiRequest(apiRoutes.CREATOR.PAYOUT_MARK_PAID(payoutId), {
    method: "POST"
  });
}
export function requestPayout(payoutMethod = "stripe") {
  return apiRequest(apiRoutes.CREATOR.REQUEST_PAYOUT, {
    method: "POST",
    body: { payoutMethod }
  });
}

export function getEarnings() {
  return apiRequest(apiRoutes.CREATOR.MINE).then(data);
}

export function getCreatorCourses() {
  return apiRequest(apiRoutes.CREATOR.PERFORMANCE).then(data);
}

export function getEnrollmentTimeline() {
  return apiRequest(apiRoutes.CREATOR.TIMELINE).then(data);
}

export function getPayoutSummary() {
  return apiRequest(apiRoutes.CREATOR.PAYOUT_SUMMARY).then(data);
}

export function getPayoutHistory() {
  return apiRequest(apiRoutes.CREATOR.PAYOUT_HISTORY).then(data);
}

export async function uploadSignature(input) {
  const uri = input && typeof input === "object" && input.uri ? input.uri : input;
  if (typeof uri === "string") {
    const signatureUrl = await persistImageUri(uri);
    return apiRequest(apiRoutes.CREATOR.SIGNATURE, {
      method: "POST",
      body: { signatureUrl }
    });
  }

  return apiRequest(apiRoutes.CREATOR.SIGNATURE, { method: "POST", body: input });
}

export function getCourseAnalytics(courseId) {
  return apiRequest(apiRoutes.CREATOR.ANALYTICS(courseId)).then(data);
}

export function getRevenueTimeline() {
  return apiRequest(apiRoutes.CREATOR.REVENUE).then(data);
}
