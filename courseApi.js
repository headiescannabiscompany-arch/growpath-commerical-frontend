// courseApi.js
// API functions for courses, lessons, categories, and related endpoints
import apiFetch from "./api";

// Courses
export const getCourses = () => apiFetch("/courses", { auth: false });
export const getCoursesPaginated = (page = 1, limit = 10) =>
  apiFetch(`/courses/list?page=${page}&limit=${limit}`, { auth: false });
export const searchCourses = (query) =>
  apiFetch(`/courses/search?${query}`, { auth: false });
export const filterCourses = (query) =>
  apiFetch(`/courses/filter?${query}`, { auth: false });
export const getCategories = () => apiFetch("/courses/categories", { auth: false });
export const getCoursesByCategory = (category) =>
  apiFetch(`/courses/category/${encodeURIComponent(category)}`, { auth: false });
export const getSubcategories = (category) =>
  apiFetch(`/courses/subcategories/${encodeURIComponent(category)}`, { auth: false });
export const getRecommendations = () =>
  apiFetch("/courses/recommendations", { auth: false });
export const getRecommended = () => apiFetch("/courses/recommended", { auth: false });
export const getCourse = (id) => apiFetch(`/courses/${id}`, { auth: false });

// Lessons
export const getCourseWithLessons = (id) => apiFetch(`/courses/${id}`, { auth: false });
export const addLesson = (id, lesson) =>
  apiFetch(`/courses/${id}/lesson`, { method: "POST", body: lesson });
export const updateLesson = (lessonId, data) =>
  apiFetch(`/courses/lesson/${lessonId}`, { method: "PUT", body: data });
export const deleteLesson = (lessonId) =>
  apiFetch(`/courses/lesson/${lessonId}`, { method: "DELETE" });
export const trackLessonView = (lessonId) =>
  apiFetch(`/courses/lessons/${lessonId}/view`, { method: "POST" });
export const trackLessonWatch = (lessonId) =>
  apiFetch(`/courses/lessons/${lessonId}/watch`, { method: "POST" });
export const trackLessonDropoff = (lessonId, seconds) =>
  apiFetch(`/courses/lessons/${lessonId}/dropoff`, { method: "POST", body: { seconds } });
export const markLessonComplete = (lessonId) =>
  apiFetch(`/courses/lesson/${lessonId}/complete`, { method: "POST" });

// Q&A
export const addQuestion = (courseId, question) =>
  apiFetch(`/courses/${courseId}/questions`, { method: "POST", body: question });
export const addAnswer = (courseId, questionId, answer) =>
  apiFetch(`/courses/${courseId}/questions/${questionId}/answer`, {
    method: "POST",
    body: answer
  });
export const getQuestions = (courseId) => apiFetch(`/courses/${courseId}/questions`);
export const deleteQuestion = (courseId, questionId) =>
  apiFetch(`/courses/${courseId}/questions/${questionId}`, { method: "DELETE" });
export const deleteAnswer = (courseId, answerId) =>
  apiFetch(`/courses/${courseId}/answers/${answerId}`, { method: "DELETE" });

// Reviews
export const addReview = (courseId, review) =>
  apiFetch(`/courses/${courseId}/review`, { method: "POST", body: review });
export const getReviews = (courseId) => apiFetch(`/courses/${courseId}/reviews`);
export const deleteReview = (courseId) =>
  apiFetch(`/courses/${courseId}/review`, { method: "DELETE" });

// Course creation & publishing
export const createCourse = (course) =>
  apiFetch("/courses/create", { method: "POST", body: course });
export const publishCourse = (id) =>
  apiFetch(`/courses/${id}/publish`, { method: "PUT" });

// Purchasing
export const buyCourse = (id) => apiFetch(`/courses/${id}/buy`, { method: "POST" });
