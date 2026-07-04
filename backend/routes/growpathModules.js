"use strict";

const express = require("express");

const GrowpathModuleRecord = require("../models/GrowpathModuleRecord");

const router = express.Router();

const RECORD_TYPES = [
  "soil_builder_recipe",
  "dry_amendment_mix",
  "topdress_plan",
  "nutrient_source_comparison",
  "soil_nutrient_batch",
  "crop_steering_project",
  "crop_steering_entry",
  "ph_ec_check",
  "pheno_hunt",
  "stress_test",
  "genetics_note",
  "tissue_culture_project",
  "ipm_scout",
  "species_crop_id",
  "harvest_readiness_check",
  "harvest_batch",
  "dry_cure_check",
  "auto_grow_calendar",
  "clone_batch",
  "clone_batch_check",
  "run_comparison"
];

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
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
    return "";
  }
  return userId;
}

function stringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function cleanRecordPayload(body = {}) {
  const payload = { ...body };
  delete payload.id;
  delete payload._id;
  delete payload.userId;
  delete payload.deletedAt;
  payload.recordType = String(payload.recordType || "").trim();
  payload.title = String(payload.title || payload.recordType || "GrowPath record").trim();
  payload.status = String(payload.status || "active").trim();
  payload.warnings = stringArray(payload.warnings);
  payload.recommendations = stringArray(payload.recommendations);
  payload.limitations = stringArray(payload.limitations);
  payload.tags = stringArray(payload.tags);
  payload.linkedTaskIds = stringArray(payload.linkedTaskIds);
  payload.tasksToCreate = Array.isArray(payload.tasksToCreate)
    ? payload.tasksToCreate
    : [];
  return payload;
}

function dto(row) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  return {
    ...value,
    id: String(value._id || value.id || ""),
    _id: value._id ? String(value._id) : value._id,
    warnings: stringArray(value.warnings),
    recommendations: stringArray(value.recommendations),
    limitations: stringArray(value.limitations),
    tags: stringArray(value.tags),
    linkedTaskIds: stringArray(value.linkedTaskIds),
    tasksToCreate: Array.isArray(value.tasksToCreate) ? value.tasksToCreate : []
  };
}

function listQuery(req, userId) {
  const query = { userId, deletedAt: null };
  for (const key of [
    "recordType",
    "growId",
    "plantId",
    "phenoPlantId",
    "geneticsId",
    "facilityId",
    "harvestBatchId",
    "cloneBatchId",
    "cropProfileId",
    "status",
    "linkedToolRunId"
  ]) {
    if (req.query[key]) query[key] = String(req.query[key]);
  }
  if (req.query.tag) query.tags = String(req.query.tag);
  return query;
}

router.get("/types", (_req, res) => {
  res.json({ items: RECORD_TYPES });
});

router.get("/", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 250);
    const rows = await GrowpathModuleRecord.find(listQuery(req, userId))
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ items: (rows || []).map(dto) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const payload = cleanRecordPayload(req.body);
    if (!payload.recordType) {
      return res.status(400).json({ message: "recordType is required" });
    }
    if (!RECORD_TYPES.includes(payload.recordType)) {
      return res.status(400).json({ message: "Unsupported recordType" });
    }
    const item = await GrowpathModuleRecord.create({ ...payload, userId });
    return res.status(201).json({ item: dto(item) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const item = await GrowpathModuleRecord.findOne({
      _id: req.params.id,
      userId,
      deletedAt: null
    }).lean();
    if (!item) return res.status(404).json({ message: "Module record not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const patch = cleanRecordPayload(req.body);
    delete patch.recordType;
    const item = await GrowpathModuleRecord.findOneAndUpdate(
      { _id: req.params.id, userId, deletedAt: null },
      patch,
      { new: true, runValidators: true }
    ).lean();
    if (!item) return res.status(404).json({ message: "Module record not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const item = await GrowpathModuleRecord.findOneAndUpdate(
      { _id: req.params.id, userId, deletedAt: null },
      { deletedAt: new Date(), status: "archived" },
      { new: true }
    ).lean();
    if (!item) return res.status(404).json({ message: "Module record not found" });
    return res.json({ item: dto(item) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
