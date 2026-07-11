import { CAPABILITY_KEYS } from "@/entitlements";

type EntitlementsLike = {
  can?: (capability: string | string[]) => boolean;
  limits?: Record<string, any>;
};

function has(entitlements: EntitlementsLike | null | undefined, capability: string) {
  return Boolean(entitlements?.can?.(capability));
}

function nullableLimit(value: any): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function getLearningAccess(entitlements: EntitlementsLike | null | undefined) {
  const limits = entitlements?.limits || {};
  const canViewCourses = has(entitlements, CAPABILITY_KEYS.COURSES_VIEW);
  const canSellPaidCourses = has(entitlements, CAPABILITY_KEYS.COURSES_SELL_PAID);

  return {
    canViewCourses,
    canSeePaidCourses:
      has(entitlements, CAPABILITY_KEYS.SEE_PAID_COURSES) || canSellPaidCourses,
    canCreateCourses: canViewCourses || has(entitlements, CAPABILITY_KEYS.COURSES_CREATE),
    canSellPaidCourses,
    canPublishCourses: has(entitlements, CAPABILITY_KEYS.PUBLISH_COURSES),
    canViewCourseAnalytics: has(entitlements, CAPABILITY_KEYS.COURSES_ANALYTICS),
    canUseCertificates: has(entitlements, CAPABILITY_KEYS.COURSES_CERTIFICATES),
    maxPaidCourses: nullableLimit(limits.maxPaidCourses),
    maxLessonsPerCourse: nullableLimit(limits.maxLessonsPerCourse),
    maxCertificates: nullableLimit(limits.maxCertificates)
  };
}

export function countPaidCourses(courses: any[]) {
  return courses.filter((course) => Number(course?.priceCents || course?.price || 0) > 0)
    .length;
}
