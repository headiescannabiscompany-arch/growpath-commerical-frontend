"use strict";

const express = require("express");
const router = express.Router({ mergeParams: true });

const AutomationEvent = require("../models/AutomationEvent");
const Diagnosis = require("../models/Diagnosis");
const Grow = require("../models/Grow");
const GrowLog = require("../models/GrowLog");
const Task = require("../models/Task");
const ToolRun = require("../models/ToolRun");
const { apiError } = require("../utils/errors");

async function latest(model, query, sort = { createdAt: -1 }, limit = 5) {
  return model.find(query).sort(sort).limit(limit).lean();
}

router.get("/summary", async (req, res, next) => {
  try {
    const facilityId = String(req.params.facilityId || "").trim();
    if (!facilityId) {
      return res
        .status(400)
        .json(apiError("FACILITY_ID_REQUIRED", "facilityId required"));
    }

    const now = new Date();
    const recentSince = new Date(now.getTime() - 14 * 86400000);
    const growQuery = { facilityId, deletedAt: null, archivedAt: null, isActive: { $ne: false } };
    const growRows = await Grow.find(growQuery).select("_id growId name stage").lean();
    const growIds = growRows.map((grow) => String(grow.growId || grow._id)).filter(Boolean);
    const growIdQuery = growIds.length ? { growId: { $in: growIds } } : { growId: "__none__" };

    const [
      openTasksCount,
      overdueTasksCount,
      recentLogsCount,
      latestToolRuns,
      latestDiagnoses,
      activeAlerts,
      telemetryWarnings
    ] = await Promise.all([
      Task.countDocuments({ facilityId, deletedAt: null, status: { $ne: "DONE" } }),
      Task.countDocuments({
        facilityId,
        deletedAt: null,
        status: { $ne: "DONE" },
        dueAt: { $lt: now }
      }),
      GrowLog.countDocuments({ facilityId, deletedAt: null, date: { $gte: recentSince } }),
      latest(ToolRun, growIdQuery),
      latest(Diagnosis, growIdQuery),
      latest(AutomationEvent, { facilityId, errors: { $exists: true, $ne: [] } }),
      latest(AutomationEvent, {
        facilityId,
        eventType: { $in: ["telemetry_warning", "sensor_warning", "automation_warning"] }
      })
    ]);

    return res.status(200).json({
      facilityId,
      activeGrowsCount: growRows.length,
      openTasksCount,
      overdueTasksCount,
      recentLogsCount,
      latestToolRuns,
      latestDiagnoses,
      activeAlerts,
      telemetryWarnings,
      generatedAt: now.toISOString(),
      scope: "existing-data-summary"
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
