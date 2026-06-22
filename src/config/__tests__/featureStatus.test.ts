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

  test("gates endpoint-backed AI tools with canonical capabilities", () => {
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.ai_diagnosis")
        ?.capabilityKey
    ).toBe("DIAGNOSE_AI");
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.feeding_schedule")
        ?.capabilityKey
    ).toBe("FEEDING_SCHEDULE");
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.environment_analysis")
        ?.capabilityKey
    ).toBe("AI_ASSISTANT");
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.pheno_matrix")
        ?.capabilityKey
    ).toBe("TOOL_PHENO_MATRIX");
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.harvest_estimator")
        ?.capabilityKey
    ).toBe("TOOL_HARVEST_ESTIMATOR");
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.timeline_planner")
        ?.capabilityKey
    ).toBe("TOOL_TIMELINE_PLANNER");
    expect(
      personalToolFeatures.find((feature) => feature.key === "tools.pdf_export")
        ?.capabilityKey
    ).toBe("TOOL_PDF_EXPORT");
  });
});
