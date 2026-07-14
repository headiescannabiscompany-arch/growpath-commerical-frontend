"use strict";

const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Grow = require("../models/Grow");
const GrowLog = require("../models/GrowLog");
const Plant = require("../models/Plant");
const Task = require("../models/Task");
const ToolRun = require("../models/ToolRun");
const Diagnosis = require("../models/Diagnosis");
const DiagnosisFeedback = require("../models/DiagnosisFeedback");
const HarvestBatch = require("../models/HarvestBatch");
const AutomationEvent = require("../models/AutomationEvent");
const CropProfile = require("../models/CropProfile");
const PlantGrowthProfile = require("../models/PlantGrowthProfile");
const TelemetryPoint = require("../models/TelemetryPoint");
const TelemetrySource = require("../models/TelemetrySource");
const stableObjectIdFromAny = require("../helpers/stableObjectIdFromAny");
const growsPersonal = require("./grows.personal");

router.use("/grows", growsPersonal);

function userId(req) {
  return String(req.userId || req.ctx?.userId || req.user?._id || "");
}

function personalFacilityId(uid) {
  return `personal:${uid}`;
}

async function ownsGrow(uid, growId) {
  if (!growId) return false;
  const growFilters = [{ growId: String(growId) }];
  if (mongoose.isValidObjectId(growId)) growFilters.push({ _id: growId });
  return Boolean(
    await Grow.exists({
      $or: growFilters,
      $and: [{ $or: [{ user: uid }, { userId: uid }] }],
      deletedAt: null
    })
  );
}

function validObjectId(id) {
  return mongoose.isValidObjectId(String(id || ""));
}

function userObjectId(uid) {
  return validObjectId(uid) ? new mongoose.Types.ObjectId(String(uid)) : null;
}

async function sourceIdOwnedByUser({ uid, model, id, sourceName }) {
  if (!id) return true;
  const value = String(id);
  if (!validObjectId(value)) return true;
  const objectId = userObjectId(uid);
  let query;
  if (sourceName === "log") {
    query = { _id: value, userId: String(uid), deletedAt: null };
  } else {
    if (!objectId) return false;
    query = { _id: value, user: objectId };
  }
  return Boolean(await model.exists(query));
}

async function validateTaskSourceOwnership(uid, body) {
  const checks = [
    {
      field: "linkedLogId",
      sourceName: "log",
      model: GrowLog
    },
    {
      field: "sourceToolRunId",
      sourceName: "tool run",
      model: ToolRun
    },
    {
      field: "sourceDiagnosisId",
      sourceName: "diagnosis",
      model: Diagnosis
    }
  ];
  for (const check of checks) {
    if (body?.[check.field] === undefined || body?.[check.field] === null) continue;
    const id = body[check.field] ? String(body[check.field]) : "";
    if (!id) continue;
    const ok = await sourceIdOwnedByUser({
      uid,
      model: check.model,
      id,
      sourceName: check.sourceName
    });
    if (!ok) return `${check.sourceName} not found`;
  }
  return null;
}

function inferTaskSourceFields(body) {
  const sourceToolRunId = body?.sourceToolRunId ? String(body.sourceToolRunId) : null;
  const sourceDiagnosisId = body?.sourceDiagnosisId
    ? String(body.sourceDiagnosisId)
    : null;
  const linkedLogId = body?.linkedLogId ? String(body.linkedLogId) : null;
  let sourceType = body?.sourceType ? String(body.sourceType) : null;
  let sourceObjectId = body?.sourceObjectId ? String(body.sourceObjectId) : null;

  if (!sourceType) {
    if (sourceToolRunId) sourceType = "tool_run";
    else if (sourceDiagnosisId) sourceType = "ai_diagnosis";
    else if (linkedLogId) sourceType = "grow_log";
  }

  if (!sourceObjectId) {
    sourceObjectId = sourceToolRunId || sourceDiagnosisId || linkedLogId || null;
  }

  return {
    sourceType,
    sourceObjectId,
    sourceToolRunId,
    sourceDiagnosisId,
    linkedLogId
  };
}

async function linkTaskToSourceRecords(uid, taskId, sourceFields) {
  const id = String(taskId || "");
  if (!id) return;

  if (sourceFields?.sourceToolRunId && validObjectId(sourceFields.sourceToolRunId)) {
    await ToolRun.updateOne(
      { _id: sourceFields.sourceToolRunId, user: stableObjectIdFromAny(uid) },
      {
        $set: { linkedTaskId: id },
        $addToSet: { linkedTaskIds: id }
      }
    );
  }

  if (sourceFields?.sourceDiagnosisId && validObjectId(sourceFields.sourceDiagnosisId)) {
    const user = userObjectId(uid);
    if (user) {
      await Diagnosis.updateOne(
        { _id: sourceFields.sourceDiagnosisId, user },
        { $addToSet: { linkedTaskIds: id } }
      );
    }
  }
}

async function unlinkTaskFromSourceRecords(uid, taskId, sourceFields) {
  const id = String(taskId || "");
  if (!id) return;

  if (sourceFields?.sourceToolRunId && validObjectId(sourceFields.sourceToolRunId)) {
    await ToolRun.updateOne(
      {
        _id: sourceFields.sourceToolRunId,
        user: stableObjectIdFromAny(uid)
      },
      { $pull: { linkedTaskIds: id } }
    );
    await ToolRun.updateOne(
      {
        _id: sourceFields.sourceToolRunId,
        user: stableObjectIdFromAny(uid),
        linkedTaskId: id
      },
      { $unset: { linkedTaskId: "" } }
    );
  }

  if (sourceFields?.sourceDiagnosisId && validObjectId(sourceFields.sourceDiagnosisId)) {
    const user = userObjectId(uid);
    if (user) {
      await Diagnosis.updateOne(
        { _id: sourceFields.sourceDiagnosisId, user },
        { $pull: { linkedTaskIds: id } }
      );
    }
  }
}

async function relinkTaskSourceRecords(uid, taskId, previous, next) {
  const previousSources = {
    sourceToolRunId: previous?.sourceToolRunId || null,
    sourceDiagnosisId: previous?.sourceDiagnosisId || null
  };
  const nextSources = {
    sourceToolRunId: next?.sourceToolRunId || null,
    sourceDiagnosisId: next?.sourceDiagnosisId || null
  };
  if (
    String(previousSources.sourceToolRunId || "") !==
      String(nextSources.sourceToolRunId || "") ||
    String(previousSources.sourceDiagnosisId || "") !==
      String(nextSources.sourceDiagnosisId || "")
  ) {
    await unlinkTaskFromSourceRecords(uid, taskId, previousSources);
  }
  await linkTaskToSourceRecords(uid, taskId, nextSources);
}

async function linkLogToSourceRecords(uid, logId, sourceFields) {
  const id = String(logId || "");
  if (!id) return;

  if (sourceFields?.linkedToolRunId && validObjectId(sourceFields.linkedToolRunId)) {
    await ToolRun.updateOne(
      { _id: sourceFields.linkedToolRunId, user: stableObjectIdFromAny(uid) },
      { linkedLogId: id }
    );
  }

  if (sourceFields?.linkedDiagnosisId && validObjectId(sourceFields.linkedDiagnosisId)) {
    const user = userObjectId(uid);
    if (user) {
      await Diagnosis.updateOne(
        { _id: sourceFields.linkedDiagnosisId, user },
        { linkedLogId: id }
      );
    }
  }
}

async function unlinkLogFromPreviousSourceRecords(uid, logId, previous, next) {
  const id = String(logId || "");
  if (!id) return;

  const previousToolRunId = previous?.linkedToolRunId
    ? String(previous.linkedToolRunId)
    : null;
  const nextToolRunId = next?.linkedToolRunId ? String(next.linkedToolRunId) : null;
  if (
    previousToolRunId &&
    previousToolRunId !== nextToolRunId &&
    validObjectId(previousToolRunId)
  ) {
    await ToolRun.updateOne(
      {
        _id: previousToolRunId,
        user: stableObjectIdFromAny(uid),
        linkedLogId: id
      },
      { $unset: { linkedLogId: "" } }
    );
  }

  const previousDiagnosisId = previous?.linkedDiagnosisId
    ? String(previous.linkedDiagnosisId)
    : null;
  const nextDiagnosisId = next?.linkedDiagnosisId ? String(next.linkedDiagnosisId) : null;
  if (
    previousDiagnosisId &&
    previousDiagnosisId !== nextDiagnosisId &&
    validObjectId(previousDiagnosisId)
  ) {
    const user = userObjectId(uid);
    if (user) {
      await Diagnosis.updateOne(
        {
          _id: previousDiagnosisId,
          user,
          linkedLogId: id
        },
        { $unset: { linkedLogId: "" } }
      );
    }
  }
}

function userPlantQuery(uid) {
  const query = [{ userId: String(uid) }];
  const objectId = userObjectId(uid);
  if (objectId) query.push({ user: objectId });
  return query;
}

function logDto(row) {
  const value = row?.toObject ? row.toObject() : row;
  const aiInsight =
    value.aiInsight ||
    (Array.isArray(value.aiInsights) && value.aiInsights.length
      ? value.aiInsights[0]
      : undefined);
  return {
    ...value,
    id: String(value._id),
    notes: value.notes || value.note || "",
    rejectedTags: Array.isArray(value.rejectedTags) ? value.rejectedTags : [],
    photos: Array.isArray(value.photos) ? value.photos : [],
    photoMetadata: Array.isArray(value.photoMetadata) ? value.photoMetadata : [],
    aiInsight,
    toolRunId: value.toolRunId || value.linkedToolRunId || null,
    diagnosisId: value.diagnosisId || value.linkedDiagnosisId || null
  };
}

function normalizePhotoMetadata({ uid, growId, plantId, logId, photos, metadata }) {
  const metaRows = Array.isArray(metadata) ? metadata : [];
  return (Array.isArray(photos) ? photos : []).map((url, index) => {
    const source =
      metaRows[index] && typeof metaRows[index] === "object" ? metaRows[index] : {};
    return {
      userId: uid,
      growId,
      plantId: plantId || null,
      logId: logId ? String(logId) : null,
      url: String(source.url || url),
      storageKey: source.storageKey ? String(source.storageKey) : null,
      mimeType: source.mimeType ? String(source.mimeType) : null,
      sizeBytes: Number.isFinite(Number(source.sizeBytes))
        ? Number(source.sizeBytes)
        : null,
      width: Number.isFinite(Number(source.width)) ? Number(source.width) : null,
      height: Number.isFinite(Number(source.height)) ? Number(source.height) : null,
      stage: source.stage ? String(source.stage) : null,
      sourceLink: source.sourceLink ? String(source.sourceLink) : null,
      photoSourceLink: source.photoSourceLink
        ? String(source.photoSourceLink)
        : source.sourcePhotoUrl
          ? String(source.sourcePhotoUrl)
          : null,
      sourcePhotoUrl: source.sourcePhotoUrl
        ? String(source.sourcePhotoUrl)
        : source.photoSourceLink
          ? String(source.photoSourceLink)
          : null,
      sourceProvider: source.sourceProvider ? String(source.sourceProvider) : null,
      sourceType: source.sourceType ? String(source.sourceType) : null,
      rightsMode: source.rightsMode ? String(source.rightsMode) : null,
      attributionRequired: Boolean(source.attributionRequired),
      consentForAI: Boolean(source.consentForAI),
      consentForTraining: Boolean(source.consentForTraining),
      createdAt: source.createdAt || new Date().toISOString()
    };
  });
}

function taskDto(row) {
  const value = row?.toObject ? row.toObject() : row;
  return {
    ...value,
    id: String(value._id),
    description: value.notes || "",
    dueDate: value.dueAt || null,
    endAt: value.endAt || null,
    allDay: Boolean(value.allDay),
    snoozeUntil: value.snoozeUntil || null,
    reminderPlan: value.reminderPlan || null,
    calendarType: value.calendarType || null,
    sourceStage: value.sourceStage || null,
    recurrence: value.recurrence || null,
    completed: value.status === "DONE",
    sourceToolRunId: value.sourceToolRunId || null,
    sourceDiagnosisId: value.sourceDiagnosisId || null,
    sourceType: value.sourceType || null,
    sourceObjectId: value.sourceObjectId || null,
    linkedLogId: value.linkedLogId || null
  };
}

function harvestBatchDto(row) {
  const value = row?.toObject ? row.toObject() : row;
  return {
    ...value,
    id: String(value._id),
    harvestedAt: value.harvestedAt || null,
    dryStartedAt: value.dryStartedAt || null,
    dryEndedAt: value.dryEndedAt || null,
    cureStartedAt: value.cureStartedAt || null,
    dryCureRecords: Array.isArray(value.dryCureRecords) ? value.dryCureRecords : [],
    plantIds: Array.isArray(value.plantIds) ? value.plantIds : [],
    linkedToolRunIds: Array.isArray(value.linkedToolRunIds) ? value.linkedToolRunIds : []
  };
}

function harvestBatchPatch(body = {}) {
  const patch = {};
  ["batchCode", "name", "status", "weightUnit", "qualityNotes", "dryCureRecords"].forEach(
    (key) => {
      if (body?.[key] !== undefined) patch[key] = body[key];
    }
  );
  if (Array.isArray(body?.plantIds)) patch.plantIds = body.plantIds.map(String);
  if (Array.isArray(body?.linkedToolRunIds)) {
    patch.linkedToolRunIds = body.linkedToolRunIds.filter(Boolean).map(String);
  }
  ["wetWeight", "dryWeight"].forEach((key) => {
    if (body?.[key] !== undefined) {
      const numeric = Number(body[key]);
      patch[key] = Number.isFinite(numeric) ? numeric : null;
    }
  });
  ["harvestedAt", "dryStartedAt", "dryEndedAt", "cureStartedAt"].forEach((key) => {
    if (body?.[key] !== undefined) patch[key] = body[key] ? new Date(body[key]) : null;
  });
  return patch;
}

function growthProfileDto(row) {
  if (!row) return null;
  const value = row?.toObject ? row.toObject() : row;
  return {
    ...value,
    id: String(value._id),
    user: value.user ? String(value.user) : null,
    growId: value.growId ? String(value.growId) : null,
    plantId: value.plantId ? String(value.plantId) : null,
    cropProfile: value.cropProfile ? String(value.cropProfile) : null
  };
}

function plantDto(row, growthProfile = null) {
  const value = row?.toObject ? row.toObject() : row;
  return {
    ...value,
    id: String(value._id),
    growId: value.growId ? String(value.growId) : "",
    cropProfileId: value.cropProfileId ? String(value.cropProfileId) : null,
    strain: value.strain || value.cultivar || "",
    cultivar: value.cultivar || value.strain || "",
    growthProfile: growthProfileDto(growthProfile)
  };
}

async function growthProfilesByPlant(uid, plantRows = []) {
  const objectUser = userObjectId(uid);
  if (!objectUser || !plantRows.length) return new Map();
  const plantIds = plantRows
    .map((row) => row?._id)
    .filter((id) => id && mongoose.isValidObjectId(String(id)));
  if (!plantIds.length) return new Map();
  const overlays = await PlantGrowthProfile.find({
    user: objectUser,
    plantId: { $in: plantIds }
  }).lean();
  return new Map(overlays.map((overlay) => [String(overlay.plantId), overlay]));
}

async function buildPlantGrowthOverlay({ uid, growId, plant, body }) {
  const objectUser = userObjectId(uid);
  if (!objectUser || !plant?._id) return null;
  const cropProfileId =
    body?.cropProfileId && validObjectId(body.cropProfileId)
      ? new mongoose.Types.ObjectId(String(body.cropProfileId))
      : null;
  const hasOverlayInput =
    cropProfileId ||
    body?.confirmedScientificName ||
    body?.scientificName ||
    body?.cultivarName ||
    body?.cultivar ||
    body?.phenoLabel ||
    body?.sizeMetrics ||
    body?.timingAdjustments ||
    body?.waterUseProfile ||
    body?.stressSensitivities ||
    body?.pestDiseaseSensitivities;
  if (!hasOverlayInput) return null;

  const overlay = await PlantGrowthProfile.findOneAndUpdate(
    { user: objectUser, plantId: plant._id },
    {
      user: objectUser,
      growId: validObjectId(growId) ? new mongoose.Types.ObjectId(String(growId)) : null,
      plantId: plant._id,
      cropProfile: cropProfileId,
      confirmedScientificName: String(
        body?.confirmedScientificName || body?.scientificName || ""
      ),
      cultivarName: String(body?.cultivarName || body?.cultivar || body?.strain || ""),
      phenoLabel: String(body?.phenoLabel || ""),
      confirmationStatus: body?.confirmationStatus || "needs_confirmation",
      sizeMetrics: body?.sizeMetrics || {},
      timingAdjustments: body?.timingAdjustments || {},
      waterUseProfile: body?.waterUseProfile || {},
      stressSensitivities: Array.isArray(body?.stressSensitivities)
        ? body.stressSensitivities.map(String)
        : [],
      pestDiseaseSensitivities: Array.isArray(body?.pestDiseaseSensitivities)
        ? body.pestDiseaseSensitivities.map(String)
        : [],
      notes: String(body?.growthProfileNotes || body?.notes || "")
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  return overlay?.toObject ? overlay.toObject() : overlay;
}

function timelineDate(value) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function timelineEvent({
  row,
  type,
  sourceModel,
  title,
  summary,
  timestamp,
  tags = [],
  severity = null,
  payload = {}
}) {
  const value = row?.toObject ? row.toObject() : row;
  return {
    id: `${sourceModel}:${String(value._id)}`,
    userId: value.userId || value.createdByUserId || "",
    growId: value.growId
      ? String(value.growId)
      : sourceModel === "Grow"
        ? String(value._id)
        : null,
    plantId: value.plantId
      ? String(value.plantId)
      : sourceModel === "Plant"
        ? String(value._id)
        : null,
    type,
    sourceModel,
    sourceId: String(value._id),
    title,
    summary,
    timestamp: timelineDate(
      timestamp || value.date || value.createdAt || value.updatedAt
    ),
    tags,
    severity,
    payload
  };
}

function toolLabel(run = {}) {
  return String(run.toolName || run.toolType || "tool_run").replace(/[_-]+/g, " ");
}

function sortTimeline(events) {
  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function logTimelineType(log = {}) {
  const type = String(log.type || "").toLowerCase();
  const tags = Array.isArray(log.tags)
    ? log.tags.map((tag) => String(tag).toLowerCase())
    : [];
  const terms = [type, ...tags];
  if (
    terms.some((term) => ["feed", "feeding", "fertigation", "nutrient"].includes(term))
  ) {
    return "feeding_event";
  }
  if (terms.some((term) => ["harvest", "harvested"].includes(term))) {
    return "harvest_event";
  }
  return "log_created";
}

router.get("/plants", async (req, res, next) => {
  try {
    const uid = userId(req);
    const query = { $or: userPlantQuery(uid), deletedAt: null };
    if (req.query.growId) {
      const growId = String(req.query.growId);
      if (!validObjectId(growId)) {
        return res
          .status(200)
          .json({ success: true, plants: [], items: [], data: { plants: [] } });
      }
      query.growId = growId;
    }
    const rows = await Plant.find(query).sort({ createdAt: -1 }).lean();
    const overlays = await growthProfilesByPlant(uid, rows);
    const plants = rows.map((row) => plantDto(row, overlays.get(String(row._id))));
    return res
      .status(200)
      .json({ success: true, plants, items: plants, data: { plants } });
  } catch (error) {
    return next(error);
  }
});

router.post("/plants", async (req, res, next) => {
  try {
    const uid = userId(req);
    const growId = String(req.body?.growId || "");
    if (!(await ownsGrow(uid, growId)))
      return res.status(404).json({ success: false, message: "Grow not found" });
    const name = String(req.body?.name || "").trim();
    if (!name)
      return res.status(400).json({ success: false, message: "Plant name is required" });
    const objectId = userObjectId(uid);
    const cropProfileId =
      req.body?.cropProfileId && validObjectId(req.body.cropProfileId)
        ? new mongoose.Types.ObjectId(String(req.body.cropProfileId))
        : null;
    if (req.body?.cropProfileId && !cropProfileId) {
      return res
        .status(400)
        .json({ success: false, message: "cropProfileId must be a valid id" });
    }
    if (cropProfileId && !(await CropProfile.exists({ _id: cropProfileId }))) {
      return res.status(404).json({ success: false, message: "Crop profile not found" });
    }
    const row = await Plant.create({
      userId: uid,
      user: objectId,
      growId,
      grow: growId,
      growIds: [growId],
      name,
      strain: String(req.body?.strain || req.body?.cultivar || ""),
      cultivar: String(req.body?.cultivar || req.body?.strain || ""),
      scientificName: String(req.body?.scientificName || ""),
      cropCommonName: String(req.body?.cropCommonName || req.body?.crop || ""),
      cropProfileId,
      stage: String(req.body?.stage || "Seedling"),
      tag: String(req.body?.tag || ""),
      deletedAt: null,
      isActive: true
    });
    const plant = plantDto(row);
    const growthProfile = await buildPlantGrowthOverlay({
      uid,
      growId,
      plant: row,
      body: req.body || {}
    });
    return res.status(201).json({
      success: true,
      created: plant,
      plant,
      growthProfile,
      data: { plant, growthProfile }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/harvest-batches", async (req, res, next) => {
  try {
    const uid = userId(req);
    const query = { userId: uid, facilityId: personalFacilityId(uid), deletedAt: null };
    if (req.query.growId) query.growId = String(req.query.growId);
    const rows = await HarvestBatch.find(query)
      .sort({ harvestedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();
    const harvestBatches = rows.map(harvestBatchDto);
    return res.status(200).json({
      success: true,
      items: harvestBatches,
      harvestBatches,
      data: { harvestBatches }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/harvest-batches", async (req, res, next) => {
  try {
    const uid = userId(req);
    const growId = String(req.body?.growId || "");
    if (!(await ownsGrow(uid, growId))) {
      return res.status(404).json({ success: false, message: "Grow not found" });
    }
    const name = String(req.body?.name || req.body?.batchCode || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Batch name is required" });
    }
    const row = await HarvestBatch.create({
      facilityId: personalFacilityId(uid),
      userId: uid,
      growId,
      ...harvestBatchPatch(req.body),
      name
    });
    return res.status(201).json({
      success: true,
      harvestBatch: harvestBatchDto(row),
      data: { harvestBatch: harvestBatchDto(row) }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/harvest-batches/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id)) {
      return res.status(404).json({ message: "Harvest batch not found" });
    }
    const row = await HarvestBatch.findOne({
      _id: req.params.id,
      userId: uid,
      facilityId: personalFacilityId(uid),
      deletedAt: null
    });
    if (!row) return res.status(404).json({ message: "Harvest batch not found" });
    return res.json({
      success: true,
      harvestBatch: harvestBatchDto(row),
      item: harvestBatchDto(row),
      data: { harvestBatch: harvestBatchDto(row) }
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/harvest-batches/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id)) {
      return res.status(404).json({ message: "Harvest batch not found" });
    }
    const patch = harvestBatchPatch(req.body);
    const row = await HarvestBatch.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: uid,
        facilityId: personalFacilityId(uid),
        deletedAt: null
      },
      patch,
      { new: true, runValidators: true }
    );
    if (!row) return res.status(404).json({ message: "Harvest batch not found" });
    return res.json({
      success: true,
      harvestBatch: harvestBatchDto(row),
      data: { harvestBatch: harvestBatchDto(row) }
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/harvest-batches/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id)) {
      return res.status(404).json({ message: "Harvest batch not found" });
    }
    const row = await HarvestBatch.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: uid,
        facilityId: personalFacilityId(uid),
        deletedAt: null
      },
      { deletedAt: new Date(), status: "archived" },
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "Harvest batch not found" });
    return res.json({ success: true, deleted: true, archived: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/grows/:growId/timeline", async (req, res, next) => {
  try {
    const uid = userId(req);
    const growId = String(req.params.growId || "");
    if (!(await ownsGrow(uid, growId))) {
      return res.status(404).json({ success: false, message: "Grow not found" });
    }

    const userObject = stableObjectIdFromAny(uid);
    const plantGrowId = validObjectId(growId)
      ? new mongoose.Types.ObjectId(String(growId))
      : growId;
    const [
      grow,
      plants,
      logs,
      tasks,
      toolRuns,
      diagnoses,
      diagnosisFeedback,
      harvestBatches,
      automationEvents
    ] = await Promise.all([
      Grow.findOne({
        $or: [{ growId }, ...(validObjectId(growId) ? [{ _id: growId }] : [])],
        $and: [{ $or: [{ user: uid }, { userId: uid }] }],
        deletedAt: null
      }).lean(),
      Plant.find({
        $or: userPlantQuery(uid),
        growId: plantGrowId,
        deletedAt: null
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      GrowLog.find({ userId: uid, growId, deletedAt: null })
        .sort({ date: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      Task.find({
        createdByUserId: uid,
        facilityId: personalFacilityId(uid),
        growId,
        deletedAt: null
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      ToolRun.find({ user: userObject, growId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      Diagnosis.find({ user: userObject, growId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      DiagnosisFeedback.find({ user: userObject, growId, deletedAt: null })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      HarvestBatch.find({
        userId: uid,
        facilityId: personalFacilityId(uid),
        growId,
        deletedAt: null
      })
        .sort({ harvestedAt: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      AutomationEvent.find({ user: userObject, userId: uid, growId })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean()
    ]);
    const telemetrySources = await TelemetrySource.find({
      ownerUserId: uid,
      growId,
      deletedAt: null
    })
      .limit(100)
      .lean();
    const telemetrySourceIds = telemetrySources.map((source) => source._id);
    const telemetrySourceById = new Map(
      telemetrySources.map((source) => [String(source._id), source])
    );
    const telemetryPoints = telemetrySourceIds.length
      ? await TelemetryPoint.find({ sourceId: { $in: telemetrySourceIds } })
          .sort({ ts: -1 })
          .limit(100)
          .lean()
      : [];

    const events = [];

    if (grow) {
      events.push(
        timelineEvent({
          row: grow,
          type: "grow_created",
          sourceModel: "Grow",
          title: `${grow.name || grow.title || "Grow"} created`,
          summary: grow.stage || grow.systemPreset || "Grow workspace was created.",
          timestamp: grow.createdAt,
          tags: ["grow"].filter(Boolean),
          payload: {
            stage: grow.stage || null,
            cultivar: grow.cultivar || grow.strain || null,
            systemPreset: grow.systemPreset || null,
            anchorDateType: grow.anchorDateType || null,
            anchorDate: grow.anchorDate || null
          }
        })
      );
    }

    for (const plant of plants) {
      events.push(
        timelineEvent({
          row: plant,
          type: "plant_added",
          sourceModel: "Plant",
          title: `${plant.name || plant.tag || "Plant"} added`,
          summary:
            [plant.cropCommonName, plant.scientificName, plant.cultivar || plant.strain]
              .filter(Boolean)
              .join(" | ") || "Plant was added to this grow.",
          timestamp: plant.createdAt,
          tags: ["plant", plant.cropCommonName, plant.stage].filter(Boolean),
          payload: {
            cropCommonName: plant.cropCommonName || "",
            scientificName: plant.scientificName || "",
            cultivar: plant.cultivar || plant.strain || "",
            stage: plant.stage || "",
            cropProfileId: plant.cropProfileId ? String(plant.cropProfileId) : null
          }
        })
      );
    }

    for (const log of logs) {
      events.push(
        timelineEvent({
          row: log,
          type: logTimelineType(log),
          sourceModel: "GrowLog",
          title: log.title || "Grow journal entry",
          summary: log.notes || log.note || "",
          timestamp: log.date || log.createdAt,
          tags: Array.isArray(log.tags) ? log.tags : [],
          payload: {
            linkedToolRunId: log.linkedToolRunId || null,
            linkedDiagnosisId: log.linkedDiagnosisId || null,
            photoCount: Array.isArray(log.photos) ? log.photos.length : 0
          }
        })
      );
      const photos = Array.isArray(log.photos) ? log.photos : [];
      const photoMetadata = Array.isArray(log.photoMetadata) ? log.photoMetadata : [];
      photos.forEach((photoUrl, index) => {
        const metadata = photoMetadata[index] || {};
        events.push({
          ...timelineEvent({
            row: log,
            type: "photo_added",
            sourceModel: "GrowLog",
            title: `Photo added: ${log.title || "Grow journal entry"}`,
            summary: String(photoUrl || ""),
            timestamp: metadata.createdAt || log.date || log.createdAt,
            tags: ["photo", ...(Array.isArray(log.tags) ? log.tags : [])],
            payload: {
              linkedLogId: String(log._id),
              photoIndex: index,
              url: String(photoUrl || ""),
              metadata
            }
          }),
          id: `GrowLog:${String(log._id)}:photo:${index}`
        });
      });
    }

    for (const point of telemetryPoints) {
      const source = telemetrySourceById.get(String(point.sourceId));
      events.push(
        timelineEvent({
          row: {
            ...point,
            userId: uid,
            growId
          },
          type: "environment_reading",
          sourceModel: "TelemetryPoint",
          title: `Environment reading${source?.name ? `: ${source.name}` : ""}`,
          summary: `Temp ${point.airTempC}C | RH ${point.rh}% | dew point ${point.dewPointC}C`,
          timestamp: point.ts || point.createdAt,
          tags: ["environment", source?.type].filter(Boolean),
          payload: {
            sourceId: point.sourceId ? String(point.sourceId) : null,
            sourceName: source?.name || "",
            sourceType: source?.type || "",
            airTempC: point.airTempC,
            rh: point.rh,
            leafTempC: point.leafTempC ?? null,
            canopyTempC: point.canopyTempC ?? null,
            canopyRh: point.canopyRh ?? null,
            dewPointC: point.dewPointC,
            vpdKpa: point.vpdKpa ?? null,
            co2Ppm: point.co2Ppm ?? null,
            ppfd: point.ppfd ?? null
          }
        })
      );
    }

    for (const task of tasks) {
      events.push(
        timelineEvent({
          row: task,
          type: task.status === "DONE" ? "task_completed" : "task_created",
          sourceModel: "Task",
          title: task.title || "Task",
          summary: task.notes || "",
          timestamp: task.status === "DONE" ? task.updatedAt : task.createdAt,
          severity: task.priority || "medium",
          payload: {
            status: task.status,
            dueAt: task.dueAt || null,
            sourceType: task.sourceType || null,
            sourceObjectId: task.sourceObjectId || null,
            sourceToolRunId: task.sourceToolRunId || null,
            sourceDiagnosisId: task.sourceDiagnosisId || null,
            linkedLogId: task.linkedLogId || null
          }
        })
      );
    }

    for (const run of toolRuns) {
      events.push(
        timelineEvent({
          row: run,
          type: "tool_run_created",
          sourceModel: "ToolRun",
          title: `${toolLabel(run)} result`,
          summary: run.summary || `${toolLabel(run)} completed`,
          timestamp: run.createdAt,
          tags: [run.toolName || run.toolType || "tool_run"].filter(Boolean),
          severity: Array.isArray(run.warnings) && run.warnings.length ? "watch" : null,
          payload: {
            warnings: run.warnings || [],
            recommendations: run.recommendations || [],
            linkedLogId: run.linkedLogId || null,
            linkedTaskId: run.linkedTaskId || null
          }
        })
      );
    }

    for (const diagnosis of diagnoses) {
      events.push(
        timelineEvent({
          row: diagnosis,
          type: "diagnosis_created",
          sourceModel: "Diagnosis",
          title: diagnosis.issueSummary || "Plant diagnosis",
          summary: diagnosis.aiExplanation || diagnosis.notes || "",
          timestamp: diagnosis.createdAt,
          tags: Array.isArray(diagnosis.tags) ? diagnosis.tags : [],
          severity: diagnosis.severity || null,
          payload: {
            linkedLogId: diagnosis.linkedLogId || null,
            linkedTaskIds: diagnosis.linkedTaskIds || [],
            overallHealth: diagnosis.aiResult?.overallHealth || null,
            feedbackCount: Number(diagnosis.feedbackCount || 0),
            feedbackSummary: diagnosis.feedbackSummary || null
          }
        })
      );
    }

    for (const feedback of diagnosisFeedback) {
      const verdict = String(feedback.verdict || "unsure");
      const symptomChange = String(feedback.symptomChange || "unknown");
      events.push(
        timelineEvent({
          row: feedback,
          type: "diagnosis_feedback",
          sourceModel: "DiagnosisFeedback",
          title: `Diagnosis feedback: ${verdict.replace(/_/g, " ")}`,
          summary:
            feedback.notes ||
            feedback.confirmedIssue ||
            "Outcome feedback saved for this diagnosis.",
          timestamp: feedback.createdAt,
          tags: ["diagnosis_feedback", verdict, symptomChange].filter(Boolean),
          severity:
            verdict === "not_accurate" || symptomChange === "worse" ? "watch" : null,
          payload: {
            diagnosisId: feedback.diagnosis ? String(feedback.diagnosis) : null,
            issueSummary: feedback.issueSummary || "",
            diagnosisClass: feedback.diagnosisClass || "",
            providerName: feedback.providerName || "",
            providerModel: feedback.providerModel || "",
            verdict,
            symptomChange,
            confirmedIssue: feedback.confirmedIssue || "",
            actionsTaken: Array.isArray(feedback.actionsTaken)
              ? feedback.actionsTaken
              : [],
            observedAfterDays: feedback.observedAfterDays ?? null,
            outcomeWindowDays: feedback.outcomeWindowDays ?? null,
            consentForModelTraining: Boolean(feedback.consentForModelTraining)
          }
        })
      );
    }

    for (const batch of harvestBatches) {
      const recordCount = Array.isArray(batch.dryCureRecords)
        ? batch.dryCureRecords.length
        : 0;
      events.push(
        timelineEvent({
          row: batch,
          type: "harvest_batch_created",
          sourceModel: "HarvestBatch",
          title: batch.name || batch.batchCode || "Harvest batch",
          summary: [
            batch.status ? `Status: ${batch.status}` : "",
            batch.wetWeight != null
              ? `Wet: ${batch.wetWeight} ${batch.weightUnit || "g"}`
              : "",
            batch.dryWeight != null
              ? `Dry: ${batch.dryWeight} ${batch.weightUnit || "g"}`
              : "",
            recordCount
              ? `${recordCount} dry/cure record${recordCount === 1 ? "" : "s"}`
              : "",
            batch.qualityNotes || ""
          ]
            .filter(Boolean)
            .join(" | "),
          timestamp: batch.harvestedAt || batch.createdAt,
          tags: ["harvest", "dry_cure", batch.status].filter(Boolean),
          severity:
            batch.status === "drying" || batch.status === "curing" ? "watch" : null,
          payload: {
            batchCode: batch.batchCode || "",
            plantIds: Array.isArray(batch.plantIds) ? batch.plantIds : [],
            wetWeight: batch.wetWeight ?? null,
            dryWeight: batch.dryWeight ?? null,
            weightUnit: batch.weightUnit || "g",
            dryStartedAt: batch.dryStartedAt || null,
            dryEndedAt: batch.dryEndedAt || null,
            cureStartedAt: batch.cureStartedAt || null,
            dryCureRecords: Array.isArray(batch.dryCureRecords)
              ? batch.dryCureRecords
              : [],
            linkedToolRunIds: Array.isArray(batch.linkedToolRunIds)
              ? batch.linkedToolRunIds
              : []
          }
        })
      );
    }

    for (const event of automationEvents) {
      events.push(
        timelineEvent({
          row: event,
          type: "automation_event",
          sourceModel: "AutomationEvent",
          title: `Automation: ${event.eventType}`,
          summary: `${event.source}:${event.eventType}`,
          timestamp: event.createdAt,
          tags: ["automation", event.source, event.eventType].filter(Boolean),
          severity: event.errors?.length ? "warning" : null,
          payload: {
            processed: Boolean(event.processed),
            matchedPolicyIds: event.matchedPolicyIds || [],
            errors: event.errors || [],
            data: event.payload || {}
          }
        })
      );
    }

    const timeline = sortTimeline(events);
    return res.status(200).json({
      success: true,
      timeline,
      events: timeline,
      items: timeline,
      data: { timeline }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/logs", async (req, res, next) => {
  try {
    const uid = userId(req);
    const query = { userId: uid, deletedAt: null };
    if (req.query.growId) query.growId = String(req.query.growId);
    const rows = await GrowLog.find(query).sort({ date: -1, createdAt: -1 }).lean();
    const logs = rows.map(logDto);
    return res.status(200).json({ success: true, items: logs, logs, data: { logs } });
  } catch (error) {
    return next(error);
  }
});

router.post("/logs", async (req, res, next) => {
  try {
    const uid = userId(req);
    const growId = String(req.body?.growId || "");
    if (!(await ownsGrow(uid, growId)))
      return res.status(404).json({ success: false, message: "Grow not found" });
    const notes = String(req.body?.notes || req.body?.note || "");
    const plantId = req.body?.plantId ? String(req.body.plantId) : null;
    const photos = Array.isArray(req.body?.photos)
      ? req.body.photos.filter(Boolean).map(String)
      : [];
    const row = await GrowLog.create({
      facilityId: personalFacilityId(uid),
      userId: uid,
      growId,
      plantId,
      title: String(req.body?.title || "Grow journal entry"),
      note: notes,
      notes,
      type: req.body?.type ? String(req.body.type) : null,
      date: req.body?.date ? new Date(req.body.date) : new Date(),
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      rejectedTags: Array.isArray(req.body?.rejectedTags) ? req.body.rejectedTags : [],
      aiInsights: req.body?.aiInsight ? [req.body.aiInsight] : [],
      photos,
      photoMetadata: normalizePhotoMetadata({
        uid,
        growId,
        plantId,
        photos,
        metadata: req.body?.photoMetadata
      }),
      linkedToolRunId: req.body?.toolRunId ? String(req.body.toolRunId) : null,
      linkedDiagnosisId: req.body?.diagnosisId ? String(req.body.diagnosisId) : null
    });
    await linkLogToSourceRecords(uid, row._id, row);
    if (row.photoMetadata?.length) {
      row.photoMetadata = normalizePhotoMetadata({
        uid,
        growId,
        plantId,
        logId: row._id,
        photos: row.photos,
        metadata: row.photoMetadata
      });
      await row.save();
    }
    return res
      .status(201)
      .json({ success: true, log: logDto(row), data: { log: logDto(row) } });
  } catch (error) {
    return next(error);
  }
});

router.get("/logs/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id))
      return res.status(404).json({ message: "Log not found" });
    const row = await GrowLog.findOne({
      _id: req.params.id,
      userId: uid,
      deletedAt: null
    });
    if (!row) return res.status(404).json({ message: "Log not found" });
    return res.json({
      success: true,
      log: logDto(row),
      item: logDto(row),
      data: { log: logDto(row) }
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/logs/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id))
      return res.status(404).json({ message: "Log not found" });
    const existing = await GrowLog.findOne({
      _id: req.params.id,
      userId: uid,
      deletedAt: null
    }).lean();
    if (!existing) return res.status(404).json({ message: "Log not found" });
    const patch = {};
    ["title", "type", "plantId"].forEach((key) => {
      if (req.body?.[key] !== undefined) patch[key] = req.body[key];
    });
    if (req.body?.notes !== undefined || req.body?.note !== undefined)
      patch.note = patch.notes = String(req.body.notes ?? req.body.note);
    if (req.body?.date !== undefined) patch.date = new Date(req.body.date);
    if (Array.isArray(req.body?.tags)) patch.tags = req.body.tags;
    if (Array.isArray(req.body?.rejectedTags)) patch.rejectedTags = req.body.rejectedTags;
    if (Array.isArray(req.body?.photos)) {
      patch.photos = req.body.photos.filter(Boolean).map(String);
      const nextPlantId =
        req.body?.plantId !== undefined
          ? req.body.plantId
            ? String(req.body.plantId)
            : null
          : existing.plantId || null;
      patch.photoMetadata = normalizePhotoMetadata({
        uid,
        growId: existing.growId,
        plantId: nextPlantId,
        logId: req.params.id,
        photos: patch.photos,
        metadata: req.body?.photoMetadata
      });
    }
    if (req.body?.aiInsight !== undefined)
      patch.aiInsights = req.body.aiInsight ? [req.body.aiInsight] : [];
    if (req.body?.toolRunId !== undefined)
      patch.linkedToolRunId = req.body.toolRunId ? String(req.body.toolRunId) : null;
    if (req.body?.diagnosisId !== undefined)
      patch.linkedDiagnosisId = req.body.diagnosisId
        ? String(req.body.diagnosisId)
        : null;
    const row = await GrowLog.findOneAndUpdate(
      { _id: req.params.id, userId: uid, deletedAt: null },
      patch,
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "Log not found" });
    const nextSources = {
      linkedToolRunId: Object.prototype.hasOwnProperty.call(patch, "linkedToolRunId")
        ? patch.linkedToolRunId
        : existing.linkedToolRunId,
      linkedDiagnosisId: Object.prototype.hasOwnProperty.call(patch, "linkedDiagnosisId")
        ? patch.linkedDiagnosisId
        : existing.linkedDiagnosisId
    };
    await unlinkLogFromPreviousSourceRecords(uid, row._id, existing, nextSources);
    await linkLogToSourceRecords(uid, row._id, nextSources);
    return res.json({ success: true, log: logDto(row), data: { log: logDto(row) } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/logs/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id))
      return res.status(404).json({ message: "Log not found" });
    const row = await GrowLog.findOneAndUpdate(
      { _id: req.params.id, userId: uid, deletedAt: null },
      { deletedAt: new Date(), isActive: false },
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "Log not found" });
    await unlinkLogFromPreviousSourceRecords(uid, row._id, row, {
      linkedToolRunId: null,
      linkedDiagnosisId: null
    });
    return res.json({ success: true, deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/tasks", async (req, res, next) => {
  try {
    const uid = userId(req);
    const query = {
      createdByUserId: uid,
      facilityId: personalFacilityId(uid),
      deletedAt: null
    };
    if (req.query.growId) query.growId = String(req.query.growId);
    const rows = await Task.find(query).sort({ dueAt: 1, createdAt: -1 }).lean();
    const tasks = rows.map(taskDto);
    return res.status(200).json({ success: true, items: tasks, tasks, data: { tasks } });
  } catch (error) {
    return next(error);
  }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const uid = userId(req);
    const growId = String(req.body?.growId || "");
    if (!(await ownsGrow(uid, growId)))
      return res.status(404).json({ message: "Grow not found" });
    const title = String(req.body?.title || "").trim();
    if (!title) return res.status(400).json({ message: "Task title is required" });
    const sourceError = await validateTaskSourceOwnership(uid, req.body);
    if (sourceError) return res.status(404).json({ message: sourceError });
    const sourceFields = inferTaskSourceFields(req.body);
    const row = await Task.create({
      facilityId: personalFacilityId(uid),
      createdByUserId: uid,
      assignedToUserId: uid,
      growId,
      plantId: req.body?.plantId ? String(req.body.plantId) : null,
      title,
      notes: String(req.body?.description || req.body?.notes || ""),
      dueAt:
        req.body?.dueDate || req.body?.dueAt
          ? new Date(req.body.dueDate || req.body.dueAt)
          : null,
      endAt: req.body?.endAt ? new Date(req.body.endAt) : null,
      allDay: Boolean(req.body?.allDay),
      snoozeUntil: req.body?.snoozeUntil ? new Date(req.body.snoozeUntil) : null,
      reminderPlan:
        req.body?.reminderPlan && typeof req.body.reminderPlan === "object"
          ? req.body.reminderPlan
          : null,
      recurrence:
        req.body?.recurrence && typeof req.body.recurrence === "object"
          ? req.body.recurrence
          : null,
      priority: req.body?.priority || "medium",
      calendarType: req.body?.calendarType ? String(req.body.calendarType) : null,
      sourceStage: req.body?.sourceStage ? String(req.body.sourceStage) : null,
      status: req.body?.completed ? "DONE" : "OPEN",
      sourceType: sourceFields.sourceType,
      sourceObjectId: sourceFields.sourceObjectId,
      sourceToolRunId: sourceFields.sourceToolRunId,
      sourceDiagnosisId: sourceFields.sourceDiagnosisId,
      linkedLogId: sourceFields.linkedLogId,
      linkedCourseId: req.body?.linkedCourseId
        ? String(req.body.linkedCourseId)
        : null,
      linkedLiveId: req.body?.linkedLiveId ? String(req.body.linkedLiveId) : null,
      actionUrl: req.body?.actionUrl ? String(req.body.actionUrl) : null
    });
    await linkTaskToSourceRecords(uid, row._id, sourceFields);
    return res
      .status(201)
      .json({ success: true, task: taskDto(row), data: { task: taskDto(row) } });
  } catch (error) {
    return next(error);
  }
});

router.get("/tasks/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id))
      return res.status(404).json({ message: "Task not found" });
    const row = await Task.findOne({
      _id: req.params.id,
      createdByUserId: uid,
      facilityId: personalFacilityId(uid),
      deletedAt: null
    });
    if (!row) return res.status(404).json({ message: "Task not found" });
    return res.json({
      success: true,
      task: taskDto(row),
      item: taskDto(row),
      data: { task: taskDto(row) }
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id))
      return res.status(404).json({ message: "Task not found" });
    const patch = {};
    if (req.body?.title !== undefined) patch.title = String(req.body.title);
    if (req.body?.description !== undefined || req.body?.notes !== undefined)
      patch.notes = String(req.body.description ?? req.body.notes);
    if (req.body?.dueDate !== undefined || req.body?.dueAt !== undefined)
      patch.dueAt =
        req.body.dueDate === null || req.body.dueAt === null
          ? null
          : new Date(req.body.dueDate ?? req.body.dueAt);
    if (req.body?.endAt !== undefined)
      patch.endAt = req.body.endAt ? new Date(req.body.endAt) : null;
    if (req.body?.allDay !== undefined) patch.allDay = Boolean(req.body.allDay);
    if (req.body?.snoozeUntil !== undefined)
      patch.snoozeUntil = req.body.snoozeUntil ? new Date(req.body.snoozeUntil) : null;
    if (req.body?.reminderPlan !== undefined)
      patch.reminderPlan =
        req.body.reminderPlan && typeof req.body.reminderPlan === "object"
          ? req.body.reminderPlan
          : null;
    if (req.body?.recurrence !== undefined)
      patch.recurrence =
        req.body.recurrence && typeof req.body.recurrence === "object"
          ? req.body.recurrence
          : null;
    if (req.body?.priority !== undefined) patch.priority = req.body.priority;
    if (req.body?.calendarType !== undefined)
      patch.calendarType = req.body.calendarType ? String(req.body.calendarType) : null;
    if (req.body?.sourceStage !== undefined)
      patch.sourceStage = req.body.sourceStage ? String(req.body.sourceStage) : null;
    const sourceError = await validateTaskSourceOwnership(uid, req.body);
    if (sourceError) return res.status(404).json({ message: sourceError });
    const hasSourcePatch =
      req.body?.sourceType !== undefined ||
      req.body?.sourceObjectId !== undefined ||
      req.body?.sourceToolRunId !== undefined ||
      req.body?.sourceDiagnosisId !== undefined ||
      req.body?.linkedLogId !== undefined;
    let existingSources = null;
    if (hasSourcePatch) {
      existingSources = await Task.findOne({
        _id: req.params.id,
        createdByUserId: uid,
        facilityId: personalFacilityId(uid),
        deletedAt: null
      })
        .select("sourceToolRunId sourceDiagnosisId linkedLogId")
        .lean();
      if (!existingSources) return res.status(404).json({ message: "Task not found" });
    }
    if (hasSourcePatch) {
      const sourceFields = inferTaskSourceFields(req.body);
      const hasSourceSpecificPatch =
        req.body?.sourceToolRunId !== undefined ||
        req.body?.sourceDiagnosisId !== undefined ||
        req.body?.linkedLogId !== undefined;
      if (req.body?.sourceType !== undefined || hasSourceSpecificPatch)
        patch.sourceType = sourceFields.sourceType;
      if (req.body?.sourceObjectId !== undefined || hasSourceSpecificPatch)
        patch.sourceObjectId = sourceFields.sourceObjectId;
      if (req.body?.sourceToolRunId !== undefined)
        patch.sourceToolRunId = sourceFields.sourceToolRunId;
      if (req.body?.sourceDiagnosisId !== undefined)
        patch.sourceDiagnosisId = sourceFields.sourceDiagnosisId;
      if (req.body?.linkedLogId !== undefined)
        patch.linkedLogId = sourceFields.linkedLogId;
    }
    if (req.body?.completed !== undefined)
      patch.status = req.body.completed ? "DONE" : "OPEN";
    const row = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        createdByUserId: uid,
        facilityId: personalFacilityId(uid),
        deletedAt: null
      },
      patch,
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "Task not found" });
    if (hasSourcePatch) {
      await relinkTaskSourceRecords(uid, row._id, existingSources, row);
    }
    return res.json({ success: true, task: taskDto(row), data: { task: taskDto(row) } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const uid = userId(req);
    if (!validObjectId(req.params.id))
      return res.status(404).json({ message: "Task not found" });
    const row = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        createdByUserId: uid,
        facilityId: personalFacilityId(uid),
        deletedAt: null
      },
      { deletedAt: new Date(), isActive: false },
      { new: true }
    );
    if (!row) return res.status(404).json({ message: "Task not found" });
    await unlinkTaskFromSourceRecords(uid, row._id, row);
    return res.json({ success: true, deleted: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
