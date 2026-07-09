const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

const {
  archiveHarvestBatch,
  createHarvestBatch,
  listHarvestBatches,
  updateHarvestBatch
} = require("@/api/harvestBatches");

describe("harvest batch API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("creates, lists, updates, and archives harvest/dry-cure records", async () => {
    mockApiRequest.mockResolvedValueOnce({
      harvestBatch: { id: "harvest-1", name: "Flower harvest A" }
    });
    mockApiRequest.mockResolvedValueOnce({
      harvestBatches: [{ id: "harvest-1", name: "Flower harvest A" }]
    });
    mockApiRequest.mockResolvedValueOnce({
      data: { harvestBatch: { id: "harvest-1", status: "curing" } }
    });
    mockApiRequest.mockResolvedValueOnce({ archived: true });

    await expect(
      createHarvestBatch({
        growId: "grow-1",
        plantIds: ["plant-1"],
        name: "Flower harvest A",
        batchCode: "FH-A",
        harvestedAt: "2026-07-09T00:00:00.000Z",
        wetWeight: 450,
        status: "drying",
        dryCureRecords: [
          {
            stage: "drying",
            tempF: 66,
            rh: 60,
            qualityNotes: "slow clean dry",
            linkedToolRunId: "tool-1"
          }
        ],
        linkedToolRunIds: ["tool-1"]
      })
    ).resolves.toEqual({ id: "harvest-1", name: "Flower harvest A" });

    await expect(listHarvestBatches({ growId: "grow-1" })).resolves.toEqual([
      { id: "harvest-1", name: "Flower harvest A" }
    ]);
    await expect(
      updateHarvestBatch("harvest-1", { status: "curing", dryWeight: 112 })
    ).resolves.toEqual({ id: "harvest-1", status: "curing" });
    await expect(archiveHarvestBatch("harvest-1")).resolves.toBe(true);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/personal/harvest-batches", {
      method: "POST",
      body: expect.objectContaining({
        growId: "grow-1",
        plantIds: ["plant-1"],
        dryCureRecords: [
          expect.objectContaining({
            stage: "drying",
            linkedToolRunId: "tool-1"
          })
        ],
        linkedToolRunIds: ["tool-1"]
      })
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/personal/harvest-batches", {
      params: { growId: "grow-1" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/personal/harvest-batches/harvest-1",
      { method: "PATCH", body: { status: "curing", dryWeight: 112 } }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/personal/harvest-batches/harvest-1",
      { method: "DELETE" }
    );
  });
});
