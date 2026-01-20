// enrollmentApi.js
// API functions for enrollment, progress, and certificates
import apiFetch from "./api";

// Enrollment
export const enrollInCourse = (id) =>
  apiFetch(`/courses/${id}/enroll`, { method: "POST" });
export const getEnrollmentStatus = (id) => apiFetch(`/courses/${id}/enrollment-status`);

// Certificates
export const getUserCertificates = () => apiFetch("/courses/user/certificates");
export const verifyCertificate = (certificateId) =>
  apiFetch(`/courses/verify/${certificateId}`, { auth: false });

// Progress (already in courseApi.js, but can be re-exported here if needed)
// export { markLessonComplete, trackLessonView, trackLessonWatch, trackLessonDropoff } from './courseApi';
