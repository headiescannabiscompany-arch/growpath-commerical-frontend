/**
 * backend/routes/calendar.facility.test.js
 *
 * Contract test for facility-scoped calendar read endpoint
 *
 * Tests:
 * 1. GET calendar returns { calendarEvents: [] } shape
 * 2. Filters by growId
 * 3. Filters by type
 * 4. Respects limit cap at 200
 * 5. Filters by date range (from/to)
 */

const request = require("supertest");
const express = require("express");

// Mock CalendarEvent model
jest.mock("../models/CalendarEvent", () => ({
  find: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([
    {
      _id: "cal_1",
      facilityId: "fac_123",
      growId: "grow_123",
      type: "HARVEST_WINDOW",
      title: "Harvest Window (Ideal)",
      date: new Date("2026-02-12T12:00:00Z"),
      metadata: { windowKey: "ideal" },
      createdAt: new Date("2026-02-07T12:00:00Z"),
      updatedAt: new Date("2026-02-07T12:00:00Z"),
      deletedAt: null
    },
    {
      _id: "cal_2",
      facilityId: "fac_123",
      growId: "grow_123",
      type: "HARVEST_WINDOW",
      title: "Harvest Window (Earliest)",
      date: new Date("2026-02-10T12:00:00Z"),
      metadata: { windowKey: "min" },
      createdAt: new Date("2026-02-07T12:00:00Z"),
      updatedAt: new Date("2026-02-07T12:00:00Z"),
      deletedAt: null
    }
  ])
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

  // Mount calendar router
  const calendarRouter = require("./calendar.facility");
  app.use("/api/facility/:facilityId/calendar", calendarRouter);

  // Error handler
  const { errorHandler } = require("../utils/errors");
  app.use(errorHandler);

  return app;
}

describe("Calendar Facility Router (calendar.facility.js)", () => {
  let app;
  let CalendarEvent;

  beforeAll(() => {
    app = createMockApp();
    CalendarEvent = require("../models/CalendarEvent");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/facility/:facilityId/calendar", () => {
    test("Returns { calendarEvents: [] } shape", async () => {
      const res = await request(app).get("/api/facility/fac_123/calendar");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("calendarEvents");
      expect(Array.isArray(res.body.calendarEvents)).toBe(true);
      expect(res.body.calendarEvents.length).toBe(2);

      const event = res.body.calendarEvents[0];
      expect(event).toHaveProperty("id");
      expect(event).toHaveProperty("facilityId");
      expect(event).toHaveProperty("growId");
      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("title");
      expect(event).toHaveProperty("date");
      expect(event).toHaveProperty("metadata");
      expect(event).toHaveProperty("createdAt");
      expect(event).toHaveProperty("updatedAt");
      expect(event).toHaveProperty("deletedAt");
    });

    test("Filters by growId", async () => {
      await request(app).get("/api/facility/fac_123/calendar?growId=grow_456");

      expect(CalendarEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "fac_123",
          growId: "grow_456",
          deletedAt: null
        })
      );
    });

    test("Filters by type", async () => {
      await request(app).get("/api/facility/fac_123/calendar?type=HARVEST_WINDOW");

      expect(CalendarEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "fac_123",
          type: "HARVEST_WINDOW",
          deletedAt: null
        })
      );
    });

    test("Respects limit parameter (capped at 200)", async () => {
      await request(app).get("/api/facility/fac_123/calendar?limit=50");

      expect(CalendarEvent.limit).toHaveBeenCalledWith(50);

      jest.clearAllMocks();

      await request(app).get("/api/facility/fac_123/calendar?limit=500");

      expect(CalendarEvent.limit).toHaveBeenCalledWith(200);
    });

    test("Filters by date range (from/to)", async () => {
      await request(app).get(
        "/api/facility/fac_123/calendar?from=2026-02-01&to=2026-02-28"
      );

      expect(CalendarEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: "fac_123",
          deletedAt: null,
          date: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });

    test("Sorts by date ascending", async () => {
      await request(app).get("/api/facility/fac_123/calendar");

      expect(CalendarEvent.sort).toHaveBeenCalledWith({ date: 1 });
    });

    test("Only returns non-deleted events (deletedAt: null)", async () => {
      await request(app).get("/api/facility/fac_123/calendar");

      expect(CalendarEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null
        })
      );
    });
  });
});
