import { FREE_POLICY } from "./freePolicy";

const GB = 1024 * 1024 * 1024;

export const PLAN_LIMITS = {
  free: {
    maxGrows: FREE_POLICY.maxTrackedGrows,
    maxPlants: FREE_POLICY.maxTrackedPlants,
    maxPaidCourses: FREE_POLICY.maxPublishedPaidCourses,
    maxLessonsPerCourse: FREE_POLICY.maxLessonsPerCourse,
    videoStorageBytes: FREE_POLICY.uploadStorageBytes
  },
  pro: {
    maxGrows: 10,
    maxPlants: 50,
    maxPaidCourses: 5,
    maxLessonsPerCourse: 20,
    videoStorageBytes: 10 * GB
  },
  creator_plus: {
    maxGrows: 25,
    maxPlants: 250,
    maxPaidCourses: 25,
    maxLessonsPerCourse: 100,
    videoStorageBytes: 25 * GB
  },
  commercial: {
    maxGrows: 50,
    maxPlants: 500,
    maxPaidCourses: 50,
    maxLessonsPerCourse: 100,
    videoStorageBytes: 50 * GB
  },
  facility: {
    maxGrows: 200,
    maxPlants: 2000,
    maxPaidCourses: 50,
    maxLessonsPerCourse: 100,
    videoStorageBytes: 100 * GB
  }
} as const;

export function fallbackPlanLimits(plan: string | null | undefined) {
  const key = String(plan || "free").toLowerCase() as keyof typeof PLAN_LIMITS;
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}
