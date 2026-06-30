const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const { createPersonalPlant, listPersonalPlants } = require("@/api/plants");

describe("personal plants API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("lists personal plants by grow", async () => {
    mockApiRequest.mockResolvedValueOnce({
      plants: [{ id: "plant-1", growId: "grow-1", name: "Tomato #1" }]
    });

    await expect(listPersonalPlants({ growId: "grow-1" })).resolves.toEqual([
      { id: "plant-1", growId: "grow-1", name: "Tomato #1" }
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/personal/plants", {
      method: "GET",
      params: { growId: "grow-1" }
    });
  });

  it("creates personal plants with crop identity and growth overlay fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      plant: { id: "plant-1", cropProfileId: "crop-1" }
    });

    await expect(
      createPersonalPlant({
        growId: "grow-1",
        name: "Cherry tomato #1",
        cropCommonName: "Tomato",
        scientificName: "Solanum lycopersicum",
        cultivar: "Cherry tomato",
        cropProfileId: "crop-1",
        confirmationStatus: "user_confirmed",
        sizeMetrics: { canopyWidthCm: 75 },
        timingAdjustments: { stageDaysOffset: 7 },
        waterUseProfile: { observedDemand: "high" },
        phenoLabel: "vigorous"
      })
    ).resolves.toEqual({ id: "plant-1", cropProfileId: "crop-1" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/personal/plants", {
      method: "POST",
      body: expect.objectContaining({
        growId: "grow-1",
        cropCommonName: "Tomato",
        scientificName: "Solanum lycopersicum",
        cropProfileId: "crop-1",
        sizeMetrics: { canopyWidthCm: 75 },
        timingAdjustments: { stageDaysOffset: 7 },
        waterUseProfile: { observedDemand: "high" }
      })
    });
  });
});
