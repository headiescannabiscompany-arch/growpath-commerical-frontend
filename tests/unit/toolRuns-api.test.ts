const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const { createToolRun, runCalculator } = require("@/api/toolRuns");

describe("toolRuns API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({
      tool: {
        _id: "run-1",
        toolName: "vpd",
        inputs: {},
        outputs: {}
      }
    });
  });

  it("sends selected plant and crop context when creating a tool run", async () => {
    await createToolRun({
      toolType: "watering",
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-olive-1",
      selectedPlantContext: {
        id: "plant-1",
        name: "Olive patio tree",
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cropProfileId: "crop-olive-1",
        growthProfile: {
          sizeMetrics: { canopyWidthCm: 140 },
          waterUseProfile: { observedDemand: "medium" }
        }
      },
      input: { potLiters: 45 },
      output: { targetLiters: 4.5 }
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools", {
      method: "POST",
      body: expect.objectContaining({
        toolName: "watering",
        growId: "grow-1",
        plantId: "plant-1",
        cropProfileId: "crop-olive-1",
        selectedPlantContext: expect.objectContaining({
          scientificName: "Olea europaea"
        }),
        plantGrowthProfile: expect.objectContaining({
          waterUseProfile: { observedDemand: "medium" }
        })
      })
    });
  });

  it("passes plant context through calculator endpoints", async () => {
    mockApiRequest.mockResolvedValueOnce({
      toolRun: {
        _id: "run-vpd-1",
        toolName: "vpd",
        plantId: "plant-1",
        cropProfileId: "crop-blueberry-1",
        inputs: { rh: 62 },
        outputs: { vpdKpa: 1.1 }
      },
      outputs: { vpdKpa: 1.1 }
    });

    const response = await runCalculator("vpd", {
      growId: "grow-1",
      plantId: "plant-1",
      cropProfileId: "crop-blueberry-1",
      selectedPlantContext: {
        id: "plant-1",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum"
      },
      airTemp: 76,
      tempUnit: "F",
      rh: 62
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/vpd", {
      method: "POST",
      body: expect.objectContaining({
        plantId: "plant-1",
        cropProfileId: "crop-blueberry-1",
        selectedPlantContext: expect.objectContaining({
          cropCommonName: "Blueberry"
        })
      })
    });
    expect(response.toolRun.plantId).toBe("plant-1");
    expect(response.toolRun.cropProfileId).toBe("crop-blueberry-1");
  });
});
