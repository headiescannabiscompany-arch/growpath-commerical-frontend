import { buildToolPlantContext } from "../ToolPlantContextPicker";

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
});
