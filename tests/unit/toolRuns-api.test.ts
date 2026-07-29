const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  createTaskFromToolRun,
  createToolRun,
  getToolRun,
  runCalculator,
  saveToolRunToLog
} = require("@/api/toolRuns");

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
      facilityId: "facility-1",
      roomId: "room-1",
      productId: "product-1",
      batchId: "batch-1",
      courseId: "course-1",
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
        facilityId: "facility-1",
        roomId: "room-1",
        productId: "product-1",
        batchId: "batch-1",
        courseId: "course-1",
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

  it("reloads a saved tool run by id", async () => {
    mockApiRequest.mockResolvedValueOnce({
      toolRun: {
        _id: "run-reload-1",
        toolType: "dew_point_guard",
        input: { rh: 84 },
        result: { risk: "high" },
        schemaVersion: 2,
        calculatorVersion: "guard-v2"
      }
    });

    const run = await getToolRun("run-reload-1");

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/runs/run-reload-1", {
      method: "GET"
    });
    expect(run?._id).toBe("run-reload-1");
    expect(run?.toolName).toBe("dew_point_guard");
    expect(run?.inputs).toEqual({ rh: 84 });
    expect(run?.outputs).toEqual({ risk: "high" });
    expect(run?.schemaVersion).toBe(2);
    expect(run?.calculatorVersion).toBe("guard-v2");
  });

  it("preserves tool run links when saving a run to the grow log", async () => {
    await saveToolRunToLog("run-log-1", {
      title: "Saved VPD result",
      growId: "grow-1",
      linkedGrowId: "grow-1"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/runs/run-log-1/save-log", {
      method: "POST",
      body: expect.objectContaining({
        title: "Saved VPD result",
        toolRunId: "run-log-1",
        linkedToolRunId: "run-log-1",
        growId: "grow-1",
        linkedGrowId: "grow-1"
      })
    });
  });

  it("preserves tool run source links when creating a task from a run", async () => {
    await createTaskFromToolRun("run-task-1", {
      title: "Recheck environment",
      growId: "grow-1",
      linkedGrowId: "grow-1"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/runs/run-task-1/create-task", {
      method: "POST",
      body: expect.objectContaining({
        title: "Recheck environment",
        sourceType: "tool_run",
        sourceObjectId: "run-task-1",
        sourceToolRunId: "run-task-1",
        linkedToolRunId: "run-task-1",
        growId: "grow-1",
        linkedGrowId: "grow-1"
      })
    });
  });
});
