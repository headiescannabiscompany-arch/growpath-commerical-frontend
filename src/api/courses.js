// Buy a course (standard API, not Stripe checkout)
export function buyCourse(courseId, payload) {
  return api(`/api/courses/${courseId}/buy`, {
    method: "POST",
    body: JSON.stringify(payload || {})
  });
}
import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function getMyCourses() {
  return api(ROUTES.COURSES.MINE);
}

export function createCourse(payload) {
  return api(ROUTES.COURSES.CREATE, {
    method: "POST",
    body: JSON.stringify(payload)
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
  return api(ROUTES.COURSES.DETAIL(id));
}

export function addLesson(courseId, payload) {
  return api(ROUTES.COURSES.LESSON(courseId), {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateLesson(lessonId, payload) {
  return api(ROUTES.COURSES.LESSON_DETAIL(lessonId), {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteLesson(lessonId) {
  return api(ROUTES.COURSES.LESSON_DETAIL(lessonId), {
    method: "DELETE"
  });
}

export function publishCourse(id) {
  return api(ROUTES.COURSES.PUBLISH(id), {
    method: "PUT"
  });
}

export function updateCourse(id, payload) {
  return api(ROUTES.COURSES.DETAIL(id), {
    method: "PUT",
    body: JSON.stringify(payload || {})
  });
}

export function getPublishedCourses() {
  return api(ROUTES.COURSES.LIST);
}

export function enrollInCourse(courseId) {
  return api(ROUTES.COURSES.ENROLL(courseId), {
    method: "POST"
  });
}

// Stripe-powered course checkout
export function buyCourseStripeCheckout(courseId) {
  return api(`/api/courses/${courseId}/checkout`, {
    method: "POST"
  });
}

export function getEnrollmentStatus(courseId) {
  return api(ROUTES.COURSES.STATUS(courseId));
}

export function completeLesson(lessonId, courseId) {
  return api(ROUTES.COURSES.COMPLETE_LESSON(lessonId), {
    method: "POST",
    body: JSON.stringify({ courseId })
  });
}

export function addReview(courseId, rating, text) {
  return api(ROUTES.COURSES.REVIEW(courseId), {
    method: "POST",
    body: JSON.stringify({ rating, text })
  });
}

export function getReviews(courseId) {
  return api(ROUTES.COURSES.REVIEWS(courseId));
}

export function deleteReview(courseId) {
  return api(ROUTES.COURSES.REVIEW(courseId), {
    method: "DELETE"
  });
}

export function searchCourses(query) {
  return api(`${ROUTES.COURSES.SEARCH}?q=${query}`);
}

export function filterCourses(options) {
  const params = new URLSearchParams(options).toString();
  return api(`${ROUTES.COURSES.FILTER}?${params}`);
}

export function listCourses(page = 1) {
  return api(`${ROUTES.COURSES.LIST}/list?page=${page}`);
}

export function getCategories() {
  return api(ROUTES.COURSES.CATEGORIES);
}

export function getCategoryCourses(category) {
  return api(ROUTES.COURSES.CATEGORY_COURSES(category));
}

export function getSubcategories(category) {
  return api(ROUTES.COURSES.SUBCATEGORIES(category));
}

export function getTrendingTags() {
  return api(ROUTES.COURSES.TRENDING_TAGS);
}

export function getRecommendedCourses(courseId) {
  return api(ROUTES.COURSES.RECOMMENDATIONS(courseId));
}

export function getRecommendedForYou() {
  return api(ROUTES.COURSES.RECOMMENDED);
}

export function trackLessonView(lessonId) {
  return api(ROUTES.COURSES.TRACK_VIEW(lessonId), {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function sendWatchTime(lessonId, seconds) {
  return api(ROUTES.COURSES.TRACK_WATCH(lessonId), {
    method: "POST",
    body: JSON.stringify({ seconds })
  });
}

export function trackDropoff(lessonId, seconds) {
  return api(ROUTES.COURSES.TRACK_DROPOFF(lessonId), {
    method: "POST",
    body: JSON.stringify({ seconds })
  });
}

// Course Review System (Admin/Reviewer)
export function submitForReview(courseId) {
  return api(ROUTES.COURSES.SUBMIT_REVIEW(courseId), {
    method: "PUT"
  });
}

export function approveCourse(courseId) {
  return api(ROUTES.COURSES.APPROVE(courseId), {
    method: "PUT"
  });
}

export function rejectCourse(courseId, reason) {
  return api(ROUTES.COURSES.REJECT(courseId), {
    method: "PUT",
    body: JSON.stringify({ reason })
  });
}

export function getPendingCourses(status) {
  const query = status ? `?status=${status}` : "";
  return api(`${ROUTES.COURSES.ADMIN_PENDING}${query}`);
}

// Alias for consistency
export const submitCourseForReview = submitForReview;
