import {
  getNavigablePersonalTools,
  isFeatureNavigable,
  personalToolFeatures
} from "../featureStatus";

describe("personal feature status manifest", () => {
  test("only implemented and beta tools are navigable", () => {
    expect(getNavigablePersonalTools().every(isFeatureNavigable)).toBe(true);
  });

  test("does not expose the crop steering scaffold", () => {
    const cropSteering = personalToolFeatures.find(
      (feature) => feature.key === "tools.crop_steering"
    );

    expect(cropSteering?.status).toBe("hidden");
    expect(getNavigablePersonalTools()).not.toContain(cropSteering);
  });

  test("requires every navigable tool to have a route", () => {
    expect(getNavigablePersonalTools().every((feature) => Boolean(feature.href))).toBe(
      true
    );
  });

  test("keeps navigable personal tools open at the catalog level", () => {
    const broadlyUsefulTools = [
      "tools.ai_diagnosis",
      "tools.feeding_schedule",
      "tools.environment_analysis",
      "tools.pheno_matrix",
      "tools.harvest_estimator",
      "tools.timeline_planner",
      "tools.pdf_export"
    ];

    for (const key of broadlyUsefulTools) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(feature && "capabilityKey" in feature).toBe(false);
    }
  });
});
