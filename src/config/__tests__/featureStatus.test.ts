import {
  getNavigablePersonalTools,
  isFeatureNavigable,
  personalToolFeatures
} from "../featureStatus";

describe("personal feature status manifest", () => {
  test("only release tools are navigable by default", () => {
    expect(getNavigablePersonalTools().every(isFeatureNavigable)).toBe(true);
    expect(
      getNavigablePersonalTools().every((feature) => feature.status === "release")
    ).toBe(true);
  });

  test("beta tools require an explicit visibility opt-in", () => {
    const betaTool = {
      key: "tools.experimental",
      title: "Experimental",
      description: "Internal experiment.",
      area: "environment" as const,
      status: "beta" as const,
      href: "/home/personal/tools/experimental",
      internalNote: "Only visible when beta surfaces are deliberately enabled."
    };

    expect(isFeatureNavigable(betaTool)).toBe(false);
    expect(isFeatureNavigable(betaTool, { allowBetaSurfaces: true })).toBe(true);
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

  test("keeps release personal tools open at the catalog level", () => {
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
      expect(feature?.status).toBe("release");
      expect(feature && "capabilityKey" in feature).toBe(false);
    }
  });

  test("records planned v1 tools without exposing fake routes", () => {
    const plannedTools = [
      "tools.soil_builder",
      "tools.dry_amendment_mix",
      "tools.topdress_planner",
      "tools.ph_ec_adjustment",
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
      "tools.living_soil_batch_production",
      "tools.inventory"
    ];

    const navigable = getNavigablePersonalTools();
    for (const key of plannedTools) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(feature?.status).toBe("planned");
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
    expect(byKey["tools.pheno_hunting"].description).toMatch(/terpene\/flavor/i);
    expect(byKey["tools.genetics_inventory"].description).toMatch(/breeding lane/i);
    expect(byKey["tools.grow_aware_ai_assistant"]).toBeUndefined();
    expect(byKey["tools.grow_log_auto_tagging"]).toBeUndefined();
    expect(byKey["tools.nutrient_source_comparison"]).toBeUndefined();
    expect(byKey["tools.compatibility_checker"]).toBeUndefined();
    expect(byKey["tools.organism_library"]).toBeUndefined();
    expect(byKey["tools.regional_invasive_alerts"]).toBeUndefined();
    expect(byKey["tools.diagnosis_rules"]).toBeUndefined();
    expect(byKey["tools.product_ingredient_library"]).toBeUndefined();
    expect(byKey["tools.crop_profile_database"]).toBeUndefined();
    expect(byKey["tools.tissue_culture"].area).toBe("lab_tc");
    expect(byKey["tools.living_soil_batch_production"].area).toBe("business_production");
  });
});
