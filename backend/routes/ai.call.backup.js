"use strict";

/**
 * backend/routes/ai.call.js
 *
 * AI Brain Orchestrator (V1.0.1)
 *
 * Mounted via facility router at:
 *   POST /api/facility/:facilityId/ai/call
 *   POST /api/facilities/:facilityId/ai/call
 *
 * Returns AI envelope (not global error handler):
 *   success: boolean
 *   data: object | null
 *   error: { code, message } | null
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const router = express.Router({ mergeParams: true });

// ---- Envelope helpers (AI contract) ----
function ok(res, data) {
  return res.status(200).json({ success: true, data, error: null });
}

function fail(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message: message || code }
  });
}

// ---- Schema Loading ----
function loadJson(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch (e) {
    throw new Error(`Failed to load schema: ${filepath} (${e.message})`);
  }
}

const SCHEMAS_ROOT = path.resolve(__dirname, "..", "..", "schemas", "schemas");
let AiCallRequestSchema;
try {
  AiCallRequestSchema = loadJson(
    path.join(SCHEMAS_ROOT, "requests", "AiCallRequest.json")
  );
} catch (e) {
  console.warn(
    "[AI.CALL] Schema not yet available; will skip Ajv validation until extracted."
  );
  AiCallRequestSchema = null;
}

// ---- AJV Setup ----
const ajv = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
const validateAiCallRequest = AiCallRequestSchema
  ? ajv.compile(AiCallRequestSchema)
  : null;

// ---- Guardrail Defaults ----
const CONFIDENCE_MIN = 0.6;
const MAX_DELTAS = {
  ecDeltaPerEvent: 0.2,
  rhDeltaPerCycle: 5,
  ppfdDeltaPct: 0.1
};

// ---- Tool Registry (V1.0.1 Brain Spec) ----
// Key format: `${tool}.${fn}` (e.g., "harvest.harvest.analyzeTrichomes")
// See Brain Spec V1 Section 6 for validation-eligible vs deterministic-only split.
const REGISTRY = new Set([
  // HARVEST
  "harvest.harvest.analyzeTrichomes",
  "harvest.harvest.estimateHarvestWindow",
  "harvest.harvest.recommendPartialHarvest",
  "harvest.harvest.updateHarvestPlan",

  // STEERING
  "steering.steering.computeDryback",
  "steering.steering.scoreSteeringBias",
  "steering.steering.recommendNextIrrigation",
  "steering.steering.suggestECAdjustment",

  // LIGHT
  "light.light.computeDLI",
  "light.light.targetDLI",
  "light.light.recommendPPFD",
  "light.light.co2CompatibilityCheck",

  // CLIMATE
  "climate.climate.computeVPD",
  "climate.climate.computeDewPoint",
  "climate.climate.nightSwingRisk",
  "climate.climate.recommendRHShift",

  // RISK
  "risk.risk.computeBudRotRisk",
  "risk.risk.recommendMitigationActions",

  // NUTRIENTS
  "nutrients.nutrients.computeDeliveredNPK",
  "nutrients.nutrients.computeRatio",

  // FERT
  "fert.fert.buildRecipe",
  "fert.fert.scaleRecipe",
  "fert.fert.estimateCost",

  // EC
  "ec.ec.targetEC",
  "ec.ec.computeDrift",
  "ec.ec.recommendCorrection",

  // SOIL
  "soil.soil.buildMix",
  "soil.soil.scaleAmendments",
  "soil.soil.computeCost",

  // TOPDRESS
  "topdress.topdress.recommendTopdress",
  "topdress.topdress.computeTopdressAmounts",

  // DIAGNOSIS
  "diagnosis.diagnosis.analyzeSymptoms",
  "diagnosis.diagnosis.proposeCauses",
  "diagnosis.diagnosis.confirmChecks",
  "diagnosis.diagnosis.recommendAction",

  // PHENO
  "pheno.pheno.scorePheno",
  "pheno.pheno.comparePhenotypes",
  "pheno.pheno.recommendKeeper",

  // RUNS
  "runs.runs.compareRuns",
  "runs.runs.attributeDeltas",

  // CALENDAR
  "calendar.calendar.generateCalendar",
  "calendar.calendar.updateCalendarOnEvent",

  // TASKS
  "tasks.tasks.generateDailyTasks",
  "tasks.tasks.prioritizeTasks"
]);

// ---- Validation-Eligible Functions (Brain Spec V1.6.1) ----
// These MAY call external validators (GPT/Claude/local).
// Deterministic-only functions NEVER call external models (Section 6.2).
function isValidationEligible(fn) {
  return (
    fn === "harvest.analyzeTrichomes" ||
    fn === "diagnosis.analyzeSymptoms" ||
    fn === "risk.recommendMitigationActions" ||
    fn.startsWith("pheno.") ||
    fn === "runs.attributeDeltas"
  );
}

// ---- External Validator (Stub) ----
// Integrate GPT/Claude here. Must NEVER override decisions directly.
// Only returns critique, suggestions, uncertainty flags (max confidence delta ±0.10).
async function externalValidate({ fn, packet }) {
  // TODO: Wire to actual LLM service.
  // For now, always return INSUFFICIENT.
  return {
    outcome: "INSUFFICIENT",
    critique: [],
    suggestions: [],
    confidenceDelta: 0
  };
}

// ---- Writes Tracker ----
function makeWrites() {
  const writes = [];
  return {
    add(type, id) {
      if (!type || !id) return;
      writes.push({ type, id });
    },
    all() {
      return writes;
    }
  };
}

// ---- GrowNote Persistence ----
async function writeGrowNote({ facilityId, growId, body, tags = ["ai"] }) {
  if (!GrowNote || !growId) return null;
  try {
    const note = await GrowNote.create({
      facilityId,
      growId,
      body,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });
    return note;
  } catch (e) {
    console.warn("[AI.CALL] Failed to write GrowNote:", e?.message || e);
    return null;
  }
}

// ---- EventLog Persistence ----
async function writeEventLog({ facilityId, growId, type, payload = {} }) {
  if (!EventLog || !growId) return null;
  try {
    const evt = await EventLog.create({
      facilityId,
      growId,
      type,
      payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });
    return evt;
  } catch (e) {
    console.warn("[AI.CALL] Failed to write EventLog:", e?.message || e);
    return null;
  }
}

// ---- Tool Handlers (V1: Implementation-Ready Stubs) ----
// Each handler:
// - Runs deterministic logic
// - Returns { result, confidence, audit?, requiresConfirmation?, confirmationMessage?, writes? }
//   OR { error: { code, message }, status }
// - Logs are handled at the orchestrator level
// - Models (Task, Alert, TrichomeAnalysis, etc.) are created inside handlers or via handlers.

const HANDLERS = {
  // ---- HARVEST ----
  async "harvest.analyzeTrichomes"(ctx, args, writes) {
    // Validate required inputs
    if (!args.images || !Array.isArray(args.images) || !args.images.length) {
      return {
        error: { code: "MISSING_REQUIRED_INPUTS", message: "images[] required" },
        status: 400
      };
    }

    // TODO: Real analysis
    // - Load images from URLs
    // - Run trichome detection (local model or vision API)
    // - Score ripeness (clear/cloudy/amber ratios)
    // - Return confidence, recommendation, optional external validation

    const trichomeAnalysisId = `ta_${Date.now()}`;
    writes.add("TrichomeAnalysis", trichomeAnalysisId);

    const confidence = 0.75;

    return {
      result: {
        id: trichomeAnalysisId,
        recommendation: "Ready in 5-7 days",
        clarity: 0.3,
        cloudy: 0.6,
        amber: 0.1
      },
      confidence,
      audit: {
        body: `harvest.analyzeTrichomes → ${trichomeAnalysisId} (confidence ${confidence})`,
        tags: ["ai", "harvest", "trichomes"]
      }
    };
  },

  // ---- CLIMATE ----
  async "climate.computeVPD"(ctx, args, writes) {
    // Pure math: deterministic-only (no external call)
    if (typeof args.temp !== "number" || typeof args.rh !== "number") {
      return {
        error: {
          code: "MISSING_REQUIRED_INPUTS",
          message: "temp, rh required (numbers)"
        },
        status: 400
      };
    }

    // Saturation vapor pressure (Magnus formula, Pascal)
    const t = args.temp;
    const rh = args.rh / 100;
    const svp = 610.5 * Math.exp((17.27 * t) / (t + 237.7));
    const avp = svp * rh;
    const vpd = (svp - avp) / 1000; // Convert to kPa

    // Deterministic: always confidence 1.0 (pure math)
    return {
      result: { vpd: Math.round(vpd * 100) / 100 },
      confidence: 1.0,
      audit: {
        body: `climate.computeVPD → VPD ${vpd.toFixed(2)} kPa`,
        tags: ["ai", "climate", "vpd"]
      }
    };
  },

  // ---- EC ----
  async "ec.recommendCorrection"(ctx, args, writes) {
    if (typeof args.currentEC !== "number" || typeof args.targetEC !== "number") {
      return {
        error: {
          code: "MISSING_REQUIRED_INPUTS",
          message: "currentEC, targetEC required"
        },
        status: 400
      };
    }

    const drift = args.currentEC - args.targetEC;
    let deltaEC = 0;

    // Deterministic rule: cap correction to max delta per event
    if (Math.abs(drift) > 0.1) {
      deltaEC = drift > 0 ? -MAX_DELTAS.ecDeltaPerEvent : MAX_DELTAS.ecDeltaPerEvent;
    } else {
      deltaEC = drift;
    }

    // Impact gate: if correction exceeds max delta, request confirmation
    if (Math.abs(deltaEC) > MAX_DELTAS.ecDeltaPerEvent) {
      return {
        result: null,
        error: {
          code: "USER_CONFIRMATION_REQUIRED",
          message: `EC change ${deltaEC.toFixed(2)} exceeds safe delta ${MAX_DELTAS.ecDeltaPerEvent}`
        },
        status: 409
      };
    }

    // Create a task to execute correction
    const taskId = `task_${Date.now()}`;
    writes.add("Task", taskId);

    return {
      result: {
        deltaEC: Math.round(deltaEC * 100) / 100,
        taskId
      },
      confidence: 0.95, // Deterministic + validated logic = high confidence
      audit: {
        body: `ec.recommendCorrection → deltaEC ${deltaEC.toFixed(2)}; Task ${taskId}`,
        tags: ["ai", "ec", "correction"]
      }
    };
  },

  // ---- TASKS ----
  async "tasks.generateDailyTasks"(ctx, args, writes) {
    if (!ctx.growId) {
      return {
        error: { code: "MISSING_REQUIRED_INPUTS", message: "growId required in context" },
        status: 400
      };
    }

    // TODO: Real logic
    // - Query grow current stage, history, last logs
    // - Generate deterministic checklist based on stage
    // - Create Task objects per recommendation

    const task1 = `task_${Date.now()}_1`;
    const task2 = `task_${Date.now()}_2`;

    writes.add("Task", task1);
    writes.add("Task", task2);

    return {
      result: {
        tasks: [
          {
            id: task1,
            title: "Check water level",
            dueDate: args.dueDate || new Date().toISOString()
          },
          {
            id: task2,
            title: "Monitor RH",
            dueDate: args.dueDate || new Date().toISOString()
          }
        ]
      },
      confidence: 0.85,
      audit: {
        body: `tasks.generateDailyTasks → 2 tasks`,
        tags: ["ai", "tasks"]
      }
    };
  }
};

// ---- Validation Helper ----
function validationErrorMessage(errors) {
  return (errors || [])
    .map((e) => `${e.instancePath || "/"} ${e.message}`)
    .slice(0, 8)
    .join("; ");
}

// ---- Main Route Handler ----
router.post("/call", auth, requireFacilityScope, async (req, res, next) => {
  try {
    const facilityId = String(req.params.facilityId || "").trim();
    if (!facilityId) {
      return next(apiError("MISSING_REQUIRED_INPUTS", "facilityId param required", 400));
    }

    const userId = req.user?.id || null;
    const body = req.body || {};

    // ---- Ajv Validation (if schema available) ----
    if (validateAiCallRequest) {
      const okReq = validateAiCallRequest(body);
      if (!okReq) {
        return next(
          apiError(
            "VALIDATION_ERROR",
            validationErrorMessage(validateAiCallRequest.errors),
            400
          )
        );
      }
    } else {
      // Minimal fallback validation if schema not loaded
      if (!body.tool || !body.fn) {
        return next(apiError("VALIDATION_ERROR", "tool, fn required", 400));
      }
    }

    const { tool, fn, args, context } = body;

    // ---- Param-First Scope Check ----
    // Enforce that context.facilityId (if provided) matches :facilityId param
    if (context && context.facilityId && String(context.facilityId) !== facilityId) {
      return next(
        apiError(
          "VALIDATION_ERROR",
          "context.facilityId must match :facilityId param",
          400
        )
      );
    }

    // ---- Registry Enforcement ----
    const registryKey = `${tool}.${fn}`;
    if (!REGISTRY.has(registryKey)) {
      return next(
        apiError("UNSUPPORTED_FUNCTION", `Function not registered: ${registryKey}`, 400)
      );
    }

    // ---- Build Request Context ----
    const ctx = {
      facilityId,
      growId: context?.growId || null,
      runId: context?.runId || null,
      cultivarId: context?.cultivarId || null,
      stage: context?.stage || null,
      goal: context?.goal || null,
      date: context?.date || null,
      userId
    };

    // ---- Optional: Record Trigger Event ----
    try {
      if (ctx.growId) {
        await writeEventLog({
          facilityId,
          growId: ctx.growId,
          type: "MANUAL_AI_RUN",
          payload: { tool, fn, userId }
        });
      }
    } catch (e) {
      // Non-blocking
      console.warn("[AI.CALL] EventLog write failed (non-blocking):", e?.message || e);
    }

    const writes = makeWrites();

    // ---- Dispatch to Handler ----
    const handler = HANDLERS[fn];
    if (!handler) {
      return next(
        apiError("UNSUPPORTED_FUNCTION", `Handler not implemented: ${fn}`, 501)
      );
    }

    let out;
    try {
      out = await handler(ctx, args || {}, writes);
    } catch (e) {
      console.error("[AI.CALL] Handler error:", fn, e?.message || e);
      return next(apiError("INTERNAL_ERROR", e?.message || "Handler failed", 500));
    }

    // ---- Error Path (handler returned error object) ----
    if (out && out.error) {
      const status = out.status || 400;
      return next(apiError(out.error.code, out.error.message, status));
    }

    const confidence = typeof out.confidence === "number" ? out.confidence : 1.0;

    // ---- Quality Gate: Confidence ----
    if (confidence < CONFIDENCE_MIN) {
      return next(
        apiError(
          "CONFIDENCE_TOO_LOW",
          `Confidence ${confidence} below minimum ${CONFIDENCE_MIN}`,
          400
        )
      );
    }

    // ---- Impact Gate: User Confirmation (if handler flagged it) ----
    if (out.requiresConfirmation) {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: "USER_CONFIRMATION_REQUIRED",
          message: out.confirmationMessage || "User confirmation required"
        }
      });
    }

    // ---- Optional External Validation (Stub) ----
    let external = null;
    try {
      const eligible = isValidationEligible(fn);
      const allowExternal = true; // TODO: Gate with facility/user settings
      const inGrayZone = confidence >= 0.6 && confidence <= 0.85;

      if (eligible && allowExternal && inGrayZone) {
        external = await externalValidate({
          fn,
          packet: {
            ctx,
            computedMetrics: out.computedMetrics || null,
            proposal: out.result || null,
            assumptions: out.assumptions || [],
            requestedCritique: ["edge_cases", "alt_hypotheses", "explanation"]
          }
        });

        // Never allow external to override result; only adjust confidence within bounds
        if (external && external.confidenceDelta) {
          const bounded = Math.max(-0.1, Math.min(0.05, external.confidenceDelta));
          // TODO: Log reconciliation outcome
        }
      }
    } catch (e) {
      console.warn(
        "[AI.CALL] External validation failed (non-blocking):",
        e?.message || e
      );
      external = {
        outcome: "INSUFFICIENT",
        critique: [],
        suggestions: [],
        confidenceDelta: 0
      };
    }

    // ---- Persist GrowNote (Audit Snapshot) ----
    try {
      if (ctx.growId && out.audit) {
        const bodyLines = [
          out.audit.body || "",
          external && external.outcome !== "INSUFFICIENT"
            ? `External: ${external.outcome}`
            : ""
        ].filter(Boolean);

        const note = await writeGrowNote({
          facilityId,
          growId: ctx.growId,
          body: bodyLines.join("\n"),
          tags: out.audit.tags || ["ai"]
        });

        if (note && (note.id || note._id)) {
          writes.add("GrowNote", String(note.id || note._id));
        }
      }
    } catch (e) {
      console.warn("[AI.CALL] GrowNote write failed (non-blocking):", e?.message || e);
    }

    // ---- Success Response ----
    return res.status(200).json({
      success: true,
      data: {
        result: out.result || {},
        writes: writes.all(),
        confidence,
        external
      },
      error: null
    });
  } catch (e) {
    console.error("[AI.CALL] Unexpected error:", e?.message || e);
    return next(apiError("INTERNAL_ERROR", "Unexpected server error", 500));
  }
});

module.exports = router;
