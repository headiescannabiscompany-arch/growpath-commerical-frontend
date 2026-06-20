import {
  analyzeCompatibility,
  buildReleaseTimeline,
  checkCompatibility,
  estimateReleaseCurve,
  getIngredientById,
  getIngredientEvidence,
  recommendIngredients,
  type NutrientEnvironment,
  type NutrientIngredient
} from "../engine";

const environment: NutrientEnvironment = {
  stage: "veg",
  soilTempC: 22,
  moisture: "moderate",
  microbialActivity: "moderate",
  pH: 6.4,
  daysUntilNeed: 7,
  livingSoil: true,
  isConcentrate: false
};

function ingredient(id: string): NutrientIngredient {
  const result = getIngredientById(id);
  if (!result) throw new Error(`Missing test ingredient: ${id}`);
  return result;
}

describe("nutrient chemistry release timeline", () => {
  it("places an adjusted release range in each overlapping fixed window", () => {
    const timeline = buildReleaseTimeline([ingredient("feather-meal")], environment);

    expect(timeline.map((window) => window.label)).toEqual([
      "0-3 days",
      "3-14 days",
      "14-45 days",
      "45-120 days",
      "120+ days"
    ]);
    expect(timeline.find((window) => window.key === "120d_plus")?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ingredientId: "feather-meal", nutrient: "nitrogen" })
      ])
    );
  });
});

describe("nutrient chemistry compatibility", () => {
  it("warns about calcium and phosphate precipitation in concentrate", () => {
    const ingredients = [ingredient("calcium-nitrate"), ingredient("bone-meal")];
    const concentrateEnvironment = { ...environment, isConcentrate: true };
    const warnings = checkCompatibility(ingredients, concentrateEnvironment);
    const issue = analyzeCompatibility(ingredients, concentrateEnvironment).issues.find(
      (row) => row.code === "concentrate_precipitation"
    );

    expect(warnings.some((warning) => warning.includes("precipitate"))).toBe(true);
    expect(issue).toEqual({
      code: "concentrate_precipitation",
      severity: "high",
      message:
        "Calcium salts and phosphate sources can precipitate in concentrated stock solutions.",
      remediation: "Separate incompatible materials into A/B stock solutions.",
      ingredientIds: ["calcium-nitrate", "bone-meal"]
    });
  });

  it("retains the legacy warning API for structured compatibility issues", () => {
    const warnings = checkCompatibility(
      [ingredient("calcium-nitrate"), ingredient("bone-meal")],
      { ...environment, isConcentrate: true }
    );

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Separate incompatible materials into A/B stock solutions"
        )
      ])
    );
  });

  it("warns when multiple high-EC soluble inputs are combined", () => {
    const warnings = checkCompatibility(
      [ingredient("calcium-nitrate"), ingredient("ammonium-sulfate")],
      environment
    );

    expect(warnings.some((warning) => warning.includes("High-EC"))).toBe(true);
  });

  it("warns when lime is selected for already alkaline media", () => {
    const warnings = checkCompatibility([ingredient("calcitic-lime")], {
      ...environment,
      pH: 7.6
    });

    expect(warnings.some((warning) => warning.includes("already high-pH"))).toBe(true);
  });

  it("uses entered product rates for EC and antagonism screening", () => {
    const analysis = analyzeCompatibility(
      [ingredient("calcium-nitrate"), ingredient("epsom-salt")],
      environment,
      { "calcium-nitrate": 3, "epsom-salt": 0.1 }
    );

    expect(analysis.estimatedEcContribution).toBeCloseTo(2.615);
    expect(analysis.nutrientLoadsGPerL?.Ca).toBeCloseTo(0.57);
    expect(analysis.nutrientLoadsGPerL?.Mg).toBeCloseTo(0.01);
    expect(analysis.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("above this model's 2 g/L"),
        expect.stringContaining("approximately 2.61 mS/cm"),
        expect.stringContaining("calcium-weighted")
      ])
    );
  });

  it("uses lab analysis overrides in rate-weighted nutrient loads", () => {
    const analysis = analyzeCompatibility(
      [ingredient("calcium-nitrate")],
      environment,
      { "calcium-nitrate": 1 },
      { "calcium-nitrate": { Ca: 10, N: 12 } }
    );

    expect(analysis.nutrientLoadsGPerL?.Ca).toBeCloseTo(0.1);
    expect(analysis.nutrientLoadsGPerL?.N).toBeCloseTo(0.12);
    expect(analysis.appliedLabOverrides["calcium-nitrate"]).toEqual({
      Ca: 10,
      N: 12
    });
  });

  it("attaches a supplied manufacturer or reference URL to evidence", () => {
    const evidence = getIngredientEvidence(
      ingredient("calcium-nitrate"),
      "https://example.test/calcium-nitrate-analysis"
    );

    expect(evidence.reference).toBe("https://example.test/calcium-nitrate-analysis");
  });
});

describe("nutrient chemistry form intelligence", () => {
  it("prefers a chelate whose stability covers the selected alkaline pH", () => {
    const ranked = recommendIngredients("iron", "high_pH_iron", {
      ...environment,
      pH: 8
    });

    expect(ranked[0].ingredient.id).toBe("fe-eddha");
    expect(ranked.find((row) => row.ingredient.id === "fe-edta")?.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining("not dependable")])
    );
  });

  it("exposes explicit nitrogen and chelate metadata", () => {
    expect(ingredient("urea").nutrientForms[0].nitrogenForm).toBe("urea");
    expect(ingredient("fe-dtpa").nutrientForms[0].chelate).toEqual({
      agent: "DTPA",
      stableThroughPH: 7.5
    });
  });

  it("activates structured nitrogen risks from the selected environment", () => {
    const wetNitrate = estimateReleaseCurve(ingredient("calcium-nitrate"), {
      ...environment,
      moisture: "wet"
    }).find((form) => form.nitrogenForm === "nitrate");
    const alkalineUrea = estimateReleaseCurve(ingredient("urea"), {
      ...environment,
      pH: 7.8
    })[0];

    expect(wetNitrate?.activeNitrogenRisks).toEqual([
      expect.objectContaining({ code: "leaching", severity: "high" })
    ]);
    expect(alkalineUrea.activeNitrogenRisks).toEqual([
      expect.objectContaining({ code: "volatilization", condition: "high_ph" })
    ]);
  });

  it("surfaces active nitrogen risk mitigation in compatibility output", () => {
    const warnings = checkCompatibility([ingredient("ammonium-sulfate")], environment);

    expect(
      warnings.some(
        (warning) =>
          warning.includes("Nitrogen risk (medium)") &&
          warning.includes("Track root-zone pH")
      )
    ).toBe(true);
  });
});
