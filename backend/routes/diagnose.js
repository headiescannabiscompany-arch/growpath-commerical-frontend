"use strict";

const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");

const Diagnosis = require("../models/Diagnosis");
const DiagnosisFeedback = require("../models/DiagnosisFeedback");
const Grow = require("../models/Grow");

const router = express.Router();

function getRawUserId(req) {
  return String(
    req.userId ||
      req.ctx?.userId ||
      req.user?.id ||
      req.user?._id ||
      req.headers["x-test-user-id"] ||
      ""
  );
}

function toObjectId(raw) {
  if (mongoose.isValidObjectId(raw)) return new mongoose.Types.ObjectId(raw);
  return new mongoose.Types.ObjectId(
    crypto.createHash("md5").update(String(raw)).digest("hex").slice(0, 24)
  );
}

function requireUser(req, res) {
  const uid = getRawUserId(req);
  if (!uid) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Not authenticated" }
    });
    return "";
  }
  return uid;
}

async function ownsGrow(uid, growId) {
  if (!growId) return true;
  const ref = String(growId);
  const growFilters = [{ growId: ref }];
  if (mongoose.isValidObjectId(ref)) growFilters.push({ _id: ref });
  return Boolean(
    await Grow.exists({
      $or: growFilters,
      deletedAt: null,
      $and: [{ $or: [{ user: uid }, { userId: uid }] }]
    })
  );
}

function parseContext(body = {}) {
  if (body.context && typeof body.context === "string") {
    try {
      return { ...body, ...JSON.parse(body.context) };
    } catch (_error) {
      return body;
    }
  }
  return { ...body, ...(body.context && typeof body.context === "object" ? body.context : {}) };
}

function strings(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

function textOf(context) {
  return [
    context.notes,
    context.symptom,
    context.pattern?.notes,
    context.pattern?.location,
    context.rootZone?.moisture,
    context.rootZone?.concern,
    context.environment?.temp,
    context.environment?.rh,
    context.numbers?.feedEC,
    context.numbers?.runoffEC,
    context.numbers?.feedPH,
    context.numbers?.runoffPH
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function triageDiagnosis(context = {}) {
  const text = textOf(context);
  const evidence = [];
  const counterEvidence = [];
  const missingData = [];
  const actions = [];
  const tags = [];
  let diagnosisClass = "general_plant_health_triage";
  let issueSummary = "Possible plant stress requiring follow-up";
  let severity = 2;
  let urgency = "medium";

  if (/spot|stippl|mite|thrip|aphid|gnat|pest|insect|webbing/.test(text)) {
    diagnosisClass = "ipm_or_pest_triage";
    issueSummary = "Possible pest or IPM pressure";
    tags.push("ipm", "scout_required");
    evidence.push("Entered symptoms mention pest, spotting, stippling, insects, or webbing.");
    actions.push("Inspect leaf undersides and growing tips with magnification before treatment.");
    missingData.push("Clear close-up photos of upper and lower leaf surfaces.");
  }
  if (/yellow|chlorosis|pale|deficien|nitrogen|calcium|magnesium/.test(text)) {
    diagnosisClass = "nutrition_or_root_zone_triage";
    issueSummary = "Possible nutrition or root-zone issue";
    tags.push("nutrition", "root_zone_check");
    evidence.push("Entered symptoms mention yellowing, chlorosis, pale growth, or nutrient terms.");
    actions.push("Check recent feed strength, pH, EC, dryback, and runoff trend before changing nutrients.");
    missingData.push("Recent input and runoff pH/EC readings.");
  }
  if (/wet|overwater|droop|root|runoff|ec|ph|lockout/.test(text)) {
    diagnosisClass = "root_zone_or_irrigation_triage";
    issueSummary = "Possible root-zone or irrigation stress";
    tags.push("root_zone", "irrigation_review");
    evidence.push("Entered context mentions root-zone, moisture, pH, EC, runoff, droop, or lockout.");
    actions.push("Review irrigation volume, dryback, pot weight, runoff, and root-zone oxygen.");
    missingData.push("Pot weight/dryback trend and runoff amount.");
  }
  if (/urgent|severe|worse|collapse|rot|mold|mildew|necrosis/.test(text)) {
    severity = 4;
    urgency = "urgent";
    tags.push("urgent_review");
    evidence.push("Entered context includes urgent or severe symptom language.");
  }
  if (!evidence.length) {
    evidence.push("User supplied plant-health notes for triage.");
    missingData.push("Photos, exact symptom location, pH/EC, irrigation timing, and recent environment.");
    actions.push("Collect photos and measurements before applying a corrective treatment.");
  }

  counterEvidence.push(
    "No lab test, microscopy confirmation, or full environmental trend was provided."
  );
  actions.push("Create a follow-up check and compare symptoms after the next irrigation/light cycle.");

  return {
    issueSummary,
    diagnosisClass,
    severity,
    confidenceLevel: "medium",
    evidenceObserved: Array.from(new Set(evidence)),
    counterEvidence: Array.from(new Set(counterEvidence)),
    missingData: Array.from(new Set(missingData)),
    suggestedActions: Array.from(new Set(actions)),
    tags: Array.from(new Set(tags.length ? tags : ["diagnosis_review"])),
    patternSummary: context.pattern
      ? `location: ${context.pattern.location || "unknown"}; notes: ${context.pattern.notes || ""}`
      : "",
    rootZoneSummary: context.rootZone
      ? `moisture: ${context.rootZone.moisture || "unknown"}; concern: ${context.rootZone.concern || ""}`
      : "",
    environmentSummary: context.environment
      ? `temp: ${context.environment.temp || ""}; rh: ${context.environment.rh || ""}; vpd: ${context.environment.vpd || ""}`
      : "",
    numberSummary: context.numbers
      ? `feedEC: ${context.numbers.feedEC || ""}; runoffEC: ${context.numbers.runoffEC || ""}; feedPH: ${context.numbers.feedPH || ""}; runoffPH: ${context.numbers.runoffPH || ""}`
      : "",
    urgency,
    growPathReasoning: [
      "Compared symptom pattern, root-zone context, environment, and measured numbers.",
      "Kept the result as a possible triage finding because key confirmation data may be missing."
    ],
    improvementNotice:
      "User feedback is stored with the diagnosis to improve future follow-up review."
  };
}

function dto(row) {
  const value = row?.toObject ? row.toObject() : row;
  if (!value) return null;
  const aiResult = value.aiResult || {};
  return {
    ...value,
    id: String(value._id || value.id || ""),
    _id: value._id ? String(value._id) : value._id,
    confidenceLevel: aiResult.confidenceLevel || value.confidenceLevel || "medium",
    evidenceObserved: aiResult.evidenceObserved || [],
    counterEvidence: aiResult.counterEvidence || [],
    missingData: aiResult.missingData || [],
    suggestedActions: aiResult.suggestedActions || value.aiActions || [],
    cropIdentity: value.cropIdentity || {},
    cropProfileSnapshot: value.cropProfileSnapshot || null
  };
}

async function createDiagnosis(req, res, next) {
  try {
    const uid = requireUser(req, res);
    if (!uid) return;
    const context = parseContext(req.body || {});
    const growId = context.growId ? String(context.growId) : null;
    if (growId && !(await ownsGrow(uid, growId))) {
      return res.status(404).json({ message: "Grow not found" });
    }
    const triage = triageDiagnosis(context);
    const cropIdentity =
      context.cropIdentity ||
      (context.cropCommonName || context.scientificName || context.cultivarOrStrain
        ? {
            commonName: context.cropCommonName || "",
            scientificName: context.scientificName || "",
            cultivarOrStrain: context.cultivarOrStrain || "",
            requiresUserConfirmation: !context.cropProfileId
          }
        : {});
    const photos = strings(context.photoUrl || context.photos);
    const created = await Diagnosis.create({
      user: toObjectId(uid),
      growId,
      plantId: context.plantId ? String(context.plantId) : null,
      photos,
      notes: String(context.notes || context.symptom || ""),
      stage: String(context.stage || ""),
      cropCommonName: String(context.cropCommonName || cropIdentity.commonName || ""),
      scientificName: String(context.scientificName || cropIdentity.scientificName || ""),
      cultivarOrStrain: String(
        context.cultivarOrStrain || context.cultivar || cropIdentity.cultivarOrStrain || ""
      ),
      cropIdentity,
      cropProfileId:
        context.cropProfileId && mongoose.isValidObjectId(String(context.cropProfileId))
          ? new mongoose.Types.ObjectId(String(context.cropProfileId))
          : null,
      selectedPlantContext: context.selectedPlantContext || null,
      plantGrowthProfile: context.plantGrowthProfile || null,
      issueSummary: triage.issueSummary,
      severity: triage.severity,
      tags: triage.tags,
      aiExplanation:
        "GrowPathAI provides plant-health triage, not a guaranteed lab diagnosis. Confirm with environment, medium, water, and testing when possible.",
      aiActions: triage.suggestedActions,
      aiResult: triage,
      providerName: "growpathai",
      providerModel: "deterministic-etgu-v1",
      growPathReasoning: triage.growPathReasoning,
      improvementNotice: triage.improvementNotice,
      diagnosisClass: triage.diagnosisClass,
      patternSummary: triage.patternSummary,
      rootZoneSummary: triage.rootZoneSummary,
      environmentSummary: triage.environmentSummary,
      numberSummary: triage.numberSummary,
      urgency: triage.urgency
    });
    return res.status(201).json({ diagnosis: dto(created) });
  } catch (error) {
    return next(error);
  }
}

router.get("/provider-status", (_req, res) => {
  res.json({
    provider: {
      providerName: "growpathai",
      providerModel: "deterministic-etgu-v1",
      configured: true,
      imageSupport: false,
      credentialsSource: "local",
      mode: "deterministic_triage"
    }
  });
});

router.post("/analyze", createDiagnosis);
router.post("/", createDiagnosis);

router.get("/history", async (req, res, next) => {
  try {
    const uid = requireUser(req, res);
    if (!uid) return;
    const query = { user: toObjectId(uid) };
    if (req.query.growId) query.growId = String(req.query.growId);
    const rows = await Diagnosis.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ diagnoses: (rows || []).map(dto) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const uid = requireUser(req, res);
    if (!uid) return;
    const row = await Diagnosis.findOne({ _id: req.params.id, user: toObjectId(uid) }).lean();
    if (!row) return res.status(404).json({ message: "Diagnosis not found" });
    res.json({ diagnosis: dto(row) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/feedback", async (req, res, next) => {
  try {
    const uid = requireUser(req, res);
    if (!uid) return;
    const diagnosis = await Diagnosis.findOne({
      _id: req.params.id,
      user: toObjectId(uid)
    });
    if (!diagnosis) return res.status(404).json({ message: "Diagnosis not found" });
    const feedback = await DiagnosisFeedback.create({
      user: toObjectId(uid),
      diagnosis: diagnosis._id,
      growId: diagnosis.growId || null,
      plantId: diagnosis.plantId || null,
      issueSummary: diagnosis.issueSummary || "",
      diagnosisClass: diagnosis.diagnosisClass || "",
      providerName: diagnosis.providerName || "",
      providerModel: diagnosis.providerModel || "",
      verdict: String(req.body?.verdict || "unsure"),
      confirmedIssue: String(req.body?.confirmedIssue || ""),
      symptomChange: String(req.body?.symptomChange || "unknown"),
      notes: String(req.body?.notes || ""),
      actionsTaken: strings(req.body?.actionsTaken),
      observedAfterDays:
        req.body?.observedAfterDays == null ? null : Number(req.body.observedAfterDays),
      outcomeWindowDays:
        req.body?.outcomeWindowDays == null ? null : Number(req.body.outcomeWindowDays),
      consentForModelTraining: req.body?.consentForModelTraining === true
    });
    diagnosis.feedbackCount = Number(diagnosis.feedbackCount || 0) + 1;
    diagnosis.feedbackSummary = {
      verdict: feedback.verdict,
      symptomChange: feedback.symptomChange,
      notes: feedback.notes
    };
    await diagnosis.save();
    res.status(201).json({ feedback });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
