"use strict";

const express = require("express");
const router = express.Router({ mergeParams: true });

const CalendarEvent = require("../models/CalendarEvent");
const { apiError } = require("../utils/errors");

// GET /api/facility/:facilityId/calendar?growId=...&type=...&from=...&to=...&limit=100
router.get("/", async (req, res, next) => {
  try {
    const facilityId = String(req.params.facilityId || "").trim();
    if (!facilityId) {
      return res
        .status(400)
        .json(apiError("FACILITY_ID_REQUIRED", "facilityId required"));
    }

    const growId = req.query.growId ? String(req.query.growId) : null;
    const type = req.query.type ? String(req.query.type) : null;

    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;

    const limitRaw = req.query.limit ? Number(req.query.limit) : 100;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 100;

    const q = { facilityId, deletedAt: null };
    if (growId) q.growId = growId;
    if (type) q.type = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = from;
      if (to) q.date.$lte = to;
    }

    const items = await CalendarEvent.find(q).sort({ date: 1 }).limit(limit).lean();

    const calendarEvents = items.map((d) => ({
      id: String(d._id),
      facilityId: d.facilityId,
      growId: d.growId,
      type: d.type,
      title: d.title,
      date: d.date ? new Date(d.date).toISOString() : null,
      metadata: d.metadata || {},
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
      deletedAt: d.deletedAt ? new Date(d.deletedAt).toISOString() : null
    }));

    return res.status(200).json({ calendarEvents });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
