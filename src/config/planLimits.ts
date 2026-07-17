import { FREE_POLICY } from "./freePolicy";

export const PLAN_LIMITS = {
  free: {
    maxGrows: FREE_POLICY.maxTrackedGrows,
    maxPlants: FREE_POLICY.maxTrackedPlants,
    maxPaidCourses: FREE_POLICY.maxPublishedPaidCourses,
    maxLessonsPerCourse: FREE_POLICY.maxLessonsPerCourse
  },
  pro: {
    maxGrows: 10,
    maxPlants: 50,
    maxPaidCourses: 5,
    maxLessonsPerCourse: 20
  },
  commercial: {
    maxGrows: 50,
    maxPlants: 500,
    maxPaidCourses: 50,
    maxLessonsPerCourse: 100
  },
  facility: {
    maxGrows: 200,
    maxPlants: 2000,
    maxPaidCourses: 50,
    maxLessonsPerCourse: 100
  }
} as const;

export function fallbackPlanLimits(plan: string | null | undefined) {
  const key = String(plan || "free").toLowerCase() as keyof typeof PLAN_LIMITS;
  return PLAN_LIMITS[key] || PLAN_LIMITS.free;
}
