import { usePathname } from "expo-router";
export const COURSE = "a".repeat(24);
export const COMMERCIAL = "b".repeat(24);
export const ORIGINAL = "90000000-0000-4000-8000-000000000001";
export const FINGERPRINT = "d".repeat(64);
const listeners = new Set<() => void>();
const counts = {
  creatorReviews: 0,
  buyerReviews: 0,
  statuses: 0,
  forbiddenWrites: 0,
  generatedIds: 0,
  originalAttemptConfirmed: false
};
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function changed() {
  listeners.forEach((fn) => fn());
}
export function inspect() {
  return { ...counts };
}
export function newId() {
  counts.generatedIds++;
  changed();
  return crypto.randomUUID();
}
function forbidden(): never {
  counts.forbiddenWrites++;
  changed();
  throw Error("Fixture refuses mutations");
}
export function useEntitlements() {
  return {
    ready: true,
    plan: "pro",
    mode: usePathname().startsWith("/home/commercial/") ? "commercial" : "personal",
    facilityId: null,
    facilityRole: null,
    capabilities: {}
  };
}
export function useFacility() {
  return { selectedId: null };
}
export function getLearningAccess() {
  return {
    canViewCourses: true,
    canSeePaidCourses: true,
    canCreateCourses: true,
    canSellPaidCourses: true,
    canPublishCourses: true,
    maxLessonsPerCourse: 12
  };
}
const course = (id: string) => ({
  id,
  userId: "1".repeat(24),
  title: id === COMMERCIAL ? "Synthetic Commercial course" : "Synthetic shared course",
  description: "Local entry verification only",
  isPublished: true,
  priceCents: 2500,
  lessons: []
});
export async function getCourse(id: string) {
  if (id !== COURSE) throw Error("Unknown fixture course");
  return course(id);
}
export async function fetchCommercialCourse(id: string) {
  if (id !== COMMERCIAL) throw Error("Unknown fixture course");
  return { ...course(id), status: "draft", access: "paid", price: 25 };
}
export async function fetchProductLines() {
  return [];
}
export async function getEnrollmentStatus() {
  return { enrolled: false };
}
export async function getCourseLearnerNotes() {
  return { notes: [] };
}
export async function getReviews() {
  return [];
}
export async function getCoursePaymentStatus() {
  return { paymentStatus: "not_started" };
}
export async function listPersonalGrows() {
  return [];
}
export async function trackCourseView() {
  return {};
}
export const trackDropoff = trackCourseView,
  trackLessonView = trackCourseView,
  trackCourseProductClick = trackCourseView;
export const archiveCourse = forbidden,
  completeLesson = forbidden,
  enrollInCourse = forbidden,
  publishCourse = forbidden,
  sendWatchTime = forbidden,
  saveCourseLearnerNote = forbidden,
  unpublishCourse = forbidden,
  updateCourse = forbidden,
  openCourseDispute = forbidden,
  requestCourseRefund = forbidden,
  startCourseCheckout = forbidden,
  submitReport = forbidden,
  exportCourseSales = forbidden,
  createPersonalTask = forbidden,
  getCourseMediaAccessUrl = forbidden,
  uploadCourseMedia = forbidden,
  addCommercialCourseLesson = forbidden,
  archiveCommercialCourse = forbidden,
  deleteCommercialCourseLesson = forbidden,
  publishCommercialCourse = forbidden,
  unpublishCommercialCourse = forbidden,
  updateCommercialCourse = forbidden,
  updateCommercialCourseLesson = forbidden;
export class ApiError extends Error {}
export async function apiRequest(url: string, options: any = {}) {
  const body = options.body || {};
  if (url === "/api/course-gifts/creator/review") {
    counts.creatorReviews++;
    changed();
    return {
      success: true,
      data: {
        courseId: body.courseId,
        canAccept: false,
        matchesPolicy: false,
        consent: null,
        policy: null
      }
    };
  }
  if (url === "/api/course-gifts/buyer/review") {
    counts.buyerReviews++;
    changed();
    return {
      success: true,
      data: {
        version: "course-gift-sale-review-v1",
        courseId: body.courseId,
        checkoutAttemptId: body.checkoutAttemptId,
        recipientEmail: body.recipientEmail,
        reviewFingerprint: FINGERPRINT,
        title: "Synthetic shared course",
        amountCents: 2500,
        currency: "usd",
        terms: {
          version: "synthetic-only-v1",
          expiry: "Fixture terms only; no approved duration.",
          duplicateAccess: "Manual refund review.",
          courseUnavailable: "Manual refund review.",
          refund: "Manual refund review, no automatic refund."
        }
      }
    };
  }
  if (url === "/api/course-gifts/buyer/status") {
    counts.statuses++;
    counts.originalAttemptConfirmed = body.checkoutAttemptId === ORIGINAL;
    changed();
    return {
      success: true,
      data: {
        giftId: "3".repeat(24),
        checkoutAttemptId: body.checkoutAttemptId,
        checkoutStatus: "open",
        paymentRecorded: false,
        recoveryRequired: false
      }
    };
  }
  if (url.startsWith("/api/course-gifts/")) return forbidden();
  if (!options.method || options.method === "GET") return { sessionIds: [] };
  return forbidden();
}
