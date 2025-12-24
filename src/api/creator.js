import { client as api, postMultipart } from "./client.js";
import ROUTES from "./routes.js";

export function getEarnings() {
  // Note: This matches GET /api/creator/earnings in backend
  // but ROUTES.CREATOR.MINE matches GET /api/earnings/mine.
  // Standardizing on ROUTES.CREATOR structure.
  return api(`${ROUTES.CREATOR.REVENUE}/../earnings`); // Fallback if no specific ROUTES entry
}

export function getCreatorCourses() {
  return api(ROUTES.CREATOR.PERFORMANCE);
}

export function getEnrollmentTimeline() {
  return api(ROUTES.CREATOR.TIMELINE);
}

export function getPayoutSummary() {
  return api(ROUTES.CREATOR.PAYOUT_SUMMARY);
}

export function getPayoutHistory() {
  return api(ROUTES.CREATOR.PAYOUT_HISTORY);
}

export async function uploadSignature(formData) {
  return postMultipart(ROUTES.CREATOR.SIGNATURE, formData);
}

export function getCourseAnalytics(courseId) {
  return api(ROUTES.CREATOR.ANALYTICS(courseId));
}

export function getRevenueTimeline() {
  return api(ROUTES.CREATOR.REVENUE);
}
