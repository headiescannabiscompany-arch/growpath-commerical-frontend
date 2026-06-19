"use strict";

const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const ToolRun = require("../models/ToolRun");
const Grow = require("../models/Grow");
const GrowLog = require("../models/GrowLog");
const Task = require("../models/Task");
const ProductIngredient = require("../models/ProductIngredient");
const NutrientRecipe = require("../models/NutrientRecipe");
const calculators = require("../services/toolCalculators");
const { CHEMISTRY_PRESETS } = require("../services/nutrientChemistry");

const router = express.Router();

function getRawUserId(req) {
  return String(req.userId || req.ctx?.userId || req.headers["x-test-user-id"] || "");
}

function toObjectId(raw) {
  if (mongoose.isValidObjectId(raw)) return new mongoose.Types.ObjectId(raw);
  return new mongoose.Types.ObjectId(crypto.createHash("md5").update(String(raw)).digest("hex").slice(0, 24));
}

function personalFacilityId(uid) {
  return `personal:${uid}`;
}

async function ownsGrow(uid, growId) {
  if (!growId) return true;
  return Boolean(await Grow.exists({ _id: growId, $or: [{ user: uid }, { userId: uid }] }));
}

async function createRun(req, toolName, input, output) {
  const uid = getRawUserId(req);
  const growId = req.body?.growId ? String(req.body.growId) : null;
  if (growId && !(await ownsGrow(uid, growId))) {
    const error = new Error("Grow not found");
    error.status = 404;
    throw error;
  }
  return ToolRun.create({
    user: toObjectId(uid), growId,
    plantId: req.body?.plantId ? String(req.body.plantId) : null,
    toolName, toolType: toolName, params: input, input, result: output, output,
    summary: `${toolName} completed`,
    recommendations: output?.recommendations || [],
    warnings: output?.warnings || [],
    confidence: output?.confidence || null,
    linkedRecipeId: req.body?.recipeId ? String(req.body.recipeId) : null
  });
}

router.post("/", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    if (!uid) return res.status(401).json({ error: { code: "NOT_AUTHENTICATED" } });
    const toolName = req.body?.toolName || req.body?.toolType || req.body?.name;
    if (!toolName || typeof toolName !== "string") return res.status(400).json({ error: { code: "INVALID_INPUT", message: "toolName is required" } });
    const input = req.body?.params ?? req.body?.input ?? {};
    const output = req.body?.result ?? req.body?.output ?? {};
    const created = await createRun(req, toolName, input, output);
    return res.status(201).json({ created });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    if (!uid) return res.status(401).json({ error: { code: "NOT_AUTHENTICATED" } });
    const query = { user: toObjectId(uid) };
    if (req.query.growId) query.growId = String(req.query.growId);
    const items = await ToolRun.find(query).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ items });
  } catch (error) { return next(error); }
});

router.get("/nutrient-chemistry/presets", (_req, res) => {
  const presets = Object.entries(CHEMISTRY_PRESETS).map(([key, value]) => ({ key, ...value }));
  return res.json({ presets });
});

router.get("/ingredients", async (req, res, next) => {
  try {
    const items = await ProductIngredient.find({ user: toObjectId(getRawUserId(req)) })
      .sort({ favorite: -1, name: 1 })
      .lean();
    return res.json({ items });
  } catch (error) { return next(error); }
});

router.post("/ingredients", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Ingredient name is required" });
    const created = await ProductIngredient.create({
      ...req.body,
      user: toObjectId(getRawUserId(req)),
      name,
      sourceType: req.body?.sourceType || "user_entered",
      confidence: req.body?.confidence || "low"
    });
    return res.status(201).json({ created });
  } catch (error) { return next(error); }
});

router.patch("/ingredients/:id", async (req, res, next) => {
  try {
    const allowed = [
      "name", "brand", "category", "chemistryKey", "labelNPK", "elemental",
      "nutrientForms", "conditions", "bestUseCases", "badUseCases", "warnings",
      "densityGml", "organicOrSynthetic", "sourceType", "confidence", "sourceUrl", "favorite"
    ];
    const patch = {};
    allowed.forEach((key) => { if (req.body?.[key] !== undefined) patch[key] = req.body[key]; });
    const updated = await ProductIngredient.findOneAndUpdate(
      { _id: req.params.id, user: toObjectId(getRawUserId(req)) },
      patch,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Ingredient not found" });
    return res.json({ updated });
  } catch (error) { return next(error); }
});

function recipeInput(body = {}) {
  return {
    batchVolume: body.batchVolume,
    batchUnit: body.batchUnit,
    stage: body.stage,
    medium: body.medium,
    daysUntilHarvest: body.daysUntilHarvest,
    isConcentrate: body.isConcentrate,
    releaseEnvironment: body.releaseEnvironment || {},
    products: body.products || []
  };
}

router.get("/recipes", async (req, res, next) => {
  try {
    const query = { user: toObjectId(getRawUserId(req)), active: true };
    if (req.query.growId) query.growId = String(req.query.growId);
    const items = await NutrientRecipe.find(query).sort({ updatedAt: -1 }).lean();
    return res.json({ items });
  } catch (error) { return next(error); }
});

router.get("/recipes/:id", async (req, res, next) => {
  try {
    const recipe = await NutrientRecipe.findOne({ _id: req.params.id, user: toObjectId(getRawUserId(req)) }).lean();
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    return res.json({ recipe });
  } catch (error) { return next(error); }
});

router.post("/recipes", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Recipe name is required" });
    const growId = req.body?.growId ? String(req.body.growId) : null;
    if (growId && !(await ownsGrow(uid, growId))) return res.status(404).json({ message: "Grow not found" });
    const input = recipeInput(req.body);
    const calculation = calculators.calculateNpkRecipe(input);
    const recipe = new NutrientRecipe({
      user: toObjectId(uid), growId, name,
      description: String(req.body?.description || ""),
      stage: input.stage || "veg", medium: input.medium || "unspecified",
      batchVolume: input.batchVolume, batchUnit: input.batchUnit,
      products: input.products, releaseEnvironment: input.releaseEnvironment,
      calculation, notes: String(req.body?.notes || "")
    });
    await recipe.save();
    return res.status(201).json({ recipe });
  } catch (error) {
    if (/must|greater|maximum|required/i.test(error.message || "")) return res.status(400).json({ message: error.message });
    return next(error);
  }
});

router.post("/recipes/:id/revisions", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    const previous = await NutrientRecipe.findOne({ _id: req.params.id, user: toObjectId(uid), active: true });
    if (!previous) return res.status(404).json({ message: "Recipe not found" });
    const input = recipeInput({ ...previous.toObject(), ...req.body });
    const calculation = calculators.calculateNpkRecipe(input);
    previous.active = false;
    previous.archivedAt = new Date();
    await previous.save();
    const recipe = await NutrientRecipe.create({
      user: previous.user,
      growId: req.body?.growId ?? previous.growId,
      name: String(req.body?.name || previous.name),
      description: String(req.body?.description ?? previous.description),
      version: previous.version + 1,
      rootRecipeId: previous.rootRecipeId || String(previous._id),
      previousVersionId: String(previous._id),
      stage: input.stage || previous.stage,
      medium: input.medium || previous.medium,
      batchVolume: input.batchVolume,
      batchUnit: input.batchUnit,
      products: input.products,
      releaseEnvironment: input.releaseEnvironment,
      calculation,
      notes: String(req.body?.notes ?? previous.notes)
    });
    return res.status(201).json({ recipe, previousVersionId: String(previous._id) });
  } catch (error) { return next(error); }
});

router.post("/recipes/:id/clone", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    const source = await NutrientRecipe.findOne({ _id: req.params.id, user: toObjectId(uid) });
    if (!source) return res.status(404).json({ message: "Recipe not found" });
    const clone = new NutrientRecipe({
      user: source.user, growId: req.body?.growId ?? source.growId,
      name: String(req.body?.name || `${source.name} copy`),
      description: source.description, version: 1,
      clonedFromRecipeId: String(source._id), stage: source.stage, medium: source.medium,
      batchVolume: source.batchVolume, batchUnit: source.batchUnit,
      products: source.products, releaseEnvironment: source.releaseEnvironment,
      calculation: source.calculation, notes: source.notes
    });
    await clone.save();
    return res.status(201).json({ recipe: clone });
  } catch (error) { return next(error); }
});

router.post("/recipes/:id/use", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    const recipe = await NutrientRecipe.findOne({ _id: req.params.id, user: toObjectId(uid) });
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    const input = recipeInput({
      ...recipe.toObject(),
      batchVolume: req.body?.batchVolume ?? recipe.batchVolume,
      batchUnit: req.body?.batchUnit ?? recipe.batchUnit,
      daysUntilHarvest: req.body?.daysUntilHarvest,
      isConcentrate: req.body?.isConcentrate
    });
    const outputs = calculators.calculateNpkRecipe(input);
    req.body = { ...input, growId: req.body?.growId || recipe.growId, recipeId: String(recipe._id) };
    const toolRun = await createRun(req, "npk_recipe", input, outputs);
    let log = null;
    if (req.body.growId && req.body.saveLog !== false) {
      const notes = `Applied recipe: ${recipe.name} v${recipe.version}\nBatch: ${input.batchVolume} ${input.batchUnit}\nElemental ppm: ${JSON.stringify(outputs.totals)}`;
      log = await GrowLog.create({
        facilityId: personalFacilityId(uid), userId: uid, growId: String(req.body.growId),
        title: `Feeding: ${recipe.name}`, note: notes, notes,
        type: "FEEDING", tags: ["feeding", "nutrient-recipe"], linkedToolRunId: String(toolRun._id)
      });
      toolRun.linkedLogId = String(log._id);
      await toolRun.save();
    }
    recipe.lastUsedAt = new Date();
    recipe.useCount += 1;
    await recipe.save();
    return res.status(201).json({ recipe, toolRun, outputs, log });
  } catch (error) { return next(error); }
});

function calculatorRoute(path, toolName, calculator) {
  router.post(path, async (req, res, next) => {
    try {
      const outputs = calculator(req.body || {});
      const toolRun = await createRun(req, toolName, req.body || {}, outputs);
      return res.status(201).json({ toolRun, outputs });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      if (error instanceof TypeError || /must|between|greater|maximum|required|cannot/i.test(error.message || "")) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }
  });
}

calculatorRoute("/vpd", "vpd", calculators.calculateVpd);
calculatorRoute("/ppfd-dli", "ppfd_dli", calculators.calculatePpfdDli);
calculatorRoute("/dew-point-guard", "dew_point_guard", calculators.calculateDewPointGuard);
calculatorRoute("/watering", "watering", calculators.calculateWatering);
calculatorRoute("/bud-rot-risk", "bud_rot_risk", calculators.calculateBudRotRisk);
calculatorRoute("/npk-recipe", "npk_recipe", calculators.calculateNpkRecipe);

router.post("/runs/:id/save-log", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    const run = await ToolRun.findOne({ _id: req.params.id, user: toObjectId(uid) });
    if (!run) return res.status(404).json({ message: "Tool run not found" });
    if (!run.growId) return res.status(400).json({ message: "Tool run is not linked to a grow" });
    if (!(await ownsGrow(uid, run.growId))) return res.status(404).json({ message: "Grow not found" });
    const notes = String(req.body?.notes || `Tool: ${run.toolName}\n\n${JSON.stringify(run.result, null, 2)}`);
    const log = await GrowLog.create({
      facilityId: personalFacilityId(uid), userId: uid, growId: run.growId,
      plantId: run.plantId, title: String(req.body?.title || `Saved ${run.toolName} result`),
      note: notes, notes, tags: [run.toolName, "tool-result"], linkedToolRunId: String(run._id)
    });
    run.linkedLogId = String(log._id);
    await run.save();
    return res.status(201).json({ log, toolRun: run });
  } catch (error) { return next(error); }
});

router.post("/runs/:id/create-task", async (req, res, next) => {
  try {
    const uid = getRawUserId(req);
    const run = await ToolRun.findOne({ _id: req.params.id, user: toObjectId(uid) });
    if (!run) return res.status(404).json({ message: "Tool run not found" });
    if (!run.growId) return res.status(400).json({ message: "Tool run is not linked to a grow" });
    if (!(await ownsGrow(uid, run.growId))) return res.status(404).json({ message: "Grow not found" });
    const task = await Task.create({
      facilityId: personalFacilityId(uid), createdByUserId: uid, assignedToUserId: uid,
      growId: run.growId, plantId: run.plantId,
      title: String(req.body?.title || `Follow up on ${run.toolName}`),
      notes: String(req.body?.description || run.recommendations?.[0] || "Review the saved tool result."),
      priority: req.body?.priority || "medium",
      dueAt: req.body?.dueDate ? new Date(req.body.dueDate) : new Date(Date.now() + 86400000),
      sourceToolRunId: String(run._id)
    });
    run.linkedTaskId = String(task._id);
    await run.save();
    return res.status(201).json({ task, toolRun: run });
  } catch (error) { return next(error); }
});

module.exports = router;
