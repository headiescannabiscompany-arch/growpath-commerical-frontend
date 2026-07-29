"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");

const Diagnosis = require("../models/Diagnosis");
const Grow = require("../models/Grow");
const GrowLog = require("../models/GrowLog");
const GrowpathModuleRecord = require("../models/GrowpathModuleRecord");
const Task = require("../models/Task");
const TelemetryPoint = require("../models/TelemetryPoint");
const TelemetrySource = require("../models/TelemetrySource");
const ToolRun = require("../models/ToolRun");

const SCOPES = new Set([
  "whole_run",
  "vegetative",
  "flowering_fruiting",
  "harvest_final",
  "post_harvest"
]);
const OBJECTIVES = new Set([
  "balanced_review",
  "yield",
  "final_quality",
  "issue_reduction",
  "task_execution",
  "cycle_time"
]);

function badRequest(message, code = "INVALID_COMPARISON") {
  const error = new Error(message);
  error.status = 400;
  error.code = code;
  return error;
}

function clean(value) {
  return String(value || "").trim();
}

function finite(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getPath(source, path) {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

function recordDate(record) {
  const value = record?.date || record?.ts || record?.updatedAt || record?.createdAt;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function recordId(record) {
  return clean(record?._id || record?.id);
}

function recordToolName(record) {
  return clean(record?.toolName || record?.toolType || record?.recordType).toLowerCase();
}

function recordStage(record) {
  return [
    record?.stage,
    record?.sourceStage,
    record?.inputs?.stage,
    record?.input?.stage,
    record?.params?.stage,
    record?.outputs?.stage,
    record?.output?.stage,
    record?.result?.stage,
    record?.payload?.stage,
    ...(Array.isArray(record?.tags) ? record.tags : [])
  ]
    .map(clean)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesScope(record, scope) {
  if (scope === "whole_run") return true;
  const stage = recordStage(record);
  const tool = recordToolName(record);
  if (scope === "vegetative") {
    return /(seedling|vegetative|\bveg\b|clone|rooting|propagation)/.test(stage);
  }
  if (scope === "flowering_fruiting") {
    return /(flower|bloom|fruit|reproductive|ripen)/.test(stage);
  }
  if (scope === "harvest_final") {
    return (
      /(harvest|final|smoke|quality|yield)/.test(stage) ||
      /(harvest_readiness|harvest-readiness|harvest_batch)/.test(tool)
    );
  }
  if (scope === "post_harvest") {
    return (
      /(dry|cure|post.?harvest|storage)/.test(stage) || /(dry_cure|dry-cure)/.test(tool)
    );
  }
  return false;
}

function firstRecordedNumber(records, definitions, scope) {
  const ordered = [...records].sort(
    (left, right) =>
      (recordDate(right)?.getTime() || 0) - (recordDate(left)?.getTime() || 0)
  );
  for (const record of ordered) {
    if (!matchesScope(record, scope)) continue;
    for (const definition of definitions) {
      const value = finite(getPath(record, definition.path));
      if (value == null) continue;
      const unit = definition.unitPath
        ? clean(getPath(record, definition.unitPath)) || definition.defaultUnit || null
        : definition.defaultUnit || null;
      return {
        value,
        unit,
        field: definition.path,
        sourceId: recordId(record),
        sourceType: recordToolName(record) || definition.sourceType || "saved_record",
        recordedAt: recordDate(record)?.toISOString() || null
      };
    }
  }
  return null;
}

function firstRecordedDate(records, paths) {
  const ordered = [...records].sort(
    (left, right) =>
      (recordDate(right)?.getTime() || 0) - (recordDate(left)?.getTime() || 0)
  );
  for (const record of ordered) {
    for (const path of paths) {
      const value = getPath(record, path);
      const date = value ? new Date(value) : null;
      if (date && !Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function average(values) {
  const numbers = values.map(finite).filter((value) => value != null);
  if (!numbers.length) return null;
  return Number(
    (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(3)
  );
}

function growRefs(grow, requestedId) {
  return [
    ...new Set([requestedId, clean(grow?._id), clean(grow?.growId)].filter(Boolean))
  ];
}

function withinRefs(record, refs) {
  return refs.includes(clean(record?.growId));
}

function evidenceCount(records, scope) {
  return records.filter((record) => matchesScope(record, scope)).length;
}

function taskSummary(tasks, scope) {
  const scoped = tasks.filter((task) => matchesScope(task, scope));
  const completed = scoped.filter(
    (task) => clean(task.status).toUpperCase() === "DONE" || Boolean(task.completedAt)
  ).length;
  return {
    total: scoped.length,
    completed,
    completionRate: scoped.length
      ? Number(((completed / scoped.length) * 100).toFixed(1))
      : null
  };
}

function latestDate(records) {
  const dates = records
    .map(recordDate)
    .filter(Boolean)
    .sort((left, right) => right - left);
  return dates[0]?.toISOString() || null;
}

function buildSnapshot({
  grow,
  requestedId,
  scope,
  logs,
  tasks,
  toolRuns,
  diagnoses,
  moduleRecords,
  telemetryPoints
}) {
  const refs = growRefs(grow, requestedId);
  const growLogs = logs.filter((row) => withinRefs(row, refs));
  const growTasks = tasks.filter((row) => withinRefs(row, refs));
  const growToolRuns = toolRuns.filter((row) => withinRefs(row, refs));
  const growDiagnoses = diagnoses.filter((row) => withinRefs(row, refs));
  const growModules = moduleRecords.filter((row) => withinRefs(row, refs));
  const growTelemetry = telemetryPoints.filter((row) => refs.includes(clean(row.growId)));
  const taskEvidence = taskSummary(growTasks, scope);
  const scopedDiagnoses = growDiagnoses.filter((row) => matchesScope(row, scope));
  const historyRecords = [...growToolRuns, ...growModules];

  const yieldRecord = firstRecordedNumber(
    historyRecords,
    [
      { path: "outputs.actualYield", unitPath: "outputs.yieldUnit" },
      { path: "outputs.dryYield", unitPath: "outputs.yieldUnit" },
      { path: "outputs.totalYield", unitPath: "outputs.yieldUnit" },
      { path: "outputs.yieldAmount", unitPath: "outputs.yieldUnit" },
      { path: "payload.actualYield", unitPath: "payload.yieldUnit" },
      { path: "inputs.actualYield", unitPath: "inputs.yieldUnit" }
    ],
    scope === "whole_run" ? "harvest_final" : scope
  );
  const qualityRecord = firstRecordedNumber(
    historyRecords,
    [
      { path: "outputs.finalQualityScore", unitPath: "outputs.qualityScale" },
      { path: "outputs.qualityScore", unitPath: "outputs.qualityScale" },
      { path: "outputs.smokeScore", unitPath: "outputs.qualityScale" },
      { path: "payload.finalQualityScore", unitPath: "payload.qualityScale" }
    ],
    scope === "whole_run" ? "harvest_final" : scope
  );
  const dryDaysRecord = firstRecordedNumber(
    historyRecords.filter((row) => /(dry_cure|dry-cure)/.test(recordToolName(row))),
    [
      { path: "outputs.dryDays", defaultUnit: "days" },
      { path: "outputs.daysInStage", defaultUnit: "days" },
      { path: "inputs.dryDays", defaultUnit: "days" },
      { path: "inputs.daysInStage", defaultUnit: "days" }
    ],
    "whole_run"
  );
  const dliFromTools = firstRecordedNumber(
    growToolRuns.filter((row) => /(ppfd_dli|ppfd-dli)/.test(recordToolName(row))),
    [
      { path: "outputs.dli", defaultUnit: "mol/m2/day" },
      { path: "result.dli", defaultUnit: "mol/m2/day" }
    ],
    scope
  );
  const scopedTelemetry =
    scope === "whole_run"
      ? growTelemetry
      : growTelemetry.filter((point) => matchesScope(point, scope));
  const measuredTelemetry = scopedTelemetry.filter((point) => point.synthetic !== true);
  const vpdValues = measuredTelemetry.map(
    (point) =>
      point.vpdKpa ?? (point.canonicalMetric === "vpd" ? point.normalizedValue : null)
  );
  const dliValues = measuredTelemetry
    .filter((point) => point.canonicalMetric === "dli")
    .map((point) => point.normalizedValue);
  const averageVpd = average(vpdValues);
  const averageDli = average(dliValues) ?? dliFromTools?.value ?? null;
  const startDate = grow?.startDate ? new Date(grow.startDate) : null;
  const explicitEndDate = firstRecordedDate(historyRecords, [
    "outputs.harvestDate",
    "outputs.completedAt",
    "outputs.endDate",
    "payload.harvestDate",
    "inputs.harvestDate"
  ]);
  const cycleDays =
    startDate &&
    explicitEndDate &&
    !Number.isNaN(startDate.getTime()) &&
    explicitEndDate >= startDate
      ? Math.round((explicitEndDate.getTime() - startDate.getTime()) / 86400000)
      : null;

  const inventory = {
    logs: evidenceCount(growLogs, scope),
    tasks: taskEvidence.total,
    toolRuns: evidenceCount(growToolRuns, scope),
    diagnoses: scopedDiagnoses.length,
    moduleRecords: evidenceCount(growModules, scope),
    telemetryPoints: measuredTelemetry.length,
    excludedSyntheticTelemetryPoints: scopedTelemetry.length - measuredTelemetry.length
  };
  const missingFields = [];
  if (!yieldRecord || !yieldRecord.unit) missingFields.push("recorded yield with unit");
  if (!qualityRecord || !qualityRecord.unit)
    missingFields.push("recorded final-quality score and scale");
  if (!inventory.logs) missingFields.push(`logs in ${scope.replaceAll("_", " ")} scope`);
  if (!inventory.tasks)
    missingFields.push(`tasks in ${scope.replaceAll("_", " ")} scope`);
  if (!inventory.telemetryPoints && averageDli == null)
    missingFields.push("stage-linked environment or light evidence");
  if (!dryDaysRecord) missingFields.push("recorded dry/cure duration");
  if (cycleDays == null) missingFields.push("explicit run completion or harvest date");

  return {
    id: requestedId,
    growId: requestedId,
    name: clean(grow?.name) || requestedId,
    crop: clean(grow?.cropCommonName || grow?.scientificName) || null,
    cultivar: clean(grow?.cultivar || grow?.strain) || null,
    recordedStage: clean(grow?.stage) || null,
    startDate:
      startDate && !Number.isNaN(startDate.getTime()) ? startDate.toISOString() : null,
    scope,
    evidenceInventory: inventory,
    latestEvidenceAt: latestDate([
      ...growLogs,
      ...growTasks,
      ...growToolRuns,
      ...growDiagnoses,
      ...growModules,
      ...scopedTelemetry
    ]),
    yieldAmount: yieldRecord?.unit ? yieldRecord.value : null,
    yieldUnit: yieldRecord?.unit || null,
    yieldEvidence: yieldRecord,
    qualityScore: qualityRecord?.unit ? qualityRecord.value : null,
    qualityScale: qualityRecord?.unit || null,
    qualityEvidence: qualityRecord,
    issueCount: scopedDiagnoses.length || null,
    maxDiagnosisSeverity: scopedDiagnoses.length
      ? Math.max(...scopedDiagnoses.map((row) => finite(row.severity) || 0))
      : null,
    taskCompletionRate: taskEvidence.completionRate,
    completedTaskCount: taskEvidence.completed,
    taskCount: taskEvidence.total,
    averageVpd,
    averageDli,
    environmentEvidenceCount: inventory.telemetryPoints + (dliFromTools ? 1 : 0),
    dryDays: dryDaysRecord?.value ?? null,
    dryDaysEvidence: dryDaysRecord,
    cycleDays,
    missingFields
  };
}

async function buildRunComparisonHistory({
  userId,
  growIds,
  referenceGrowId,
  scope = "whole_run",
  objective = "balanced_review",
  title = "",
  notes = ""
}) {
  const uid = clean(userId);
  const ids = [
    ...new Set((Array.isArray(growIds) ? growIds : []).map(clean).filter(Boolean))
  ];
  if (!uid) {
    const error = badRequest("Authentication is required.", "NOT_AUTHENTICATED");
    error.status = 401;
    throw error;
  }
  if (ids.length < 2)
    throw badRequest("Select at least two saved grows.", "GROWS_REQUIRED");
  if (ids.length > 5)
    throw badRequest("Compare no more than five grows at once.", "TOO_MANY_GROWS");
  const normalizedScope = SCOPES.has(clean(scope)) ? clean(scope) : "whole_run";
  const normalizedObjective = OBJECTIVES.has(clean(objective))
    ? clean(objective)
    : "balanced_review";
  const referenceId = ids.includes(clean(referenceGrowId))
    ? clean(referenceGrowId)
    : ids[0];
  const objectIds = ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const idFilters = [{ growId: { $in: ids } }];
  if (objectIds.length) idFilters.push({ _id: { $in: objectIds } });
  const grows = await Grow.find({
    $and: [
      { $or: [{ user: uid }, { userId: uid }] },
      { $or: idFilters },
      { deletedAt: null }
    ]
  }).lean();
  const orderedGrows = ids.map((id) =>
    grows.find((grow) => clean(grow._id) === id || clean(grow.growId) === id)
  );
  if (orderedGrows.some((grow) => !grow)) {
    const error = new Error("One or more selected grows were not found in this account.");
    error.status = 404;
    error.code = "GROW_NOT_FOUND";
    throw error;
  }
  const aliases = orderedGrows.flatMap((grow, index) => growRefs(grow, ids[index]));
  const userObjectId = mongoose.isValidObjectId(uid)
    ? new mongoose.Types.ObjectId(uid)
    : new mongoose.Types.ObjectId(
        crypto.createHash("md5").update(uid).digest("hex").slice(0, 24)
      );
  const [logs, tasks, toolRuns, diagnoses, moduleRecords, telemetrySources] =
    await Promise.all([
      GrowLog.find({ userId: uid, growId: { $in: aliases }, deletedAt: null }).lean(),
      Task.find({
        facilityId: `personal:${uid}`,
        growId: { $in: aliases },
        deletedAt: null
      }).lean(),
      ToolRun.find({ user: userObjectId, growId: { $in: aliases } }).lean(),
      Diagnosis.find({ user: userObjectId, growId: { $in: aliases } }).lean(),
      GrowpathModuleRecord.find({ user: userObjectId, growId: { $in: aliases } }).lean(),
      TelemetrySource.find({
        ownerUserId: uid,
        growId: { $in: aliases },
        deletedAt: null
      }).lean()
    ]);
  const sourceGrow = new Map(
    telemetrySources.map((source) => [clean(source._id), clean(source.growId)])
  );
  const telemetryPoints = telemetrySources.length
    ? (
        await TelemetryPoint.find({
          sourceId: { $in: telemetrySources.map((source) => source._id) }
        }).lean()
      ).map((point) => ({
        ...point,
        growId: sourceGrow.get(clean(point.sourceId)) || null
      }))
    : [];
  const snapshots = orderedGrows.map((grow, index) =>
    buildSnapshot({
      grow,
      requestedId: ids[index],
      scope: normalizedScope,
      logs,
      tasks,
      toolRuns,
      diagnoses,
      moduleRecords,
      telemetryPoints
    })
  );

  return {
    growId: referenceId,
    growIds: ids,
    referenceGrowId: referenceId,
    scope: normalizedScope,
    objective: normalizedObjective,
    comparisonTitle:
      clean(title) || `Run comparison: ${snapshots.map((run) => run.name).join(" vs ")}`,
    ownerNotes: clean(notes),
    evidenceSource: "owned_saved_grow_history",
    runs: snapshots
  };
}

module.exports = { buildRunComparisonHistory, matchesScope };
