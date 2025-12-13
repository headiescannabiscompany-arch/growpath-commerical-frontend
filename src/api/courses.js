// ...existing code...
export async function enroll() {
  throw new Error("Enroll not implemented yet");
}

export async function buyCourse() {
  throw new Error("Buy course not implemented yet");
}
import { api } from "./client";

export function getMyCourses() {
  return api("/courses/mine");
}

export function createCourse(payload) {
  return api("/courses/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getCourse(id) {
  return api(`/courses/${id}`);
}

export function addLesson(courseId, payload) {
  return api(`/courses/${courseId}/lesson`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateLesson(lessonId, payload) {
  return api(`/courses/lesson/${lessonId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteLesson(lessonId) {
  return api(`/courses/lesson/${lessonId}`, {
    method: "DELETE"
  });
}

export function publishCourse(id) {
  return api(`/courses/${id}/publish`, {
    method: "PUT"
  });
}

export function getPublishedCourses() {
  return api("/courses");
}

export function enrollInCourse(courseId) {
  return api(`/courses/${courseId}/enroll`, {
    method: "POST"
  });
}

export function getEnrollmentStatus(courseId) {
  return api(`/courses/${courseId}/enrollment-status`);
}

export function completeLesson(lessonId, courseId) {
  return api(`/courses/lesson/${lessonId}/complete`, {
    method: "POST",
    body: JSON.stringify({ courseId })
  });
}

export function addReview(courseId, rating, text) {
  return api(`/courses/${courseId}/review`, {
    method: "POST",
    body: JSON.stringify({ rating, text })
  });
}

export function getReviews(courseId) {
  return api(`/courses/${courseId}/reviews`);
}

export function deleteReview(courseId) {
  return api(`/courses/${courseId}/review`, {
    method: "DELETE"
  });
}

export function searchCourses(query) {
  return api(`/courses/search?q=${query}`);
}

export function filterCourses(options) {
  const params = new URLSearchParams(options).toString();
  return api(`/courses/filter?${params}`);
}

export function listCourses(page = 1) {
  return api(`/courses/list?page=${page}`);
}

export function getCategories() {
  return api("/courses/categories");
}

export function getCategoryCourses(category) {
  return api(`/courses/category/${encodeURIComponent(category)}`);
}

export function getSubcategories(category) {
  return api(`/courses/subcategories/${encodeURIComponent(category)}`);
}

export function getTrendingTags() {
  return api("/courses/trending-tags");
}

export function getRecommendedCourses(courseId) {
  return api(`/courses/${courseId}/recommendations`);
}

export function getRecommendedForYou() {
  return api("/courses/recommended");
}

export function trackLessonView(lessonId) {
  return api(`/courses/lessons/${lessonId}/view`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function sendWatchTime(lessonId, seconds) {
  return api(`/courses/lessons/${lessonId}/watch`, {
    method: "POST",
    body: JSON.stringify({ seconds })
  });
}

export function trackDropoff(lessonId, seconds) {
  return api(`/courses/lessons/${lessonId}/dropoff`, {
    method: "POST",
    body: JSON.stringify({ seconds })
  });
}

// Course Review System
export function submitForReview(courseId) {
  return api(`/courses/${courseId}/submit-for-review`, {
    method: "PUT"
  });
}

export function approveCourse(courseId) {
  return api(`/courses/${courseId}/approve`, {
    method: "PUT"
  });
}

export function rejectCourse(courseId, reason) {
  return api(`/courses/${courseId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason })
  });
}

export function getPendingCourses(status) {
  const query = status ? `?status=${status}` : "";
  return api(`/courses/admin/pending${query}`);
}

// Alias for consistency
export const submitCourseForReview = submitForReview;
