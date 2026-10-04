const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  archiveToolRun,
  createTaskFromToolRun,
  createToolRun,
  getToolRun,
  listToolRuns,
  permanentlyDeleteToolRun,
  runCalculator,
  saveToolRunToLog,
  updatePlantIdCorrection,
  updateToolRun
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

  it("filters saved runs locally when the API returns unrelated tool types", async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [
        { _id: "run-vpd", toolType: "vpd" },
        { _id: "run-plant-1", toolType: "species_crop_id" },
        { _id: "run-plant-2", toolName: "species-crop-identification" }
      ]
    });

    const runs = await listToolRuns({ toolType: "species_crop_id" });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools", {
      method: "GET",
      cache: "no-store",
      params: expect.objectContaining({ toolType: "species_crop_id" })
    });
    expect(runs.map((run: any) => run.id)).toEqual(["run-plant-1", "run-plant-2"]);
  });

  describe("saved-run collection readiness", () => {
    const envelopeCases: Array<[string, (rows: any[]) => unknown]> = [
      ["bare array", (rows) => rows],
      ["items", (rows) => ({ items: rows })],
      ["tools", (rows) => ({ tools: rows })],
      ["data.tools", (rows) => ({ data: { tools: rows } })],
      ["data.items", (rows) => ({ data: { items: rows } })]
    ];

    it.each(envelopeCases)("preserves populated %s responses", async (_name, wrap) => {
      const source = {
        _id: "run-legacy",
        toolName: "vpd",
        params: { rh: 62 },
        result: { vpdKpa: 1.1 },
        summary: "Previously saved result",
        createdAt: "2026-10-04T12:00:00.000Z",
        growId: null,
        facilityId: null,
        optionalMetadata: { preserve: true }
      };
      mockApiRequest.mockResolvedValueOnce(wrap([source]));

      await expect(listToolRuns()).resolves.toEqual([
        expect.objectContaining({
          id: "run-legacy",
          _id: "run-legacy",
          toolType: "vpd",
          inputs: { rh: 62 },
          outputs: { vpdKpa: 1.1 },
          optionalMetadata: { preserve: true }
        })
      ]);
      expect(source).not.toHaveProperty("id");
    });

    it.each(envelopeCases)(
      "accepts confirmed empty %s responses",
      async (_name, wrap) => {
        mockApiRequest.mockResolvedValueOnce(wrap([]));
        await expect(listToolRuns()).resolves.toEqual([]);
      }
    );

    it.each([
      "network unavailable",
      "Not authenticated",
      "Access denied",
      "Server unavailable"
    ])("propagates %s instead of inventing empty history", async (message) => {
      const failure = new Error(message);
      mockApiRequest.mockRejectedValueOnce(failure);
      await expect(listToolRuns()).rejects.toBe(failure);
    });

    it.each([
      null,
      undefined,
      "unavailable",
      {},
      { items: null },
      { items: {} },
      { tools: "unavailable" },
      { data: [] },
      { data: { items: null } },
      { data: { tools: {} } },
      { ok: false, items: [] },
      { success: false, tools: [] },
      { error: { code: "UNAVAILABLE" }, items: [] },
      { data: { ok: false, tools: [] } },
      { data: { success: false, items: [] } },
      { data: { error: "Unavailable", items: [] } },
      { items: null, tools: [] },
      { data: { tools: null, items: [] } }
    ])("rejects malformed or explicitly failed collection %#", async (response) => {
      mockApiRequest.mockResolvedValueOnce(response);
      await expect(listToolRuns()).rejects.toThrow(
        "Saved run history could not be verified. Please retry."
      );
    });

    it.each([
      null,
      [],
      "run-1",
      {},
      { _id: "run-1" },
      { _id: "", toolName: "vpd" },
      { _id: " run-1 ", toolName: "vpd" },
      { _id: 1, toolName: "vpd" },
      { _id: { id: "run-1" }, toolName: "vpd" },
      { _id: "run-1", id: "different-run", toolName: "vpd" },
      { _id: "run-1", id: 1, toolName: "vpd" },
      { _id: "run-1", toolName: " " },
      { _id: "run-1", toolName: { name: "vpd" } },
      { _id: "run-1", toolName: "vpd", toolType: [] },
      { _id: "run-1", toolName: "vpd", summary: {} },
      { _id: "run-1", toolName: "vpd", createdAt: [] },
      { _id: "run-1", toolName: "vpd", growId: {} },
      { _id: "run-1", toolName: "vpd", facilityId: 1 }
    ])(
      "rejects an unreadable row rather than normalizing a fictitious run %#",
      async (row) => {
        mockApiRequest.mockResolvedValueOnce({ items: [row] });
        await expect(listToolRuns()).rejects.toThrow(/could not be verified/);
      }
    );

    it("rejects repeated saved identities", async () => {
      mockApiRequest.mockResolvedValueOnce({
        items: [
          { _id: "run-1", toolName: "vpd" },
          { id: "run-1", toolType: "vpd" }
        ]
      });
      await expect(listToolRuns()).rejects.toThrow(/could not be verified/);
    });

    it("validates every row before applying the requested tool filter", async () => {
      mockApiRequest.mockResolvedValueOnce({
        items: [{ _id: "run-1", toolName: "vpd" }, { toolName: "species_crop_id" }]
      });
      await expect(listToolRuns({ toolType: "vpd" })).rejects.toThrow(
        /could not be verified/
      );
    });

    it("preserves canonical ids, legacy naming aliases and an empty local filter result", async () => {
      mockApiRequest.mockResolvedValue({
        items: [{ id: "run-1", _id: "run-1", toolName: "", toolType: "vpd" }]
      });
      await expect(listToolRuns()).resolves.toEqual([
        expect.objectContaining({ id: "run-1", toolName: "vpd", toolType: "vpd" })
      ]);
      await expect(listToolRuns({ toolType: "species_crop_id" })).resolves.toEqual([]);
    });

    it("preserves every existing query option and the fresh read boundary", async () => {
      mockApiRequest.mockResolvedValueOnce({ items: [] });
      await listToolRuns({
        growId: "grow-1",
        toolType: "harvest-readiness",
        includeArchived: true,
        workspaceType: "facility",
        facilityId: "facility-1"
      });
      expect(mockApiRequest).toHaveBeenCalledWith("/api/tools", {
        method: "GET",
        cache: "no-store",
        params: expect.objectContaining({
          growId: "grow-1",
          toolType: "harvest-readiness",
          includeArchived: "true",
          workspaceType: "facility",
          facilityId: "facility-1",
          _fresh: expect.any(String)
        })
      });
    });
  });

  it("scopes facility Saved Run reads and safe mutations", async () => {
    const scope = { workspaceType: "facility", facilityId: "facility-1" };

    await getToolRun("facility-run-1", scope);
    await updateToolRun("facility-run-1", { summary: "Reviewed" }, scope);
    await updatePlantIdCorrection("facility-run-1", { decision: "uncertain" }, scope);
    await saveToolRunToLog("facility-run-1", {}, scope);
    await createTaskFromToolRun("facility-run-1", {}, scope);
    await archiveToolRun("facility-run-1", scope);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/runs/facility-run-1", {
      method: "GET",
      cache: "no-store",
      params: scope
    });
    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/runs/facility-run-1", {
      method: "PATCH",
      body: { summary: "Reviewed", ...scope }
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/tools/runs/facility-run-1/correction",
      {
        method: "PATCH",
        body: { decision: "uncertain", ...scope }
      }
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/tools/runs/facility-run-1/save-log",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining(scope)
      })
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/tools/runs/facility-run-1/create-task",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining(scope)
      })
    );
    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/runs/facility-run-1", {
      method: "DELETE",
      body: scope
    });
  });

  it("permanently deletes a Harvest result with an exact workspace and source-video choice", async () => {
    mockApiRequest.mockResolvedValueOnce({
      deleted: true,
      permanent: true,
      toolRunId: "harvest-run-1",
      deleteSourceVideo: false,
      sourceVideoDeleted: false,
      deletedFrameCount: 80,
      retainedSharedFrameCount: 1,
      retainedCalibrationAnalyzedEvidenceCount: 2,
      removedModuleRecordCount: 1,
      scrubbedReviewCount: 1,
      removedInspectionViewReviewCount: 3,
      scrubbedDeepOperationCount: 1,
      cleanupPending: true,
      cleanupStatus: "cleanup_pending",
      logicalDeletedAt: "2026-08-23T12:00:00.000Z",
      completedAt: null,
      cleanupErrorCode: "OBJECT_CLEANUP_RETRY"
    });

    await expect(
      permanentlyDeleteToolRun(
        "harvest-run-1",
        { confirmPermanentDelete: true, deleteSourceVideo: false },
        { workspaceType: "facility", facilityId: "facility-1" }
      )
    ).resolves.toEqual(
      expect.objectContaining({ cleanupPending: true, deleteSourceVideo: false })
    );
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/tools/runs/harvest-run-1/permanent",
      {
        method: "DELETE",
        body: {
          confirmPermanentDelete: true,
          deleteSourceVideo: false,
          workspaceType: "facility",
          facilityId: "facility-1"
        }
      }
    );
  });

  it("rejects a permanent-deletion receipt that changes the source-video choice", async () => {
    mockApiRequest.mockResolvedValueOnce({
      deleted: true,
      permanent: true,
      toolRunId: "harvest-run-1",
      deleteSourceVideo: true,
      sourceVideoDeleted: true,
      deletedFrameCount: 1,
      retainedSharedFrameCount: 0,
      retainedCalibrationAnalyzedEvidenceCount: 0,
      removedModuleRecordCount: 1,
      scrubbedReviewCount: 1,
      removedInspectionViewReviewCount: 0,
      scrubbedDeepOperationCount: 0,
      cleanupPending: false,
      cleanupStatus: "completed",
      logicalDeletedAt: "2026-08-23T12:00:00.000Z",
      completedAt: "2026-08-23T12:01:00.000Z"
    });

    await expect(
      permanentlyDeleteToolRun("harvest-run-1", {
        confirmPermanentDelete: true,
        deleteSourceVideo: false
      })
    ).rejects.toThrow(/incomplete permanent-deletion cleanup receipt/i);
  });

  it("sends facility scope when listing shared Saved Runs", async () => {
    mockApiRequest.mockResolvedValueOnce({ items: [] });

    await listToolRuns({
      toolType: "species_crop_id",
      workspaceType: "facility",
      facilityId: "facility-1"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools", {
      method: "GET",
      cache: "no-store",
      params: expect.objectContaining({
        toolType: "species_crop_id",
        workspaceType: "facility",
        facilityId: "facility-1"
      })
    });
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

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/tools/runs/run-task-1/create-task",
      {
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
      }
    );
  });
});
