"use strict";

const express = require("express");
const mongoose = require("mongoose");

const Grow = require("../models/Grow");
const TelemetrySource = require("../models/TelemetrySource");
const TelemetryPoint = require("../models/TelemetryPoint");

const router = express.Router();

function getUserId(req) {
  return String(
    req.userId ||
      req.ctx?.userId ||
      req.user?.id ||
      req.user?._id ||
      req.headers["x-test-user-id"] ||
      ""
  );
}

function requireUser(req, res) {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
    return "";
  }
  return userId;
}

function growLookupForUser(growId, userId) {
  const growFilters = [{ growId: String(growId) }];
  if (mongoose.isValidObjectId(String(growId))) growFilters.push({ _id: growId });
  return {
    $or: growFilters,
    $and: [{ $or: [{ user: userId }, { userId }] }],
    deletedAt: null
  };
}

async function ownsGrow(userId, growId) {
  if (!growId) return false;
  return Boolean(await Grow.exists(growLookupForUser(growId, userId)));
}

async function loadOwnedSource(userId, sourceId) {
  if (!sourceId || !mongoose.isValidObjectId(String(sourceId))) return null;
  return TelemetrySource.findOne({
    _id: sourceId,
    ownerUserId: userId,
    deletedAt: null
  });
}

function sourceDto(row) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  const config = { ...(value.config || {}) };
  if (config.pulse) {
    config.pulse = { ...config.pulse };
    delete config.pulse.apiKey;
    delete config.pulse.apiKeyEncrypted;
  }
  if (config.ubibot) {
    config.ubibot = { ...config.ubibot };
    delete config.ubibot.apiKey;
    delete config.ubibot.accountKey;
    delete config.ubibot.apiKeyEncrypted;
    delete config.ubibot.accountKeyEncrypted;
  }
  if (config.growlink) {
    config.growlink = { ...config.growlink };
    delete config.growlink.password;
    delete config.growlink.passwordEncrypted;
    delete config.growlink.accessToken;
    delete config.growlink.accessTokenEncrypted;
  }
  return {
    ...value,
    id: String(value._id || value.id || ""),
    _id: value._id ? String(value._id) : value._id,
    growId: String(value.growId || ""),
    config
  };
}

function pointDto(row) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  return {
    ...value,
    id: value._id ? String(value._id) : value.id,
    _id: value._id ? String(value._id) : value._id,
    sourceId: String(value.sourceId || ""),
    ts: value.ts instanceof Date ? value.ts.toISOString() : String(value.ts || "")
  };
}

function pointPayload(sourceId, raw) {
  const ts = new Date(raw?.ts || raw?.timestamp || raw?.time || "");
  const airTempC = Number(raw?.airTempC ?? raw?.tempC ?? raw?.airTemp ?? raw?.temp);
  const rh = Number(raw?.rh ?? raw?.humidity ?? raw?.RH);
  if (!Number.isFinite(ts.getTime())) return null;
  if (!Number.isFinite(airTempC) || !Number.isFinite(rh)) return null;
  return {
    sourceId,
    ts,
    airTempC,
    rh,
    leafTempC: raw?.leafTempC ?? null,
    canopyTempC: raw?.canopyTempC ?? null,
    canopyRh: raw?.canopyRh ?? null,
    dewPointC: Number.isFinite(Number(raw?.dewPointC)) ? Number(raw.dewPointC) : airTempC,
    vpdKpa: raw?.vpdKpa ?? null,
    co2Ppm: raw?.co2Ppm ?? null,
    lightLux: raw?.lightLux ?? null,
    ppfd: raw?.ppfd ?? null,
    airPressureHpa: raw?.airPressureHpa ?? null,
    voc: raw?.voc ?? null
  };
}

router.get("/sources", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const query = { ownerUserId: userId, deletedAt: null };
    if (req.query.growId) query.growId = String(req.query.growId);
    const rows = await TelemetrySource.find(query).sort({ createdAt: -1 }).lean();
    res.json({ sources: (rows || []).map(sourceDto) });
  } catch (error) {
    next(error);
  }
});

router.post("/sources", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const growId = String(req.body?.growId || "").trim();
    if (!(await ownsGrow(userId, growId))) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Grow not found" }
      });
    }
    const source = await TelemetrySource.create({
      ownerUserId: userId,
      growId,
      type: String(req.body?.type || "manual"),
      name: String(req.body?.name || "Telemetry source").trim(),
      timezone: String(req.body?.timezone || "America/New_York"),
      isActive: req.body?.isActive !== false,
      config: req.body?.config || {}
    });
    res.status(201).json({ source: sourceDto(source) });
  } catch (error) {
    next(error);
  }
});

router.post("/points:bulk", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const source = await loadOwnedSource(userId, req.body?.sourceId);
    if (!source) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Telemetry source not found" }
      });
    }
    const rows = Array.isArray(req.body?.points) ? req.body.points : [];
    let ingested = 0;
    let updated = 0;
    let skipped = 0;
    for (const raw of rows) {
      const payload = pointPayload(source._id, raw);
      if (!payload) {
        skipped += 1;
        continue;
      }
      if (req.body?.mode === "insert") {
        await TelemetryPoint.create(payload);
        ingested += 1;
      } else {
        const result = await TelemetryPoint.updateOne(
          { sourceId: source._id, ts: payload.ts },
          { $set: payload },
          { upsert: true }
        );
        if (result?.upsertedCount) ingested += 1;
        else updated += Number(result?.modifiedCount || result?.matchedCount || 0) ? 1 : 0;
      }
    }
    res.json({ ingested, updated, skipped });
  } catch (error) {
    next(error);
  }
});

router.get("/points", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const source = await loadOwnedSource(userId, req.query.sourceId);
    if (!source) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Telemetry source not found" }
      });
    }
    const limit = Math.min(Math.max(Number(req.query.limit || 5000), 1), 10000);
    const ts = {};
    if (req.query.startIso) ts.$gte = new Date(String(req.query.startIso));
    if (req.query.endIso) ts.$lte = new Date(String(req.query.endIso));
    const query = { sourceId: source._id };
    if (Object.keys(ts).length) query.ts = ts;
    const points = await TelemetryPoint.find(query).sort({ ts: 1 }).limit(limit).lean();
    res.json({
      sourceId: String(source._id),
      startIso: req.query.startIso || null,
      endIso: req.query.endIso || null,
      points: (points || []).map(pointDto)
    });
  } catch (error) {
    next(error);
  }
});

function providerUnavailable(res, provider) {
  return res.status(501).json({
    ok: false,
    error: {
      code: "ACCESS_REQUIRED",
      message: `${provider} live API access is not configured in this backend.`
    }
  });
}

router.post("/pulse/verify", (_req, res) => providerUnavailable(res, "Pulse"));
router.post("/pulse/devices", (_req, res) => providerUnavailable(res, "Pulse"));
router.post("/pulse/pull", (_req, res) => providerUnavailable(res, "Pulse"));
router.post("/ubibot/verify", (_req, res) => providerUnavailable(res, "UbiBot"));
router.post("/ubibot/channels", (_req, res) => providerUnavailable(res, "UbiBot"));
router.post("/ubibot/pull", (_req, res) => providerUnavailable(res, "UbiBot"));
router.post("/ubibot/mqtt-settings", (_req, res) => providerUnavailable(res, "UbiBot"));
router.post("/growlink/verify", (_req, res) => providerUnavailable(res, "Growlink"));
router.post("/growlink/controllers", (_req, res) => providerUnavailable(res, "Growlink"));
router.post("/growlink/current", (_req, res) => providerUnavailable(res, "Growlink"));
router.post("/growlink/pull", (_req, res) => providerUnavailable(res, "Growlink"));

module.exports = router;
