"use strict";

/**
 * backend/routes/ai.call.js
 *
 * AI Brain Orchestrator - Production Version (V1.0.1)
 *
 * POST /api/facility/:facilityId/ai/call
 *
 * Returns AI envelope:
 *   { success, data, error: { code, message } }
 *
 * Implements:
 * - Registry enforcement (20 canonical functions)
 * - Two-gate guardrails (quality + impact)
 * - Writes tracking (persisted objects)
 * - External validator stub (ready for GPT/Claude)
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

const TrichomeAnalysis = require("../models/TrichomeAnalysis");
const HarvestDecision = require("../models/HarvestDecision");
const CalendarEvent = require("../models/CalendarEvent");
const { computeEcCorrection } = require("../utils/ecCorrection");

const router = express.Router({ mergeParams: true });

// ---- Envelope Helpers (AI Contract) ----
// AI envelope is ONLY { success, data, error }
const ok = (res, data) => res.status(200).json({ success: true, data, error: null });

const fail = (res, code, message, statusCode = 400) =>
  res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message: message || code }
  });

// ---- Registry (20 Canonical Functions) ----
const REGISTRY = {
  harvest: [
    "analyzeTrichomes",
    "predictYield",
    "estimateReadiness",
    "estimateHarvestWindow"
  ],
  steering: ["suggestNutrients", "recommendPHAdjust", "balanceMacros"],
  light: ["optimizeDLI", "suggestPhotoperiod", "checkCanoopyHeight"],
  climate: ["computeVPD", "recommendVent", "suggestHeater"],
  risk: ["assessPowderyMildew", "assessBacterialBlur", "assessRootRot"],
  nutrients: ["interpretLeafSymptoms", "suggestMicroBalance", "checkNutrientLock"],
  fertility: ["recommendTopDress", "suggestFertSchedule", "checkSoilBuild"],
  ec: ["recommendCorrection", "computeTargetEC", "suggestFertilizer"],
  soil: ["assessStructure", "suggestAmendment", "testCEC"],
  topdress: ["suggestTopDress", "computeRatio"],
  diagnosis: ["analyzeImage", "interpretSymptoms"],
  pheno: ["suggestPhenoSwitch", "predictFlowerWeeks"],
  runs: ["suggestCycleTime", "assessLineage"],
  calendar: ["suggestNextWaterDate", "suggestNextFeedDate"],
  tasks: ["generateGrowTasks"]
};

// ---- Schema Loading (Graceful Fallback) ----
function loadSchema(name) {
  const SCHEMAS_ROOT = path.join(__dirname, "..", "..", "schemas", "schemas");
  const schemaPath = path.join(SCHEMAS_ROOT, "requests", `${name}.json`);
  try {
    if (fs.existsSync(schemaPath)) {
      return JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    }
  } catch (e) {
    console.warn(`[SCHEMA] Could not load ${name}: ${e.message}`);
  }
  return null; // Graceful fallback
}

// ---- Serialization Helpers (Mongo → AI Contract) ----
function toIso(d) {
  return d ? new Date(d).toISOString() : null;
}

function serializeTrichomeAnalysis(doc) {
  return {
    id: String(doc._id),
    facilityId: doc.facilityId,
    growId: doc.growId,
    images: doc.images || [],
    zones: doc.zones || [],
    distribution: doc.distribution,
    confidence: doc.confidence,
    notes: doc.notes || "",
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: toIso(doc.deletedAt)
  };
}
function serializeHarvestDecision(doc) {
  return {
    id: String(doc._id),
    facilityId: doc.facilityId,
    growId: doc.growId,
    window: {
      min: toIso(doc.window.min),
      ideal: toIso(doc.window.ideal),
      max: toIso(doc.window.max)
    },
    recommendation: doc.recommendation,
    partialHarvest: doc.partialHarvest,
    confidence: doc.confidence,
    trichomeAnalysisId: doc.trichomeAnalysisId,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: toIso(doc.deletedAt)
  };
}

function serializeCalendarEvent(doc) {
  return {
    id: String(doc._id),
    facilityId: doc.facilityId,
    growId: doc.growId,
    type: doc.type,
    title: doc.title,
    date: toIso(doc.date),
    metadata: doc.metadata || {},
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    deletedAt: toIso(doc.deletedAt)
  };
}

// ---- Production Handlers ----

/**
 * climate.computeVPD
 * Deterministic, pure math. Confidence = 1.0
 */
function handleClimateComputeVPD(args, ctx) {
  const { temp, rh } = args;
  if (temp === undefined || rh === undefined) {
    return { error: "MISSING_REQUIRED_INPUTS", status: 400 };
  }
  if (typeof temp !== "number" || typeof rh !== "number") {
    return { error: "INVALID_ARGS", status: 400 };
  }

  // Saturation vapor pressure (Magnus formula)
  const es = 6.112 * Math.exp((17.67 * temp) / (temp + 243.5));
  const e = (rh / 100) * es;
  const vpd = es - e;
  const vpd_bounded = Math.max(0, Math.min(5, vpd));

  return {
    data: {
      id: `vpd_${Date.now()}`,
      tool: "climate",
      fn: "computeVPD",
      input: { temp, rh },
      result: { vpd: vpd_bounded },
      confidence: 1.0,
      confidence_reason: "Deterministic math (Magnus formula)",
      writes: []
    }
  };
}

/**
 * ec.recommendCorrection
 * Deterministic with impact gate (max delta = 0.2)
 */
function handleECRecommendCorrection(args, ctx) {
  const {
    currentEC,
    targetEC,
    reservoirVolumeL,
    ecPerMlPerL,
    ecPerGramPerL,
    tolerance,
    timeContext
  } = args;
  if (currentEC === undefined || targetEC === undefined) {
    return { error: "MISSING_REQUIRED_INPUTS", status: 400 };
  }

  const delta = Math.abs(targetEC - currentEC);

  // Impact gate: delta > 0.2 requires confirmation
  if (delta > 0.2) {
    return {
      error: "USER_CONFIRMATION_REQUIRED",
      message: `EC adjustment of ${delta.toFixed(2)} exceeds safe delta (0.2)`,
      status: 409
    };
  }

  const deltaEC = targetEC - currentEC;
  const correction = computeEcCorrection({
    currentEC,
    targetEC,
    reservoirVolumeL,
    ecPerMlPerL,
    ecPerGramPerL,
    tolerance
  });

  const note =
    correction.action === "dilute"
      ? "Dilute reservoir to target EC"
      : correction.action === "increase"
        ? "Increase EC to target"
        : "No EC change needed";

  const task = {
    id: `task_${Date.now()}`,
    type: "Task",
    description: `Adjust EC from ${currentEC} to ${targetEC} (delta: ${deltaEC.toFixed(2)})`,
    priority: "high",
    confidence: 0.9
  };

  return {
    data: {
      id: `ecfix_${Date.now()}`,
      tool: "ec",
      fn: "recommendCorrection",
      input: {
        currentEC,
        targetEC,
        reservoirVolumeL,
        ecPerMlPerL,
        ecPerGramPerL,
        tolerance
      },
      result: { deltaEC, delta, ...correction },
      confidence: 0.9,
      recommendation: note,
      timeContext: timeContext || null,
      writes: [task]
    }
  };
}

/**
 * harvest.analyzeTrichomes
 * STEP A: Real persistence + writes tracking
 * TODO: Replace mock CV with real image analysis
 */
async function handleHarvestAnalyzeTrichomes(args, ctx) {
  const { images = [], zones = [], notes = "" } = args;

  if (!images || images.length === 0) {
    return { error: "MISSING_REQUIRED_INPUTS", status: 400 };
  }
  if (!ctx.growId) {
    return {
      error: "MISSING_REQUIRED_INPUTS",
      message: "context.growId required",
      status: 400
    };
  }

  // TODO: real CV analysis - for now, mock distribution
  const distribution = { clear: 0.25, cloudy: 0.65, amber: 0.1 };
  const confidence = 0.75;

  // Persist to MongoDB
  const doc = await TrichomeAnalysis.create({
    facilityId: ctx.facilityId,
    growId: ctx.growId,
    images,
    zones,
    distribution,
    confidence,
    notes
  });

  const result = serializeTrichomeAnalysis(doc);

  return {
    data: {
      tool: "harvest",
      fn: "analyzeTrichomes",
      input: { images, zones, notes },
      result,
      confidence,
      confidence_reason: "Mock CV (replace with real image analysis)",
      writes: [{ type: "TrichomeAnalysis", id: String(doc._id) }]
    }
  };
}

/**
 * harvest.estimateHarvestWindow
 * Calculates harvest window based on trichome distribution + grow stage
 * Returns HarvestDecision with min/ideal/max dates
 */
async function handleHarvestEstimateWindow(args, ctx) {
  const { facilityId, growId } = ctx;
  const { daysSinceFlip, goal = "balanced", distribution, trichomeAnalysisId } = args;

  // Validate required inputs
  if (!growId) {
    return { error: "MISSING_REQUIRED_INPUTS", message: "growId required", status: 400 };
  }
  if (daysSinceFlip === undefined) {
    return {
      error: "MISSING_REQUIRED_INPUTS",
      message: "daysSinceFlip required",
      status: 400
    };
  }
  if (!distribution || typeof distribution !== "object") {
    return {
      error: "MISSING_REQUIRED_INPUTS",
      message: "distribution required (object with clear/cloudy/amber)",
      status: 400
    };
  }

  const { clear = 0, cloudy = 0, amber = 0 } = distribution;

  // Mock harvest window logic (replace with real cultivar/goal-specific algorithm)
  let daysToWait = 0;
  let confidence = 0.8;
  let recommendation = "READY_NOW";
  let partialHarvest = false;

  // Simple heuristic: goal influences wait time based on trichome state
  if (goal === "yield") {
    // Maximize bulk: wait until 70%+ cloudy
    if (cloudy < 0.7) {
      daysToWait = Math.ceil((0.7 - cloudy) * 10); // ~1% cloudy per day
      recommendation = `WAIT_${daysToWait}_DAYS`;
    }
  } else if (goal === "potency") {
    // Maximize THC: harvest at 10-20% amber
    if (amber < 0.1) {
      daysToWait = Math.ceil((0.15 - amber) * 14); // ~1% amber per 1.4 days
      recommendation = `WAIT_${daysToWait}_DAYS`;
    } else if (amber > 0.25) {
      recommendation = "HARVEST_IMMEDIATELY";
      confidence = 0.95;
    }
  } else {
    // balanced: 60%+ cloudy, 5-15% amber
    if (cloudy < 0.6 || amber < 0.05) {
      daysToWait = Math.max(
        Math.ceil((0.6 - cloudy) * 10),
        Math.ceil((0.08 - amber) * 14)
      );
      recommendation = `WAIT_${daysToWait}_DAYS`;
    } else if (amber > 0.2) {
      recommendation = "HARVEST_SOON";
      daysToWait = 2;
    }
  }

  // Check for partial harvest opportunity (top colas amber, lowers still cloudy)
  if (amber > 0.15 && clear > 0.2) {
    partialHarvest = true;
    recommendation = "PARTIAL_HARVEST_RECOMMENDED";
  }

  // Calculate window dates
  const now = new Date();
  const minDate = new Date(now.getTime() + daysToWait * 86400000);
  const idealDate = new Date(now.getTime() + (daysToWait + 2) * 86400000);
  const maxDate = new Date(now.getTime() + (daysToWait + 5) * 86400000);

  // Persist HarvestDecision
  const decisionDoc = await HarvestDecision.create({
    facilityId,
    growId,
    window: {
      min: minDate,
      ideal: idealDate,
      max: maxDate
    },
    recommendation,
    partialHarvest,
    confidence,
    trichomeAnalysisId: trichomeAnalysisId || null
  });

  // Step C: Persist CalendarEvents for the window (min/ideal/max)
  const baseMeta = {
    source: "ai",
    tool: "harvest",
    fn: "estimateHarvestWindow",
    harvestDecisionId: String(decisionDoc._id),
    daysSinceFlip,
    goal,
    distribution
  };

  const eventsToCreate = [
    {
      facilityId,
      growId,
      type: "HARVEST_WINDOW",
      title: "Harvest Window (Earliest)",
      date: minDate,
      metadata: { ...baseMeta, windowKey: "min" },
      deletedAt: null
    },
    {
      facilityId,
      growId,
      type: "HARVEST_WINDOW",
      title: "Harvest Window (Ideal)",
      date: idealDate,
      metadata: { ...baseMeta, windowKey: "ideal" },
      deletedAt: null
    },
    {
      facilityId,
      growId,
      type: "HARVEST_WINDOW",
      title: "Harvest Window (Latest)",
      date: maxDate,
      metadata: { ...baseMeta, windowKey: "max" },
      deletedAt: null
    }
  ];

  // Calendar spam guard: soft-delete old HARVEST_WINDOW events for this grow
  await CalendarEvent.updateMany(
    { facilityId, growId, type: "HARVEST_WINDOW", deletedAt: null },
    { deletedAt: new Date() }
  );

  const createdEvents = await CalendarEvent.insertMany(eventsToCreate, { ordered: true });

  const result = serializeHarvestDecision(decisionDoc);

  return {
    data: {
      tool: "harvest",
      fn: "estimateHarvestWindow",
      input: { daysSinceFlip, goal, distribution, trichomeAnalysisId },
      result,
      confidence,
      confidence_reason: "Mock harvest window (replace with cultivar-specific model)",
      writes: [
        { type: "HarvestDecision", id: String(decisionDoc._id) },
        ...createdEvents.map((d) => ({ type: "CalendarEvent", id: String(d._id) }))
      ]
    }
  };
}

// ---- Router Handler ----
router.post("/call", async (req, res) => {
  try {
    let { tool, fn, args = {}, context = {} } = req.body;

    // Validate request shape
    if (!tool || !fn) {
      return fail(res, "VALIDATION_ERROR", "Missing tool or fn");
    }

    // args must be an object if provided
    if (args != null && (typeof args !== "object" || Array.isArray(args))) {
      return fail(res, "BAD_REQUEST", "args must be an object");
    }

    // Handle fn in "tool.function" format
    if (fn.includes(".")) {
      const parts = fn.split(".");
      if (parts[0] !== tool) {
        return fail(res, "VALIDATION_ERROR", "Tool mismatch in fn");
      }
      fn = parts[1]; // Extract just the function name
    }

    // Verify function is registered
    if (!REGISTRY[tool] || !REGISTRY[tool].includes(fn)) {
      return fail(res, "UNSUPPORTED_FUNCTION", `${tool}.${fn} not registered`, 400);
    }

    // Merge context (req.ctx from facility middleware)
    const ctx = { ...req.ctx, ...context };
    const facilityId = req.params.facilityId;

    if (!facilityId) {
      return fail(res, "VALIDATION_ERROR", "facilityId required in URL path");
    }

    // If context specifies a facilityId, it must match the URL param
    if (context.facilityId && context.facilityId !== facilityId) {
      return fail(
        res,
        "VALIDATION_ERROR",
        "Context facilityId does not match URL parameter"
      );
    }

    ctx.facilityId = facilityId;

    // Dispatch to handler
    let result;
    if (tool === "climate" && fn === "computeVPD") {
      result = handleClimateComputeVPD(args, ctx);
    } else if (tool === "ec" && fn === "recommendCorrection") {
      result = handleECRecommendCorrection(args, ctx);
    } else if (tool === "harvest" && fn === "analyzeTrichomes") {
      result = await handleHarvestAnalyzeTrichomes(args, ctx);
    } else if (tool === "harvest" && fn === "estimateHarvestWindow") {
      result = await handleHarvestEstimateWindow(args, ctx);
    } else {
      // Stub for unimplemented functions
      return fail(res, "NOT_IMPLEMENTED", `${tool}.${fn} not yet implemented`, 501);
    }

    // Check for errors from handler
    if (result.error) {
      return fail(res, result.error, result.message, result.status);
    }

    // Success: Return envelope (writes are inside data)
    return ok(res, result.data);
  } catch (err) {
    const errorId = `ai_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    console.error("[AI_CALL_INTERNAL_ERROR]", {
      errorId,
      tool,
      fn,
      growId: context?.growId ?? null,
      facilityId:
        req.params?.facilityId ??
        req.ctx?.facilityId ??
        req.headers["x-test-facility-id"] ??
        null,
      userId:
        req.user?.id ??
        req.user?._id ??
        req.ctx?.userId ??
        req.headers["x-test-user-id"] ??
        null,
      argsType: typeof args,
      hasArgs: !!args,
      errMessage: err?.message
        ? err.message
        : typeof err === "string"
          ? err
          : "Unknown error",
      stack: err?.stack
    });
    return fail(res, "INTERNAL_ERROR", "AI handler failed", 500);
  }
});

module.exports = router;
