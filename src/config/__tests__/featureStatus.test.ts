import {
  FeatureDefinition,
  getNavigablePersonalTools,
  isFeatureNavigable,
  personalFeatures,
  personalToolFeatures
} from "../featureStatus";
import fs from "node:fs";
import path from "node:path";
import { TOOL_FEATURE_KEY_BY_TOOL_KEY } from "@/features/personal/tools/toolFeatureKeys";

describe("personal feature status manifest", () => {
  test("keeps courses released for every personal account type", () => {
    expect(personalFeatures.courses.status).toBe("release");
    expect(personalFeatures.courses.href).toBe("/home/personal/courses");
  });

  test("keeps personal community described as forum and grow help, not feed ads", () => {
    expect(personalFeatures.community.title).toBe("Forum / Q&A");
    expect(personalFeatures.community.description).toMatch(/Forum discussions/);
    expect(personalFeatures.community.description).toMatch(/Q&A/);
    expect(personalFeatures.community.description).not.toMatch(/feed|campaign|ad/i);
  });

  test("keeps personal production tools product-oriented instead of business-mode copy", () => {
    const toolsHubSource = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "app",
        "home",
        "personal",
        "(tabs)",
        "tools",
        "index.tsx"
      ),
      "utf8"
    );

    expect(toolsHubSource).toContain('business_production: "Products & Production"');
    expect(toolsHubSource).not.toContain('business_production: "Business & Production"');
  });

  test("only release tools are navigable by default", () => {
    expect(
      getNavigablePersonalTools().every((feature) => isFeatureNavigable(feature))
    ).toBe(true);
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

  test("does not expose the old crop steering scaffold", () => {
    const cropSteering = personalToolFeatures.find(
      (feature) => feature.key === "tools.crop_steering"
    );

    expect(cropSteering?.status).toBe("remove_from_user_app");
    expect(cropSteering?.href).toBeUndefined();
    expect(getNavigablePersonalTools()).not.toContain(cropSteering);
  });

  test("requires every navigable tool to have a route", () => {
    expect(getNavigablePersonalTools().every((feature) => Boolean(feature.href))).toBe(
      true
    );
  });

  test("keeps every personal tools href backed by a route file", () => {
    const toolsDir = path.join(
      process.cwd(),
      "src",
      "app",
      "home",
      "personal",
      "(tabs)",
      "tools"
    );
    const betaNavigable = getNavigablePersonalTools({ allowBetaSurfaces: true });
    const missingRoutes = betaNavigable
      .map((feature) => feature.href || "")
      .filter((href) => href.startsWith("/home/personal/tools/"))
      .map((href) => href.replace("/home/personal/tools/", "") || "index")
      .filter((route) => route !== "index")
      .filter((route) => {
        const routeFile = path.join(toolsDir, `${route}.tsx`);
        const routeIndex = path.join(toolsDir, route, "index.tsx");
        return !fs.existsSync(routeFile) && !fs.existsSync(routeIndex);
      });

    expect(missingRoutes).toEqual([]);
  });

  test("keeps backend calculator tool keys wired to feature entries and API routes", () => {
    const byKey = Object.fromEntries(
      personalToolFeatures.map((feature) => [feature.key, feature])
    ) as Record<string, FeatureDefinition>;
    const routeSource = fs.readFileSync(
      path.join(process.cwd(), "backend", "routes", "tools.js"),
      "utf8"
    );
    const backendRoutes = new Set(
      [
        ...Array.from(routeSource.matchAll(/calculatorRoute\(\s*["']\/([^"']+)["']/g)),
        ...Array.from(routeSource.matchAll(/router\.post\(\s*["']\/([^"']+)["']/g))
      ].map((match) => match[1])
    );

    for (const [toolKey, featureKey] of Object.entries(TOOL_FEATURE_KEY_BY_TOOL_KEY)) {
      expect(byKey[featureKey]).toBeTruthy();
      expect(["release", "beta"]).toContain(byKey[featureKey].status);
      expect(backendRoutes.has(toolKey)).toBe(true);
    }
  });

  test("keeps release personal tools open at the catalog level", () => {
    const broadlyUsefulTools = [
      "tools.environment_analysis",
      "tools.watering",
      "tools.vpd",
      "tools.dew_point_guard",
      "tools.ppfd_dli"
    ];

    for (const key of broadlyUsefulTools) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(feature?.status).toBe("release");
      expect(feature && "capabilityKey" in feature).toBe(false);
    }
  });

  test("marks pro-gated release tools with the same capability used by their screens", () => {
    const byKey = Object.fromEntries(
      personalToolFeatures.map((feature) => [feature.key, feature])
    ) as Record<string, FeatureDefinition>;

    expect(byKey["tools.ai_diagnosis"].capabilityKey).toBe("DIAGNOSE_AI");
    expect(byKey["tools.ai_assistant"].capabilityKey).toBe("AI_ASSISTANT");
    expect(byKey["tools.feeding_schedule"].capabilityKey).toBe("FEEDING_SCHEDULE");
    expect(byKey["tools.harvest_estimator"]).toBeUndefined();
    expect(byKey["tools.timeline_planner"].capabilityKey).toBe("TOOL_TIMELINE_PLANNER");
    expect(byKey["tools.pdf_export"].capabilityKey).toBe("TOOL_PDF_EXPORT");
    expect(byKey["tools.pheno_matrix"].capabilityKey).toBe("TOOL_PHENO_MATRIX");
  });

  test("exposes only release-ready module routes without exposing fake redirects", () => {
    const releaseRoutes = {
      "tools.vpd": "/home/personal/tools/vpd",
      "tools.dew_point_guard": "/home/personal/tools/dew-point-guard",
      "tools.ppfd_dli": "/home/personal/tools/ppfd",
      "tools.npk_recipe": "/home/personal/tools/recipe-builder",
      "tools.ai_diagnosis": "/home/personal/diagnose",
      "tools.ai_assistant": "/home/personal/ai",
      "tools.integrations": "/home/personal/tools/integrations"
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

  test("exposes approved beta tools only when beta surfaces are enabled", () => {
    const approvedBetaTools = [
      "tools.soil_builder",
      "tools.dry_amendment_mix",
      "tools.topdress_planner",
      "tools.ph_ec_adjustment",
      "tools.ipm_scout",
      "tools.species_crop_identification",
      "tools.run_comparison",
      "tools.soil_nutrient_batch_planner"
    ];

    const defaultNavigable = getNavigablePersonalTools();
    const betaNavigable = getNavigablePersonalTools({ allowBetaSurfaces: true });
    for (const key of approvedBetaTools) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(feature?.status).toBe("beta");
      expect(defaultNavigable).not.toContain(feature);
      expect(betaNavigable).toContain(feature);
    }
  });

  test("keeps grow lifecycle workflows in grow workspaces instead of the generic hub", () => {
    const workspaceOnly = [
      "tools.watering",
      "tools.feeding_schedule",
      "tools.timeline_planner",
      "tools.pheno_matrix",
      "tools.crop_steering_projects",
      "tools.stress_testing",
      "tools.pheno_hunting",
      "tools.genetics_inventory",
      "tools.tissue_culture",
      "tools.dry_cure_guard",
      "tools.clone_rooting",
      "tools.harvest_readiness_ai",
      "tools.auto_grow_calendar"
    ];
    const hub = getNavigablePersonalTools({ allowBetaSurfaces: true });
    for (const key of workspaceOnly) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature?.hubVisible).toBe(false);
      expect(feature?.href).toBeTruthy();
      expect(hub).not.toContain(feature);
    }
  });

  test("keeps removed/internal-only tools out of the user-facing app", () => {
    const removedTools = ["tools.bud_rot_risk", "tools.crop_steering", "tools.inventory"];
    const betaNavigable = getNavigablePersonalTools({ allowBetaSurfaces: true });
    for (const key of removedTools) {
      const feature = personalToolFeatures.find((item) => item.key === key);
      expect(feature).toBeTruthy();
      expect(["remove_from_user_app", "internal_ai_only"]).toContain(feature?.status);
      expect(betaNavigable).not.toContain(feature);
    }
  });

  test("places tools in their release categories", () => {
    const byKey = Object.fromEntries(
      personalToolFeatures.map((feature) => [feature.key, feature])
    );

    expect(byKey["tools.ai_diagnosis"].area).toBe("plant_health");
    expect(byKey["tools.ai_assistant"].area).toBe("plant_health");
    expect(byKey["tools.ai_assistant"].status).toBe("release");
    expect(byKey["tools.ai_assistant"].href).toBe("/home/personal/ai");
    expect(byKey["tools.ipm_scout"].area).toBe("plant_health");
    expect(byKey["tools.npk_recipe"].area).toBe("water_nutrients");
    expect(byKey["tools.soil_builder"].area).toBe("water_nutrients");
    expect(byKey["tools.soil_builder"].status).toBe("beta");
    expect(byKey["tools.soil_builder"].href).toBe("/home/personal/tools/soil-builder");
    expect(byKey["tools.dry_amendment_mix"].status).toBe("beta");
    expect(byKey["tools.topdress_planner"].status).toBe("beta");
    expect(byKey["tools.ph_ec_adjustment"].status).toBe("beta");
    expect(byKey["tools.dry_cure_guard"].status).toBe("beta");
    expect(byKey["tools.nutrient_source_comparison"].status).toBe("release");
    expect(byKey["tools.product_ingredient_library"].status).toBe("release");
    expect(byKey["tools.product_ingredient_library"].href).toBe(
      "/home/personal/tools/ingredient-library"
    );
    expect(byKey["tools.stress_testing"].status).toBe("beta");
    expect(byKey["tools.stress_testing"].href).toBe("/home/personal/tools/stress-test");
    expect(byKey["tools.clone_rooting"].status).toBe("beta");
    expect(byKey["tools.clone_rooting"].href).toBe("/home/personal/tools/clone-rooting");
    expect(byKey["tools.run_comparison"].status).toBe("beta");
    expect(byKey["tools.run_comparison"].href).toBe(
      "/home/personal/tools/run-comparison"
    );
    expect(byKey["tools.auto_grow_calendar"].status).toBe("beta");
    expect(byKey["tools.auto_grow_calendar"].href).toBe(
      "/home/personal/tools/auto-grow-calendar"
    );
    expect(byKey["tools.tissue_culture"].status).toBe("beta");
    expect(byKey["tools.tissue_culture"].href).toBe(
      "/home/personal/tools/tissue-culture"
    );
    expect(byKey["tools.soil_nutrient_batch_planner"].status).toBe("beta");
    expect(byKey["tools.soil_nutrient_batch_planner"].href).toBe(
      "/home/personal/tools/soil-nutrient-batch"
    );
    expect(byKey["tools.crop_steering_projects"].area).toBe("crop_management");
    expect(byKey["tools.crop_steering_projects"].status).toBe("beta");
    expect(byKey["tools.crop_steering_projects"].href).toBe(
      "/home/personal/tools/crop-steering-project"
    );
    expect(byKey["tools.timeline_planner"].area).toBe("planning_records");
    expect(byKey["tools.pheno_matrix"].area).toBe("genetics");
    expect(byKey["tools.pheno_hunting"].status).toBe("beta");
    expect(byKey["tools.pheno_hunting"].href).toBe("/home/personal/tools/pheno-hunt");
    expect(byKey["tools.genetics_inventory"].status).toBe("beta");
    expect(byKey["tools.genetics_inventory"].href).toBe(
      "/home/personal/tools/genetics-inventory"
    );
    expect(byKey["tools.ipm_scout"].status).toBe("beta");
    expect(byKey["tools.ipm_scout"].href).toBe("/home/personal/tools/ipm-scout");
    expect(byKey["tools.species_crop_identification"].status).toBe("beta");
    expect(byKey["tools.species_crop_identification"].href).toBe(
      "/home/personal/tools/species-crop-id"
    );
    expect(byKey["tools.harvest_readiness_ai"].status).toBe("beta");
    expect(byKey["tools.harvest_readiness_ai"].href).toBe(
      "/home/personal/tools/harvest-readiness"
    );
    expect(byKey["tools.inventory"].status).toBe("remove_from_user_app");
    expect(byKey["tools.inventory"].href).toBeUndefined();
    expect(byKey["tools.soil_nutrient_batch_planner"].title).not.toMatch(
      /Living Soil Labs/i
    );
    expect(byKey["tools.grow_aware_ai_assistant"]).toBeUndefined();
    expect(byKey["tools.grow_log_auto_tagging"]).toBeUndefined();
    expect(byKey["tools.compatibility_checker"]).toBeUndefined();
    expect(byKey["tools.organism_library"]).toBeUndefined();
    expect(byKey["tools.regional_invasive_alerts"]).toBeUndefined();
    expect(byKey["tools.diagnosis_rules"]).toBeUndefined();
    expect(byKey["tools.crop_profile_database"]).toBeUndefined();
    expect(byKey["tools.tissue_culture"].area).toBe("lab_tc");
    expect(byKey["tools.soil_nutrient_batch_planner"].area).toBe("business_production");
  });
});
