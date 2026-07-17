import { fallbackPlanLimits, PLAN_LIMITS } from "../../src/config/planLimits";

describe("paid plan limit fallbacks", () => {
  it("matches the canonical paid plan scale", () => {
    expect(PLAN_LIMITS.pro).toEqual({
      maxGrows: 10,
      maxPlants: 50,
      maxPaidCourses: 5,
      maxLessonsPerCourse: 20
    });
    expect(PLAN_LIMITS.commercial).toEqual({
      maxGrows: 50,
      maxPlants: 500,
      maxPaidCourses: 50,
      maxLessonsPerCourse: 100
    });
    expect(PLAN_LIMITS.facility).toEqual({
      maxGrows: 200,
      maxPlants: 2000,
      maxPaidCourses: 50,
      maxLessonsPerCourse: 100
    });
  });

  it("falls back safely for unknown plans", () => {
    expect(fallbackPlanLimits("unknown")).toBe(PLAN_LIMITS.free);
  });
});
