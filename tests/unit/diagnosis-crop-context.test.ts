import { diagnosisCropContextState } from "@/features/personal/diagnosis/diagnosisCropContext";

describe("diagnosisCropContextState", () => {
  it("warns when no crop context is available", () => {
    const state = diagnosisCropContextState(null, "");

    expect(state.status).toBe("missing");
    expect(state.title).toBe("Crop context missing");
    expect(state.message).toMatch(/general plant-health triage/i);
  });

  it("treats entered or selected crop context as unconfirmed without a confirmed profile", () => {
    const state = diagnosisCropContextState(
      {
        name: "Orchard tree",
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cultivarOrStrain: "Arbequina",
        cropProfileId: "crop-olive-1",
        growthProfile: {
          confirmationStatus: "needs_review"
        }
      },
      ""
    );

    expect(state.status).toBe("unconfirmed");
    expect(state.message).toMatch(/Olive \/ Olea europaea \/ Arbequina/);
    expect(state.details.join(" ")).toMatch(/Do not apply cannabis defaults/i);
  });

  it("shows confirmed crop, size, timing, water demand, and pheno context", () => {
    const state = diagnosisCropContextState(
      {
        name: "Olive #1",
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cultivarOrStrain: "Arbequina",
        cropProfileId: "crop-olive-1",
        growthProfile: {
          confirmationStatus: "user_confirmed",
          sizeMetrics: { canopyWidthCm: 140 },
          timingAdjustments: { stageDaysOffset: 8 },
          waterUseProfile: { observedDemand: "low" },
          phenoLabel: "compact"
        }
      },
      ""
    );

    expect(state.status).toBe("confirmed");
    expect(state.title).toBe("Confirmed crop context");
    expect(state.details).toContain("Canopy width: 140 cm");
    expect(state.details).toContain("Stage timing offset: 8 days");
    expect(state.details).toContain("Observed water demand: low");
    expect(state.details).toContain("Pheno context: compact");
  });
});
