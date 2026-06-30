const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  createCropProfile,
  createOrganismProfile,
  listCropProfiles,
  listRegionalAlerts,
  savePlantGrowthProfile
} = require("@/api/cropKnowledge");

describe("crop knowledge API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({ items: [], item: { id: "created" } });
  });

  it("lists crop profiles with query params", async () => {
    mockApiRequest.mockResolvedValueOnce({ items: [{ cropKey: "blueberry" }] });

    await expect(
      listCropProfiles({ q: "blueberry", curationStatus: "reviewed", limit: 10 })
    ).resolves.toEqual([{ cropKey: "blueberry" }]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/crop-knowledge/crop-profiles", {
      params: { q: "blueberry", curationStatus: "reviewed", limit: 10 }
    });
  });

  it("creates crop profiles with source provenance intact", async () => {
    await createCropProfile({
      displayName: "Olive",
      scientificName: "Olea europaea",
      sourceRecords: [
        {
          sourceName: "Extension source queued for review",
          sourceType: "extension",
          license: "review required",
          commercialUseAllowed: false,
          trainingUseAllowed: false,
          confidence: "medium"
        }
      ]
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/crop-knowledge/crop-profiles", {
      method: "POST",
      body: expect.objectContaining({
        displayName: "Olive",
        sourceRecords: [
          expect.objectContaining({
            sourceName: "Extension source queued for review",
            trainingUseAllowed: false
          })
        ]
      })
    });
  });

  it("creates organism profiles and regional alert lookups", async () => {
    await createOrganismProfile({
      scientificName: "Lycorma delicatula",
      commonNames: ["spotted lanternfly"],
      organismType: "invasive",
      pesticideDosingAllowed: false
    });
    await listRegionalAlerts({ organismId: "org-1", region: "US-PA" });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/crop-knowledge/organisms", {
      method: "POST",
      body: expect.objectContaining({
        organismType: "invasive",
        pesticideDosingAllowed: false
      })
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/crop-knowledge/regional-alerts",
      { params: { organismId: "org-1", region: "US-PA" } }
    );
  });

  it("saves plant growth overlays for size, pheno, timing, and water use", async () => {
    await savePlantGrowthProfile({
      plantId: "plant-1",
      cropProfileId: "crop-1",
      cultivarName: "Cherry tomato",
      confirmationStatus: "user_confirmed",
      sizeMetrics: { canopyWidthCm: 75 },
      timingAdjustments: { fruitingDaysOffset: 7 },
      waterUseProfile: { observedDemand: "high" }
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/crop-knowledge/plant-growth-profiles",
      {
        method: "POST",
        body: expect.objectContaining({
          plantId: "plant-1",
          sizeMetrics: { canopyWidthCm: 75 },
          timingAdjustments: { fruitingDaysOffset: 7 }
        })
      }
    );
  });
});
