import { client as api } from "./client";
import { API_URL } from "./client";

export function getEarnings() {
  return api("/creator/earnings");
}

export function getCreatorCourses() {
  return api("/creator/courses");
}

export function getEnrollmentTimeline() {
  return api("/creator/enrollment-timeline");
}

export function getPayoutSummary() {
  return api("/creator/payout-summary");
}

export function getPayoutHistory() {
  return api("/creator/payout-history");
}

export async function uploadSignature(formData) {
  const response = await fetch(`${API_URL}/creator/signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${global.authToken}`
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error("Failed to upload signature");
  }

  return response.json();
}

export function getCourseAnalytics(courseId) {
  return api(`/creator/course/${courseId}/analytics`);
}

export function getRevenueTimeline() {
  return api("/creator/revenue-timeline");
}
