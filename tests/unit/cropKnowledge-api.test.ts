const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  createCropProfile,
  createOrganismProfile,
  archiveCropProfile,
  archiveOrganismProfile,
  listCropProfiles,
  listRegionalAlerts,
  savePlantGrowthProfile,
  seedStarterCropProfiles,
  updateCropProfile,
  updateOrganismProfile
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

  it("calls the admin-gated starter crop profile seed endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      count: 8,
      curationStatus: "needs_license_review",
      items: [{ cropKey: "tomato" }]
    });

    await expect(seedStarterCropProfiles()).resolves.toEqual({
      count: 8,
      curationStatus: "needs_license_review",
      items: [{ cropKey: "tomato" }]
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/crop-knowledge/crop-profiles/starter-seed",
      {
        method: "POST"
      }
    );
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

  it("updates and archives crop and organism records through detail endpoints", async () => {
    mockApiRequest.mockResolvedValueOnce({ item: { id: "crop-1" } });
    mockApiRequest.mockResolvedValueOnce({ archived: true });
    mockApiRequest.mockResolvedValueOnce({ item: { id: "org-1" } });
    mockApiRequest.mockResolvedValueOnce({ archived: true });

    await expect(
      updateCropProfile("crop-1", { displayName: "Updated" })
    ).resolves.toEqual({
      id: "crop-1"
    });
    await expect(archiveCropProfile("crop-1")).resolves.toBe(true);
    await expect(
      updateOrganismProfile("org-1", { organismType: "beneficial" })
    ).resolves.toEqual({ id: "org-1" });
    await expect(archiveOrganismProfile("org-1")).resolves.toBe(true);

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/api/crop-knowledge/crop-profiles/crop-1",
      { method: "PATCH", body: { displayName: "Updated" } }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/crop-knowledge/crop-profiles/crop-1",
      { method: "DELETE" }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/crop-knowledge/organisms/org-1",
      { method: "PATCH", body: { organismType: "beneficial" } }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/crop-knowledge/organisms/org-1",
      { method: "DELETE" }
    );
  });

  it("saves plant growth overlays for size, pheno, timing, and water use", async () => {
    await savePlantGrowthProfile({
      plantId: "plant-1",
      cropProfileId: "crop-1",
      cultivarName: "Cherry tomato",
      phenoLabel: "P1",
      keeperStatus: "keeper",
      keeperReason: "Strong vigor, resin, and stress response.",
      cloneStatus: "rooted",
      motherStatus: "candidate",
      confirmationStatus: "user_confirmed",
      phenoScores: [
        {
          scoredAt: "2026-07-09T00:00:00.000Z",
          stage: "flower",
          vigor: 8,
          resin: 9,
          stressTolerance: 8
        }
      ],
      stageScorecards: [
        {
          stage: "veg",
          vigor: 8,
          morphology: 7,
          stressResponse: 8,
          notes: "Did not falter under dryback stress."
        }
      ],
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
          phenoLabel: "P1",
          keeperStatus: "keeper",
          keeperReason: "Strong vigor, resin, and stress response.",
          cloneStatus: "rooted",
          motherStatus: "candidate",
          phenoScores: [
            expect.objectContaining({
              stage: "flower",
              vigor: 8,
              resin: 9,
              stressTolerance: 8
            })
          ],
          stageScorecards: [
            expect.objectContaining({
              stage: "veg",
              vigor: 8,
              morphology: 7,
              stressResponse: 8
            })
          ],
          sizeMetrics: { canopyWidthCm: 75 },
          timingAdjustments: { fruitingDaysOffset: 7 }
        })
      }
    );
  });
});
