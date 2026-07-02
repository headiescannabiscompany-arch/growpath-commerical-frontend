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

  test("exposes completed v1 module routes without exposing fake redirects", () => {
    const releaseRoutes = {
      "tools.crop_steering_projects": "/home/personal/tools/crop-steering-project",
      "tools.pheno_hunting": "/home/personal/tools/pheno-hunt",
      "tools.genetics_inventory": "/home/personal/tools/genetics-inventory",
      "tools.ipm_scout": "/home/personal/tools/ipm-scout",
      "tools.species_crop_identification": "/home/personal/tools/species-crop-id",
      "tools.harvest_readiness_ai": "/home/personal/tools/harvest-readiness",
      "tools.inventory": "/home/personal/tools/inventory"
    };

    const navigable = getNavigablePersonalTools();
    for (const [key, href] of Object.entries(releaseRoutes)) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(feature?.status).toBe("release");
      expect(feature?.href).toBe(href);
      expect(navigable).toContain(feature);
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
    expect(byKey["tools.soil_builder"].status).toBe("release");
    expect(byKey["tools.soil_builder"].href).toBe("/home/personal/tools/soil-builder");
    expect(byKey["tools.dry_amendment_mix"].status).toBe("release");
    expect(byKey["tools.topdress_planner"].status).toBe("release");
    expect(byKey["tools.ph_ec_adjustment"].status).toBe("release");
    expect(byKey["tools.dry_cure_guard"].status).toBe("release");
    expect(byKey["tools.nutrient_source_comparison"].status).toBe("release");
    expect(byKey["tools.stress_testing"].status).toBe("release");
    expect(byKey["tools.stress_testing"].href).toBe("/home/personal/tools/stress-test");
    expect(byKey["tools.clone_rooting"].status).toBe("release");
    expect(byKey["tools.clone_rooting"].href).toBe("/home/personal/tools/clone-rooting");
    expect(byKey["tools.run_comparison"].status).toBe("release");
    expect(byKey["tools.run_comparison"].href).toBe("/home/personal/tools/run-comparison");
    expect(byKey["tools.auto_grow_calendar"].status).toBe("release");
    expect(byKey["tools.auto_grow_calendar"].href).toBe("/home/personal/tools/auto-grow-calendar");
    expect(byKey["tools.tissue_culture"].status).toBe("release");
    expect(byKey["tools.tissue_culture"].href).toBe("/home/personal/tools/tissue-culture");
    expect(byKey["tools.living_soil_batch_production"].status).toBe("release");
    expect(byKey["tools.living_soil_batch_production"].href).toBe(
      "/home/personal/tools/living-soil-batch"
    );
    expect(byKey["tools.crop_steering_projects"].area).toBe("crop_management");
    expect(byKey["tools.crop_steering_projects"].status).toBe("release");
    expect(byKey["tools.crop_steering_projects"].href).toBe(
      "/home/personal/tools/crop-steering-project"
    );
    expect(byKey["tools.timeline_planner"].area).toBe("planning_records");
    expect(byKey["tools.pheno_matrix"].area).toBe("genetics");
    expect(byKey["tools.pheno_hunting"].status).toBe("release");
    expect(byKey["tools.pheno_hunting"].href).toBe("/home/personal/tools/pheno-hunt");
    expect(byKey["tools.genetics_inventory"].status).toBe("release");
    expect(byKey["tools.genetics_inventory"].href).toBe(
      "/home/personal/tools/genetics-inventory"
    );
    expect(byKey["tools.ipm_scout"].status).toBe("release");
    expect(byKey["tools.ipm_scout"].href).toBe("/home/personal/tools/ipm-scout");
    expect(byKey["tools.species_crop_identification"].status).toBe("release");
    expect(byKey["tools.species_crop_identification"].href).toBe(
      "/home/personal/tools/species-crop-id"
    );
    expect(byKey["tools.harvest_readiness_ai"].status).toBe("release");
    expect(byKey["tools.harvest_readiness_ai"].href).toBe(
      "/home/personal/tools/harvest-readiness"
    );
    expect(byKey["tools.inventory"].status).toBe("release");
    expect(byKey["tools.inventory"].href).toBe("/home/personal/tools/inventory");
    expect(byKey["tools.pheno_hunting"].description).toMatch(/terpene\/flavor/i);
    expect(byKey["tools.genetics_inventory"].description).toMatch(/breeding lane/i);
    expect(byKey["tools.grow_aware_ai_assistant"]).toBeUndefined();
    expect(byKey["tools.grow_log_auto_tagging"]).toBeUndefined();
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
