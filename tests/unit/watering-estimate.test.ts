import { buildWateringEstimate } from "@/features/personal/tools/wateringEstimate";

describe("buildWateringEstimate", () => {
  it("adjusts watering volume for large high-demand plants", () => {
    const result = buildWateringEstimate({
      potLiters: 20,
      runoffPct: 10,
      intervalDays: 2,
      plantGrowthProfile: {
        sizeMetrics: { canopyWidthCm: 140 },
        waterUseProfile: { observedDemand: "high" }
      }
    });

    expect(result.plantAdjustmentFactor).toBe(1.38);
    expect(result.plantAdjustmentLabel).toBe("+38%");
    expect(result.plantContextApplied).toBe(true);
    expect(result.plantContextReasons).toEqual([
      "canopy 140 cm",
      "observed water demand high"
    ]);
    expect(result.targetLiters).toBe("6.68");
  });

  it("reduces watering estimate for compact low-demand plants", () => {
    const result = buildWateringEstimate({
      potLiters: 10,
      runoffPct: 0,
      intervalDays: 3,
      plantGrowthProfile: {
        sizeMetrics: { canopyWidthCm: 35 },
        waterUseProfile: { observedDemand: "low" }
      }
    });

    expect(result.plantAdjustmentFactor).toBe(0.72);
    expect(result.plantAdjustmentLabel).toBe("-28%");
    expect(result.targetLiters).toBe("1.58");
  });

  it("keeps the old base heuristic when no plant overlay is present", () => {
    const result = buildWateringEstimate({
      potLiters: 10,
      runoffPct: 10,
      intervalDays: 2
    });

    expect(result.plantAdjustmentFactor).toBe(1);
    expect(result.plantAdjustmentLabel).toBe("none");
    expect(result.plantContextApplied).toBe(false);
    expect(result.targetLiters).toBe("2.42");
  });
});
