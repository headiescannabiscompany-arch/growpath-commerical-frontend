"use strict";

const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const ToolRun = require("../models/ToolRun");
const NutrientRecipe = require("../models/NutrientRecipe");

function userId(req) {
  return req.user && req.user.id;
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function stringOrNull(value) {
  const text = value == null ? "" : String(value).trim();
  return text || null;
}

function normalizeToolRunBody(body) {
  const inputs = objectOrEmpty(body.inputs ?? body.input ?? body.params);
  const outputs = objectOrEmpty(body.outputs ?? body.output ?? body.result);
  const toolType = String(body.toolType || body.toolName || "").trim();
  const toolName = String(body.toolName || body.toolType || "").trim();
  const growId = String(body.growId || "").trim();

  return {
    growId,
    plantId: stringOrNull(body.plantId || body.selectedPlantContext?.id),
    cropProfileId: stringOrNull(
      body.cropProfileId ||
        body.selectedPlantContext?.cropProfileId ||
        body.plantGrowthProfile?.cropProfile
    ),
    cropIdentity: objectOrEmpty(body.cropIdentity) || null,
    selectedPlantContext: objectOrEmpty(body.selectedPlantContext) || null,
    plantGrowthProfile: objectOrEmpty(body.plantGrowthProfile) || null,
    toolName,
    toolType,
    schemaVersion: Number.isFinite(Number(body.schemaVersion))
      ? Number(body.schemaVersion)
      : 1,
    calculatorVersion: String(body.calculatorVersion || "1"),
    status: String(body.status || "completed"),
    inputs,
    outputs,
    warnings: Array.isArray(body.warnings) ? body.warnings.map(String) : [],
    recommendations: Array.isArray(body.recommendations)
      ? body.recommendations.map(String)
      : [],
    formulas: Array.isArray(body.formulas) ? body.formulas.map(String) : [],
    confidence: body.confidence ?? null,
    uncertainty: body.uncertainty ?? null,
    sourceType: String(body.sourceType || "manual_tool_run"),
    sourceObjectId: stringOrNull(body.sourceObjectId),
    linkedLogId: stringOrNull(body.linkedLogId),
    linkedTaskIds: Array.isArray(body.linkedTaskIds)
      ? body.linkedTaskIds.map(String)
      : body.linkedTaskId
        ? [String(body.linkedTaskId)]
        : [],
    linkedRecipeId: stringOrNull(body.linkedRecipeId),
    linkedDiagnosisId: stringOrNull(body.linkedDiagnosisId),
    linkedTimelineEventId: stringOrNull(body.linkedTimelineEventId),
    immutableSnapshot: objectOrEmpty(body.immutableSnapshot)
  };
}

function withImmutableSnapshot(payload) {
  if (payload.immutableSnapshot && Object.keys(payload.immutableSnapshot).length > 0) {
    return payload;
  }
  return {
    ...payload,
    immutableSnapshot: {
      toolName: payload.toolName,
      toolType: payload.toolType,
      growId: payload.growId,
      plantId: payload.plantId,
      cropProfileId: payload.cropProfileId,
      schemaVersion: payload.schemaVersion,
      calculatorVersion: payload.calculatorVersion,
      inputs: payload.inputs,
      outputs: payload.outputs,
      warnings: payload.warnings,
      recommendations: payload.recommendations
    }
  };
}

function recipePayload(req, overrides = {}) {
  const body = req.body || {};
  return {
    userId: userId(req),
    growId: stringOrNull(body.growId),
    recipeType: String(body.recipeType || "nutrient_solution"),
    name: String(body.name || "").trim(),
    description: String(body.description || ""),
    version: Number.isFinite(Number(body.version)) ? Number(body.version) : 1,
    parentRecipeId: stringOrNull(body.parentRecipeId),
    stage: String(body.stage || ""),
    medium: String(body.medium || ""),
    batchVolume: Number.isFinite(Number(body.batchVolume))
      ? Number(body.batchVolume)
      : 0,
    batchUnit: String(body.batchUnit || "gal"),
    products: Array.isArray(body.products) ? body.products : [],
    ingredients: Array.isArray(body.ingredients) ? body.ingredients : [],
    waterBaseline: objectOrEmpty(body.waterBaseline),
    releaseEnvironment: objectOrEmpty(body.releaseEnvironment),
    measuredEC: Number.isFinite(Number(body.measuredEC)) ? Number(body.measuredEC) : null,
    measuredPH: Number.isFinite(Number(body.measuredPH)) ? Number(body.measuredPH) : null,
    calculatedTotals: objectOrEmpty(body.calculatedTotals),
    calculation: objectOrEmpty(body.calculation),
    releaseTimeline: objectOrEmpty(body.releaseTimeline),
    warnings: Array.isArray(body.warnings) ? body.warnings.map(String) : [],
    sourceConfidence: objectOrEmpty(body.sourceConfidence),
    notes: String(body.notes || ""),
    ...overrides
  };
}

router.get("/", auth, async (req, res) => {
  try {
    const query = { userId: userId(req), deletedAt: null };
    if (req.query.growId) query.growId = String(req.query.growId);

    const items = await ToolRun.find(query).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, items, tools: items });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load tool runs" });
  }
});

router.post("/", auth, async (req, res) => {
  const normalized = normalizeToolRunBody(req.body || {});

  if (!normalized.growId) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "growId is required" }
    });
  }
  if (!normalized.toolType || !normalized.toolName) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "toolType is required" }
    });
  }

  try {
    const payload = withImmutableSnapshot({ ...normalized, userId: userId(req) });
    const created = await ToolRun.create(payload);
    return res.status(201).json({ success: true, created, tool: created });
  } catch (err) {
    return res.status(500).json({ message: "Failed to save tool run" });
  }
});

router.get("/runs/:id", auth, async (req, res) => {
  try {
    const toolRun = await ToolRun.findOne({
      _id: req.params.id,
      userId: userId(req),
      deletedAt: null
    }).lean();
    if (!toolRun) return res.status(404).json({ message: "Tool run not found" });
    return res.json({ success: true, toolRun });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load tool run" });
  }
});

router.get("/recipes", auth, async (req, res) => {
  try {
    const query = { userId: userId(req), deletedAt: null };
    if (req.query.growId) query.growId = String(req.query.growId);
    const items = await NutrientRecipe.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load recipes" });
  }
});

router.post("/recipes", auth, async (req, res) => {
  const payload = recipePayload(req);
  if (!payload.name) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "name is required" }
    });
  }

  try {
    const recipe = await NutrientRecipe.create(payload);
    return res.status(201).json({ success: true, recipe });
  } catch (err) {
    return res.status(500).json({ message: "Failed to save recipe" });
  }
});

router.post("/recipes/:id/revisions", auth, async (req, res) => {
  try {
    const existing = await NutrientRecipe.findOne({
      _id: req.params.id,
      userId: userId(req),
      deletedAt: null
    }).lean();
    if (!existing) return res.status(404).json({ message: "Recipe not found" });

    const recipe = await NutrientRecipe.create(
      recipePayload(req, {
        parentRecipeId: String(existing._id || req.params.id),
        name: String(req.body?.name || existing.name || "").trim(),
        version: Number(existing.version || 1) + 1
      })
    );
    return res.status(201).json({ success: true, recipe });
  } catch (err) {
    return res.status(500).json({ message: "Failed to revise recipe" });
  }
});

router.post("/recipes/:id/clone", auth, async (req, res) => {
  try {
    const existing = await NutrientRecipe.findOne({
      _id: req.params.id,
      userId: userId(req),
      deletedAt: null
    }).lean();
    if (!existing) return res.status(404).json({ message: "Recipe not found" });

    const recipe = await NutrientRecipe.create({
      ...existing,
      _id: undefined,
      userId: userId(req),
      name: String(req.body?.name || `${existing.name} Copy`),
      parentRecipeId: String(existing._id || req.params.id),
      version: 1,
      useCount: 0,
      lastUsedAt: null,
      createdAt: undefined,
      updatedAt: undefined
    });
    return res.status(201).json({ success: true, recipe });
  } catch (err) {
    return res.status(500).json({ message: "Failed to clone recipe" });
  }
});

router.post("/recipes/:id/use", auth, async (req, res) => {
  try {
    const recipe = await NutrientRecipe.findOneAndUpdate(
      { _id: req.params.id, userId: userId(req), deletedAt: null },
      {
        $inc: { useCount: 1 },
        $set: { lastUsedAt: new Date() }
      },
      { new: true }
    ).lean();
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    return res.json({ success: true, recipe });
  } catch (err) {
    return res.status(500).json({ message: "Failed to record recipe use" });
  }
});

module.exports = router;

