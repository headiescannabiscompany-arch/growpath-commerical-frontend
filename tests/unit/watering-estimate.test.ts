import { buildWateringEstimate } from "@/features/personal/tools/wateringEstimate";

describe("buildWateringEstimate", () => {
  it("adjusts watering volume for large high-demand plants", () => {
    const result = buildWateringEstimate({
      potLiters: 20,
      runoffPct: 10,
      intervalDays: 2,
      plantGrowthProfile: {
        confirmationStatus: "user_confirmed",
        sizeMetrics: { canopyWidthCm: 140 },
        waterUseProfile: { observedDemand: "high" }
      }
    });

    expect(result.plantAdjustmentFactor).toBe(1.38);
    expect(result.plantAdjustmentLabel).toBe("+38%");
    expect(result.plantContextApplied).toBe(true);
    expect(result.plantContextRequiresConfirmation).toBe(false);
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
        confirmationStatus: "reviewed",
        sizeMetrics: { canopyWidthCm: 35 },
        waterUseProfile: { observedDemand: "low" }
      }
    });

    expect(result.plantAdjustmentFactor).toBe(0.72);
    expect(result.plantAdjustmentLabel).toBe("-28%");
    expect(result.targetLiters).toBe("1.58");
  });

  it("does not apply plant overlay until the crop/profile context is confirmed", () => {
    const result = buildWateringEstimate({
      potLiters: 20,
      runoffPct: 10,
      intervalDays: 2,
      plantGrowthProfile: {
        confirmationStatus: "needs_confirmation",
        sizeMetrics: { canopyWidthCm: 140 },
        waterUseProfile: { observedDemand: "high" }
      }
    });

    expect(result.plantAdjustmentFactor).toBe(1);
    expect(result.plantAdjustmentLabel).toBe("none");
    expect(result.plantContextApplied).toBe(false);
    expect(result.plantContextRequiresConfirmation).toBe(true);
    expect(result.plantContextReasons).toEqual([
      "canopy 140 cm",
      "observed water demand high"
    ]);
    expect(result.targetLiters).toBe("4.84");
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
    expect(result.plantContextRequiresConfirmation).toBe(false);
    expect(result.targetLiters).toBe("2.42");
  });

  it("flags high-pressure dryback and poor recovery", () => {
    const result = buildWateringEstimate({
      potLiters: 20,
      runoffPct: 10,
      intervalDays: 2,
      medium: "coco",
      stage: "flower",
      targetDrybackPercent: 20,
      actualDrybackPercent: 34,
      vpdKpa: 1.7,
      recentRunoffPct: 1,
      recoveryTimeHours: 30,
      leafResponse: "wilt and stalled"
    });

    expect(result.pressureLevel).toBe("high");
    expect(result.wateringIntent).toBe("generative");
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "Actual dryback exceeded the target by a meaningful margin.",
        "Dryback is high enough to treat as steering pressure, not routine watering.",
        "Very low runoff in coco/salt-style systems can increase salt buildup risk.",
        "High VPD can speed dryback and increase irrigation demand.",
        "Recovery longer than 24 hours suggests the previous dryback or irrigation pressure was too high.",
        "Leaf response suggests this watering/dryback pattern may be causing stress damage."
      ])
    );
    expect(result.recommendations[0]).toContain("Reduce dryback");
    expect(result.tasksToCreate[0]).toMatchObject({
      title: "Check plant recovery after watering",
      priority: "high"
    });
  });

  it("warns against hard drybacks for seedlings and clones", () => {
    const result = buildWateringEstimate({
      potLiters: 4,
      runoffPct: 0,
      intervalDays: 1,
      medium: "living_soil",
      stage: "clone",
      targetDrybackPercent: 18
    });

    expect(result.wateringIntent).toBe("vegetative_or_recovery");
    expect(result.warnings).toContain("Fresh clones and seedlings should avoid hard drybacks.");
    expect(result.recommendations).toContain(
      "For veg/recovery, prioritize stable moisture, turgor, and root growth over hard dryback pressure."
    );
  });
});
