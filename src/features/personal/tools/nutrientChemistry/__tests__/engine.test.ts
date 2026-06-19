import {
  buildReleaseTimeline,
  checkCompatibility,
  getIngredientById,
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
    const warnings = checkCompatibility(
      [ingredient("calcium-nitrate"), ingredient("bone-meal")],
      { ...environment, isConcentrate: true }
    );

    expect(warnings.some((warning) => warning.includes("precipitate"))).toBe(true);
  });

  it("warns when multiple high-EC soluble inputs are combined", () => {
    const warnings = checkCompatibility(
      [ingredient("calcium-nitrate"), ingredient("ammonium-sulfate")],
      environment
    );

    expect(warnings.some((warning) => warning.includes("High-EC"))).toBe(true);
  });
});
