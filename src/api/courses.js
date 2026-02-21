// Buy a course (standard API, not Stripe checkout)
import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function buyCourse(courseId, payload) {
  return apiRequest(`/api/courses/${courseId}/buy`, {
    method: "POST",
    body: payload || {}
  });
}

export function getMyCourses() {
  return apiRequest(apiRoutes.COURSES.MINE);
}

export function createCourse(payload) {
  return apiRequest(apiRoutes.COURSES.CREATE, {
    method: "POST",
    body: payload
  }).then((course) => {
    if (course && !course.creator && global.user) {
      course.creator = {
        _id: global.user._id || global.user.id,
        name: global.user.name || global.user.displayName || global.user.username,
        displayName: global.user.displayName || global.user.name,
        username: global.user.username
      };
    }
    return course;
  });
}

export function getCourse(id) {
  return apiRequest(apiRoutes.COURSES.DETAIL(id));
}

export function addLesson(courseId, payload) {
  return apiRequest(apiRoutes.COURSES.LESSON(courseId), {
    method: "POST",
    body: payload
  });
}

export function updateLesson(lessonId, payload) {
  return apiRequest(apiRoutes.COURSES.LESSON_DETAIL(lessonId), {
    method: "PUT",
    body: payload
  });
}

export function deleteLesson(lessonId) {
  return apiRequest(apiRoutes.COURSES.LESSON_DETAIL(lessonId), {
    method: "DELETE"
  });
}

export function publishCourse(id) {
  return apiRequest(apiRoutes.COURSES.PUBLISH(id), {
    method: "PUT"
  });
}

export function updateCourse(id, payload) {
  return apiRequest(apiRoutes.COURSES.DETAIL(id), {
    method: "PUT",
    body: payload || {}
  });
}

export function getPublishedCourses() {
  return apiRequest(apiRoutes.COURSES.LIST);
}

export function enrollInCourse(courseId) {
  return apiRequest(apiRoutes.COURSES.ENROLL(courseId), {
    method: "POST"
  });
}

// Stripe-powered course checkout
export function buyCourseStripeCheckout(courseId) {
  return apiRequest(`/api/courses/${courseId}/checkout`, {
    method: "POST"
  });
}

export function getEnrollmentStatus(courseId) {
  return apiRequest(apiRoutes.COURSES.STATUS(courseId));
}

export function completeLesson(lessonId, courseId) {
  return apiRequest(apiRoutes.COURSES.COMPLETE_LESSON(lessonId), {
    method: "POST",
    body: { courseId }
  });
}

export function addReview(courseId, rating, text) {
  return apiRequest(apiRoutes.COURSES.REVIEW(courseId), {
    method: "POST",
    body: { rating, text }
  });
}

export function getReviews(courseId) {
  return apiRequest(apiRoutes.COURSES.REVIEWS(courseId));
}

export function deleteReview(courseId) {
  return apiRequest(apiRoutes.COURSES.REVIEW(courseId), {
    method: "DELETE"
  });
}

export function searchCourses(query) {
  return apiRequest(apiRoutes.COURSES.SEARCH, { params: { q: query } });
}

export function filterCourses(options) {
  return apiRequest(apiRoutes.COURSES.FILTER, { params: options });
}

export function listCourses(page = 1) {
  return apiRequest(`${apiRoutes.COURSES.LIST}/list`, { params: { page } });
}

export function getCategories() {
  return apiRequest(apiRoutes.COURSES.CATEGORIES);
}

export function getCategoryCourses(category) {
  return apiRequest(apiRoutes.COURSES.CATEGORY_COURSES(category));
}

export function getSubcategories(category) {
  return apiRequest(apiRoutes.COURSES.SUBCATEGORIES(category));
}

export function getTrendingTags() {
  return apiRequest(apiRoutes.COURSES.TRENDING_TAGS);
}

export function getRecommendedCourses(courseId) {
  return apiRequest(apiRoutes.COURSES.RECOMMENDATIONS(courseId));
}

export function getRecommendedForYou() {
  return apiRequest(apiRoutes.COURSES.RECOMMENDED);
}

export function trackLessonView(lessonId) {
  return apiRequest(apiRoutes.COURSES.TRACK_VIEW(lessonId), {
    method: "POST",
    body: {}
  });
}

export function sendWatchTime(lessonId, seconds) {
  return apiRequest(apiRoutes.COURSES.TRACK_WATCH(lessonId), {
    method: "POST",
    body: { seconds }
  });
}

export function trackDropoff(lessonId, seconds) {
  return apiRequest(apiRoutes.COURSES.TRACK_DROPOFF(lessonId), {
    method: "POST",
    body: { seconds }
  });
}

// Course Review System (Admin/Reviewer)
export function submitForReview(courseId) {
  return apiRequest(apiRoutes.COURSES.SUBMIT_REVIEW(courseId), {
    method: "PUT"
  });
}

export function approveCourse(courseId) {
  return apiRequest(apiRoutes.COURSES.APPROVE(courseId), {
    method: "PUT"
  });
}

export function rejectCourse(courseId, reason) {
  return apiRequest(apiRoutes.COURSES.REJECT(courseId), {
    method: "PUT",
    body: { reason }
  });
}

export function getPendingCourses(status) {
  return apiRequest(apiRoutes.COURSES.ADMIN_PENDING, {
    params: status ? { status } : undefined
  });
}

// Alias for consistency
export const submitCourseForReview = submitForReview;
