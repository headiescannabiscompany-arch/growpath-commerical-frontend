import { AI_FEATURES } from "../../src/features/ai/aiFeatureMatrix";

const SUPPORTED_FACILITY_AI = new Set([
  "harvest.analyzeTrichomes",
  "harvest.estimateHarvestWindow",
  "environment.assessDewPointRisk",
  "climate.computeVPD",
  "ec.recommendCorrection",
  "compliance.buildReadinessChecklist",
  "inventory.assessStockRisk"
]);

describe("AI feature matrix", () => {
  it("keeps every enabled facility AI feature mapped to a supported backend tool", () => {
    const unsupported = AI_FEATURES.filter((feature) => feature.enabled)
      .map((feature) => `${feature.tool}.${feature.fn}`)
      .filter((key) => !SUPPORTED_FACILITY_AI.has(key));

    expect(unsupported).toEqual([]);
  });

  it("keeps the expected AI tool surface visible", () => {
    expect(AI_FEATURES.map((feature) => feature.id)).toEqual([
      "harvest-trichomes",
      "harvest-window",
      "climate-vpd",
      "ec-recommend"
    ]);
  });
});
