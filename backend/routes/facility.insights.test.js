const express = require("express");
const request = require("supertest");

jest.mock("../models/Grow", () => ({
  find: jest.fn()
}));
jest.mock("../models/Task", () => ({
  countDocuments: jest.fn()
}));
jest.mock("../models/GrowLog", () => ({
  countDocuments: jest.fn()
}));
jest.mock("../models/ToolRun", () => ({
  find: jest.fn()
}));
jest.mock("../models/Diagnosis", () => ({
  find: jest.fn()
}));
jest.mock("../models/AutomationEvent", () => ({
  find: jest.fn()
}));

const Grow = require("../models/Grow");
const Task = require("../models/Task");
const GrowLog = require("../models/GrowLog");
const ToolRun = require("../models/ToolRun");
const Diagnosis = require("../models/Diagnosis");
const AutomationEvent = require("../models/AutomationEvent");

function chain(result) {
  const api = {
    select: jest.fn(() => api),
    sort: jest.fn(() => api),
    limit: jest.fn(() => api),
    lean: jest.fn().mockResolvedValue(result)
  };
  return api;
}

describe("facility insights summary route", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/facility/:facilityId/insights", require("./facility.insights"));
    app.use((err, _req, res, _next) => {
      res.status(err.status || 500).json({ error: err.message });
    });
  });

  test("returns a read-only existing-data summary", async () => {
    Grow.find.mockReturnValue(chain([
      { _id: "grow_1", growId: "grow_1", name: "Bed A", stage: "flower" },
      { _id: "grow_2", growId: "grow_2", name: "Bed B", stage: "veg" }
    ]));
    Task.countDocuments.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    GrowLog.countDocuments.mockResolvedValue(9);
    ToolRun.find.mockReturnValue(chain([{ _id: "tool_1", toolName: "ph_ec_check" }]));
    Diagnosis.find.mockReturnValue(chain([{ _id: "diag_1", issueSummary: "Leaf curl" }]));
    AutomationEvent.find
      .mockReturnValueOnce(chain([{ _id: "alert_1", errors: ["sensor offline"] }]))
      .mockReturnValueOnce(chain([{ _id: "warn_1", eventType: "telemetry_warning" }]));

    const res = await request(app).get("/api/facility/fac_1/insights/summary");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      facilityId: "fac_1",
      activeGrowsCount: 2,
      openTasksCount: 5,
      overdueTasksCount: 2,
      recentLogsCount: 9,
      scope: "existing-data-summary"
    });
    expect(ToolRun.find).toHaveBeenCalledWith({ growId: { $in: ["grow_1", "grow_2"] } });
    expect(res.body.latestToolRuns).toHaveLength(1);
    expect(res.body.latestDiagnoses).toHaveLength(1);
  });
});
