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

  test("records future tools in the backlog without exposing fake routes", () => {
    const backlogTools = [
      "tools.soil_builder",
      "tools.dry_amendment_mix",
      "tools.topdress_planner",
      "tools.ph_ec_adjustment",
      "tools.nutrient_release_chemistry",
      "tools.crop_steering_projects",
      "tools.stress_testing",
      "tools.pheno_hunting",
      "tools.genetics_inventory",
      "tools.tissue_culture",
      "tools.dry_cure_guard",
      "tools.clone_rooting",
      "tools.ipm_scout",
      "tools.species_crop_identification",
      "tools.harvest_readiness_ai",
      "tools.run_comparison",
      "tools.auto_grow_calendar",
      "tools.product_ingredient_library",
      "tools.crop_profile_database"
    ];

    const navigable = getNavigablePersonalTools();
    for (const key of backlogTools) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(feature?.status).toBe("backlog");
      expect(feature?.href).toBeUndefined();
      expect(navigable).not.toContain(feature);
    }
  });

  test("places tools in their release categories", () => {
    const byKey = Object.fromEntries(
      personalToolFeatures.map((feature) => [feature.key, feature])
    );

    expect(byKey["tools.ai_diagnosis"].area).toBe("plant_health");
    expect(byKey["tools.ipm_scout"].area).toBe("plant_health");
    expect(byKey["tools.npk_recipe"].area).toBe("water_nutrients");
    expect(byKey["tools.soil_builder"].area).toBe("water_nutrients");
    expect(byKey["tools.crop_steering_projects"].area).toBe("crop_management");
    expect(byKey["tools.timeline_planner"].area).toBe("planning_records");
    expect(byKey["tools.pheno_matrix"].area).toBe("genetics");
    expect(byKey["tools.tissue_culture"].area).toBe("lab_tc");
  });
});
