"use strict";

jest.mock(
  "express",
  () => ({
    Router: jest.fn(() => ({ post: jest.fn() }))
  }),
  { virtual: true }
);

jest.mock("../models/TrichomeAnalysis", () => ({
  create: jest.fn()
}));

jest.mock("../models/HarvestDecision", () => ({
  create: jest.fn().mockResolvedValue({
    _id: "mock_decision_id_456",
    facilityId: "fac_123",
    growId: "grow_123",
    window: {
      min: new Date("2026-02-10T12:00:00Z"),
      ideal: new Date("2026-02-12T12:00:00Z"),
      max: new Date("2026-02-15T12:00:00Z")
    },
    recommendation: "WAIT_3_DAYS",
    partialHarvest: false,
    confidence: 0.8,
    trichomeAnalysisId: null,
    createdAt: new Date("2026-02-07T12:00:00Z"),
    updatedAt: new Date("2026-02-07T12:00:00Z"),
    deletedAt: null
  })
}));

jest.mock("../models/CalendarEvent", () => ({
  updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  insertMany: jest.fn(async (docs) =>
    docs.map((doc, index) => ({
      ...doc,
      _id: `cal_event_${index + 1}`,
      createdAt: new Date("2026-02-07T12:00:00Z"),
      updatedAt: new Date("2026-02-07T12:00:00Z")
    }))
  )
}));

const HarvestDecision = require("../models/HarvestDecision");
const CalendarEvent = require("../models/CalendarEvent");
const aiRouter = require("./ai.call");

const {
  REGISTRY,
  attachExternalValidation,
  handleClimateComputeVPD,
  handleECRecommendCorrection,
  handleHarvestAnalyzeTrichomes,
  handleHarvestEstimateWindow
} = aiRouter.__testables;

describe("AI call route handlers", () => {
  test("keeps canonical functions registered", () => {
    expect(REGISTRY.harvest).toContain("analyzeTrichomes");
    expect(REGISTRY.harvest).toContain("estimateHarvestWindow");
    expect(REGISTRY.climate).toContain("computeVPD");
    expect(REGISTRY.ec).toContain("recommendCorrection");
  });

  test("climate.computeVPD returns deterministic confidence and no writes", () => {
    const result = handleClimateComputeVPD({ temp: 22, rh: 60 }, {});

    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      tool: "climate",
      fn: "computeVPD",
      confidence: 1,
      writes: []
    });
    expect(result.data.result.vpd).toBeGreaterThan(0);
  });

  test("climate.computeVPD validates required numeric inputs", () => {
    expect(handleClimateComputeVPD({ temp: 22 }, {})).toEqual({
      error: "MISSING_REQUIRED_INPUTS",
      status: 400
    });
    expect(handleClimateComputeVPD({ temp: "22", rh: 60 }, {})).toEqual({
      error: "INVALID_ARGS",
      status: 400
    });
  });

  test("ec.recommendCorrection applies the impact gate", () => {
    expect(
      handleECRecommendCorrection({ currentEC: 1.0, targetEC: 1.4 }, {})
    ).toMatchObject({
      error: "USER_CONFIRMATION_REQUIRED",
      status: 409
    });
  });

  test("ec.recommendCorrection creates a task write for small drift", () => {
    const result = handleECRecommendCorrection({ currentEC: 1.5, targetEC: 1.4 }, {});

    expect(result.error).toBeUndefined();
    expect(result.data.result.deltaEC).toBeCloseTo(-0.1);
    expect(result.data.writes).toEqual([
      expect.objectContaining({ type: "Task", priority: "high" })
    ]);
  });

  test("harvest.analyzeTrichomes returns explicit v1 non-shipping response", async () => {
    await expect(
      handleHarvestAnalyzeTrichomes(
        { images: ["https://example.com/img1.jpg"], zones: ["top"] },
        { facilityId: "fac_123", growId: "grow_123" }
      )
    ).resolves.toEqual({
      error: "AI_NOT_IMPLEMENTED",
      message: "harvest.analyzeTrichomes is not enabled in v1",
      status: 501
    });
  });

  test("harvest.estimateHarvestWindow validates required inputs", async () => {
    await expect(
      handleHarvestEstimateWindow(
        { daysSinceFlip: 56, distribution: { clear: 0.25, cloudy: 0.65, amber: 0.1 } },
        { facilityId: "fac_123" }
      )
    ).resolves.toEqual({
      error: "MISSING_REQUIRED_INPUTS",
      message: "growId required",
      status: 400
    });
  });

  test("harvest.estimateHarvestWindow writes decision and calendar events", async () => {
    const result = await handleHarvestEstimateWindow(
      {
        daysSinceFlip: 56,
        goal: "balanced",
        distribution: { clear: 0.25, cloudy: 0.65, amber: 0.1 }
      },
      { facilityId: "fac_123", growId: "grow_123" }
    );

    expect(HarvestDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "fac_123",
        growId: "grow_123",
        recommendation: "READY_NOW",
        confidence: 0.8
      })
    );
    expect(CalendarEvent.updateMany).toHaveBeenCalledWith(
      { facilityId: "fac_123", growId: "grow_123", type: "HARVEST_WINDOW", deletedAt: null },
      { deletedAt: expect.any(Date) }
    );
    expect(CalendarEvent.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: "Harvest Window (Earliest)" }),
        expect.objectContaining({ title: "Harvest Window (Ideal)" }),
        expect.objectContaining({ title: "Harvest Window (Latest)" })
      ]),
      { ordered: true }
    );
    expect(result.data.result.id).toBe("mock_decision_id_456");
    expect(result.data.writes).toEqual([
      { type: "HarvestDecision", id: "mock_decision_id_456" },
      { type: "CalendarEvent", id: "cal_event_1" },
      { type: "CalendarEvent", id: "cal_event_2" },
      { type: "CalendarEvent", id: "cal_event_3" }
    ]);
  });

  test("external validation is skipped outside gray-zone confidence", async () => {
    const data = { confidence: 1, result: { vpd: 1.2 } };

    await expect(
      attachExternalValidation(data, {
        tool: "climate",
        fn: "computeVPD",
        ctx: { facilityId: "fac_123" }
      })
    ).resolves.toBe(data);
  });
});
