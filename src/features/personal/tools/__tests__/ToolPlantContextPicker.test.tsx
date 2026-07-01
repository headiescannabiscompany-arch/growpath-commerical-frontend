import {
  buildToolPlantContext,
  buildToolPlantContextSummary
} from "../ToolPlantContextPicker";

describe("buildToolPlantContext", () => {
  it("separates crop identity, cultivar, and growth profile context", () => {
    expect(
      buildToolPlantContext({
        id: "plant-1",
        growId: "grow-1",
        name: "Blueberry row A",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum",
        cultivar: "Duke",
        cropProfileId: "crop-blueberry-1",
        stage: "fruiting",
        medium: "soil",
        growthProfile: {
          phenoLabel: "early-fruiting",
          sizeMetrics: { canopyWidthCm: 120 },
          timingAdjustments: { fruitingDaysOffset: -4 },
          waterUseProfile: { observedDemand: "medium" }
        }
      })
    ).toEqual({
      id: "plant-1",
      name: "Blueberry row A",
      cropCommonName: "Blueberry",
      scientificName: "Vaccinium corymbosum",
      cultivarOrStrain: "Duke",
      cropProfileId: "crop-blueberry-1",
      stage: "fruiting",
      medium: "soil",
      growthProfile: {
        phenoLabel: "early-fruiting",
        sizeMetrics: { canopyWidthCm: 120 },
        timingAdjustments: { fruitingDaysOffset: -4 },
        waterUseProfile: { observedDemand: "medium" }
      }
    });
  });

  it("summarizes plant size, timing, water demand, and pheno context for tool users", () => {
    expect(
      buildToolPlantContextSummary({
        id: "plant-1",
        growId: "grow-1",
        name: "Olive patio tree",
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cultivar: "Arbequina",
        stage: "fruiting",
        medium: "soil",
        growthProfile: {
          phenoLabel: "compact-container",
          sizeMetrics: { canopyWidthCm: 140, heightCm: 95 },
          timingAdjustments: { fruitingDaysOffset: 10 },
          waterUseProfile: { observedDemand: "medium" }
        }
      })
    ).toBe(
      "Olive | Arbequina | canopy 140 cm | height 95 cm | fruiting +10d | water medium | pheno compact-container"
    );
  });
});
