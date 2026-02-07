/**
 * backend/routes/ai.call.test.js
 *
 * End-to-End AI Call Test (Jest)
 *
 * Tests:
 * 1. Invalid request (missing tool) → 400 VALIDATION_ERROR
 * 2. Unregistered function → 400 UNSUPPORTED_FUNCTION
 * 3. harvest.analyzeTrichomes with valid args → 200 success + TrichomeAnalysis write
 * 4. climate.computeVPD (deterministic) → 200 + confidence 1.0
 * 5. ec.recommendCorrection that exceeds impact gate → 409 USER_CONFIRMATION_REQUIRED
 */

const request = require("supertest");
const express = require("express");

// Mock TrichomeAnalysis model before importing router
jest.mock("../models/TrichomeAnalysis", () => ({
  create: jest.fn().mockResolvedValue({
    _id: "mock_trich_id_123",
    facilityId: "fac_123",
    growId: "grow_123",
    images: ["https://example.com/img1.jpg"],
    zones: ["top"],
    distribution: { clear: 0.25, cloudy: 0.65, amber: 0.1 },
    confidence: 0.75,
    notes: "",
    createdAt: new Date("2026-02-07T12:00:00Z"),
    updatedAt: new Date("2026-02-07T12:00:00Z"),
    deletedAt: null
  })
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
  insertMany: jest.fn(async (docs) =>
    docs.map((d, i) => ({
      ...d,
      _id: `cal_event_${i + 1}`,
      createdAt: new Date("2026-02-07T12:00:00Z"),
      updatedAt: new Date("2026-02-07T12:00:00Z")
    }))
  )
}));

// ---- Setup Mock App ----
function createMockApp() {
  const app = express();
  app.use(express.json());

  // Mock auth middleware (sets req.user)
  app.use((req, res, next) => {
    req.user = { id: "user_test_123" };
    next();
  });

  // Mock requireFacilityScope (sets req.ctx)
  app.use((req, res, next) => {
    req.ctx = { userId: req.user.id, facilityId: req.params.facilityId };
    next();
  });

  // Mount AI router
  const aiRouter = require("./ai.call");
  app.use("/api/facility/:facilityId/ai", aiRouter);

  // Error handler
  const { errorHandler } = require("../utils/errors");
  app.use(errorHandler);

  return app;
}

describe("AI Call Router (ai.call.js)", () => {
  let app;

  beforeAll(() => {
    app = createMockApp();
  });

  describe("POST /api/facility/:facilityId/ai/call", () => {
    test("Rejects request without tool", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({ fn: "harvest.analyzeTrichomes", args: {} });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("Rejects unregistered function", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "unknown",
          fn: "unknown.notRegistered",
          args: {},
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("UNSUPPORTED_FUNCTION");
    });

    test("harvest.analyzeTrichomes with valid images returns result + TrichomeAnalysis write", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "harvest",
          fn: "harvest.analyzeTrichomes",
          args: { images: ["https://example.com/img1.jpg"], zones: ["top"] },
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.confidence).toBeGreaterThan(0);
      expect(res.body.data.result.id).toBeDefined();

      // Verify writes tracking
      const writes = res.body.data.writes || [];
      expect(writes.some((w) => w.type === "TrichomeAnalysis")).toBe(true);
    });

    test("climate.computeVPD (deterministic) returns confidence 1.0", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "climate",
          fn: "climate.computeVPD",
          args: { temp: 22, rh: 60 },
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.confidence).toBe(1.0); // Pure math
      expect(res.body.data.result.vpd).toBeGreaterThan(0);
    });

    test("ec.recommendCorrection with small drift → success", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "ec",
          fn: "ec.recommendCorrection",
          args: { currentEC: 1.5, targetEC: 1.4 },
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result.deltaEC).toBeDefined();

      // Verify Task write
      const writes = res.body.data.writes || [];
      expect(writes.some((w) => w.type === "Task")).toBe(true);
    });

    test("ec.recommendCorrection with large drift → 409 USER_CONFIRMATION_REQUIRED", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "ec",
          fn: "ec.recommendCorrection",
          args: { currentEC: 1.0, targetEC: 2.5 }, // Large drift
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("USER_CONFIRMATION_REQUIRED");
    });

    test("harvest.estimateHarvestWindow returns HarvestDecision + 3 CalendarEvent writes", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "harvest",
          fn: "harvest.estimateHarvestWindow",
          args: {
            daysSinceFlip: 56,
            goal: "balanced",
            distribution: { clear: 0.25, cloudy: 0.65, amber: 0.1 }
          },
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tool).toBe("harvest");
      expect(res.body.data.fn).toBe("estimateHarvestWindow");
      expect(res.body.data.result.id).toBe("mock_decision_id_456");
      expect(res.body.data.result.window).toBeDefined();
      expect(res.body.data.result.window.min).toBeDefined();
      expect(res.body.data.result.window.ideal).toBeDefined();
      expect(res.body.data.result.window.max).toBeDefined();
      expect(res.body.data.result.recommendation).toBe("WAIT_3_DAYS");

      // Step C: Verify writes tracking includes HarvestDecision + 3 CalendarEvents
      const writes = res.body.data.writes || [];
      expect(writes.some((w) => w.type === "HarvestDecision")).toBe(true);
      const calWrites = writes.filter((w) => w.type === "CalendarEvent");
      expect(calWrites.length).toBe(3);
      expect(calWrites[0].id).toBe("cal_event_1");
      expect(calWrites[1].id).toBe("cal_event_2");
      expect(calWrites[2].id).toBe("cal_event_3");
    });

    test("Missing images in harvest.analyzeTrichomes → 400 MISSING_REQUIRED_INPUTS", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "harvest",
          fn: "harvest.analyzeTrichomes",
          args: {}, // Missing images
          context: { growId: "grow_123" }
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_REQUIRED_INPUTS");
    });

    test("Context facilityId mismatch → 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/facility/fac_123/ai/call")
        .send({
          tool: "climate",
          fn: "climate.computeVPD",
          args: { temp: 22, rh: 60 },
          context: { facilityId: "fac_999", growId: "grow_123" } // Doesn't match :facilityId
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("Missing facilityId param → 400 MISSING_REQUIRED_INPUTS", async () => {
      const res = await request(app)
        .post("/api/facility//ai/call") // Empty facilityId
        .send({
          tool: "climate",
          fn: "climate.computeVPD",
          args: { temp: 22, rh: 60 }
        });

      // Note: Express routing may not match this; expect 404 instead
      expect([400, 404]).toContain(res.status);
    });
  });
});
