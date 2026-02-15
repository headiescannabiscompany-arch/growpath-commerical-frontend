import { client as api, postMultipart } from "./client.js";
import apiRoutes from "./routes.js";
export function markPayoutPaid(payoutId) {
  return api(`${apiRoutes.CREATOR.PAYOUT_HISTORY}/${payoutId}/mark-paid`, {
    method: "POST"
  });
}
export function requestPayout() {
  return api(apiRoutes.CREATOR.REQUEST_PAYOUT, { method: "POST" });
}

export function getEarnings() {
  // Note: This matches GET /api/creator/earnings in backend
  // but apiRoutes.CREATOR.MINE matches GET /api/earnings/mine.
  // Standardizing on apiRoutes.CREATOR structure.
  return api(`${apiRoutes.CREATOR.REVENUE}/../earnings`); // Fallback if no specific apiRoutes entry
}

export function getCreatorCourses() {
  return api(apiRoutes.CREATOR.PERFORMANCE);
}

export function getEnrollmentTimeline() {
  return api(apiRoutes.CREATOR.TIMELINE);
}

export function getPayoutSummary() {
  return api(apiRoutes.CREATOR.PAYOUT_SUMMARY);
}

export function getPayoutHistory() {
  return api(apiRoutes.CREATOR.PAYOUT_HISTORY);
}

export async function uploadSignature(formData) {
  return postMultipart(apiRoutes.CREATOR.SIGNATURE, formData);
}

export function getCourseAnalytics(courseId) {
  return api(apiRoutes.CREATOR.ANALYTICS(courseId));
}

export function getRevenueTimeline() {
  return api(apiRoutes.CREATOR.REVENUE);
}
