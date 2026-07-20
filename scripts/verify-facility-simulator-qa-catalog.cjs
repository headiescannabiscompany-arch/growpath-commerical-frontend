#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "facility-simulator-qa-catalog.json"
);
const allowPlanning = process.argv.includes("--allow-planning");
const requireAcceptance = process.argv.includes("--require-acceptance");

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function sameValues(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function collectValues(value, pointer = "", result = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectValues(item, `${pointer}/${index}`, result));
    return result;
  }
  if (!value || typeof value !== "object") {
    result.push({ path: pointer, value });
    return result;
  }
  for (const [key, child] of Object.entries(value)) {
    collectValues(child, `${pointer}/${key}`, result);
  }
  return result;
}

function uniqueIds(records, key, label, errors) {
  const ids = records.map((record) => record[key]);
  requireCondition(
    ids.every(hasText) && new Set(ids).size === ids.length,
    `${label} ids must be present and unique.`,
    errors
  );
  requireCondition(
    ids.every((id) => id.startsWith("qa-")),
    `${label} ids must remain QA-scoped.`,
    errors
  );
  return new Set(ids);
}

function main() {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const errors = [];
  const blockers = [];
  const postSeedBlockers = [];

  requireCondition(
    fixture.schemaVersion === "growpath-facility-simulator-qa-v1",
    "Unexpected Facility simulator QA schema version.",
    errors
  );
  requireCondition(
    fixture.masterItem === 53,
    "Facility simulator catalog must map to master item 53.",
    errors
  );
  requireCondition(
    fixture.environmentPolicy?.productionAllowed === false &&
      fixture.environmentPolicy?.productionIdentifiersAllowed === false &&
      fixture.environmentPolicy?.qaSeedNamespaceRequired === true &&
      sameValues(fixture.environmentPolicy?.allowed, ["test", "staging"]),
    "Facility simulator must remain QA-namespace-scoped to test/staging.",
    errors
  );
  requireCondition(
    fixture.dataClassification?.classification === "synthetic_test_only" &&
      fixture.dataClassification?.observedProductionData === false &&
      fixture.dataClassification?.maySupportProductClaims === false &&
      fixture.dataClassification?.mayBePublished === false,
    "Facility simulation data must remain synthetic, non-production, and unpublished.",
    errors
  );
  requireCondition(
    fixture.seedInputApproval?.status === "approved" &&
      fixture.seedInputApproval?.scope ===
        "private synthetic QA fixtures for test and staging only" &&
      Array.isArray(fixture.seedInputApproval?.excludes) &&
      fixture.seedInputApproval.excludes.includes("production records or identifiers") &&
      fixture.seedInputApproval.excludes.includes("operational cultivation setpoints") &&
      fixture.seedInputApproval.excludes.includes(
        "external media or source-rights approval"
      ),
    "Synthetic seed approval must explicitly exclude production, operational, and source-rights use.",
    errors
  );
  requireCondition(
    fixture.acceptanceLifecycle?.seedReadinessRequiresScenarioRuns === false &&
      fixture.acceptanceLifecycle?.seedReadinessRequiresBrowserEvidence === false &&
      fixture.acceptanceLifecycle?.postSeedAcceptanceRequiresScenarioRuns === true &&
      fixture.acceptanceLifecycle?.postSeedAcceptanceRequiresBrowserEvidence === true &&
      fixture.acceptanceLifecycle?.evidenceMayBeRecordedBeforeExecution === false,
    "Facility seed readiness and post-seed acceptance must remain separate lifecycle phases.",
    errors
  );

  const facility = fixture.facilityTemplate || {};
  requireCondition(
    facility.facilityId === "qa-facility-simulator-primary" &&
      facility.qaSeedNamespace === "growpath-qa-facility-simulator" &&
      facility.synthetic === true &&
      facility.publicVisibility === false,
    "Facility identity or synthetic/public scope is invalid.",
    errors
  );
  requireCondition(
    facility.accountPurpose === "cannabis_hemp_facility_qa" &&
      facility.cannabisVisibilityEligible === true,
    "Cannabis-specific facility examples require explicit eligible account purpose.",
    errors
  );
  requireCondition(
    facility.cultivar === undefined &&
      facility.licenseNumber === null &&
      facility.metrcLicenseNumber === null,
    "The synthetic fixture must not invent cultivar or regulatory identifiers.",
    errors
  );
  if (!facility.ownerApproved) {
    blockers.push("Facility template lacks owner approval.");
  }
  requireCondition(
    ["planned", "seeded_verified"].includes(facility.seedRecordStatus),
    `Facility seedRecordStatus is invalid (${facility.seedRecordStatus}).`,
    errors
  );

  const rolePolicy = fixture.rolePolicy || {};
  requireCondition(
    sameValues(rolePolicy.canonicalRoles, ["OWNER", "MANAGER", "STAFF", "VIEWER"]),
    "Facility simulator must use canonical OWNER/MANAGER/STAFF/VIEWER roles.",
    errors
  );
  requireCondition(
    rolePolicy.legacyOrPersonaNamesMayBecomeRoles === false &&
      sameValues(rolePolicy.mappingConfirmationRoles, ["OWNER", "MANAGER"]),
    "Persona aliases must not become roles and mappings must remain owner/manager gated.",
    errors
  );
  const personas = rolePolicy.personaAssignments || [];
  requireCondition(
    personas.length === 5,
    "Expected exactly five Facility personas.",
    errors
  );
  requireCondition(
    sameValues(
      personas.map((persona) => `${persona.persona}:${persona.role}`),
      [
        "owner:OWNER",
        "manager:MANAGER",
        "grower:STAFF",
        "scout:STAFF",
        "restricted_employee:VIEWER"
      ]
    ),
    "Facility persona-to-role assignments changed unexpectedly.",
    errors
  );
  const personaIds = uniqueIds(personas, "personaId", "Persona", errors);
  for (const persona of personas) {
    if (!["seed_on_execution", "bound_verified"].includes(persona.accountBindingStatus)) {
      blockers.push(
        `Persona ${persona.personaId} is not ready for seed-time binding (${persona.accountBindingStatus}).`
      );
    }
  }

  const expectedWritePolicy = {
    OWNER: [
      "team",
      "tasks",
      "grows",
      "plants",
      "grow_logs",
      "inventory",
      "compliance",
      "sop_runs",
      "facility_settings"
    ],
    MANAGER: [
      "tasks",
      "grows",
      "plants",
      "grow_logs",
      "inventory",
      "compliance",
      "sop_runs"
    ],
    STAFF: ["tasks", "grow_logs"],
    VIEWER: []
  };
  const expectedDeniedWritePolicy = {
    OWNER: [],
    MANAGER: ["team", "facility_settings"],
    STAFF: [
      "team",
      "grows",
      "plants",
      "inventory",
      "compliance",
      "sop_runs",
      "facility_settings"
    ],
    VIEWER: [
      "team",
      "tasks",
      "grows",
      "plants",
      "grow_logs",
      "inventory",
      "compliance",
      "sop_runs",
      "facility_settings"
    ]
  };
  for (const role of rolePolicy.canonicalRoles || []) {
    requireCondition(
      sameValues(
        rolePolicy.permissionExpectations?.[role]?.allowedWriteDomains,
        expectedWritePolicy[role]
      ),
      `Role ${role} write policy does not match the canonical app policy.`,
      errors
    );
    requireCondition(
      sameValues(
        rolePolicy.permissionExpectations?.[role]?.deniedWriteDomains,
        expectedDeniedWritePolicy[role]
      ),
      `Role ${role} denied-write policy does not match the canonical app policy.`,
      errors
    );
  }

  const integration = fixture.integrationPolicy || {};
  for (const key of [
    "readOnlyByDefault",
    "credentialsMustBeEncrypted",
    "providerMetricKeyMustBePreserved",
    "unknownMetricsRemainUnmapped",
    "roomMappingsRequireReview",
    "autoBuildRequiresSeparateConfirmation",
    "autoBuildMustBeIdempotent",
    "generatedAlertsAndDashboardsStartAsDrafts"
  ]) {
    requireCondition(
      integration[key] === true,
      `integrationPolicy.${key} must be true.`,
      errors
    );
  }
  requireCondition(
    integration.plaintextCredentialsAllowed === false &&
      integration.unitsMayBeInvented === false &&
      integration.controllerWritesAllowed === false &&
      sameValues(integration.mappingConfirmationRoles, ["OWNER", "MANAGER"]),
    "Integration safety or mapping policy is invalid.",
    errors
  );

  const graph = fixture.recordGraph || {};
  requireCondition(
    graph.facilityId === facility.facilityId,
    "Record graph must reference the Facility template.",
    errors
  );
  const zones = graph.zones || [];
  const rooms = graph.rooms || [];
  const grows = graph.grows || [];
  const plants = graph.plants || [];
  const equipment = graph.equipment || [];
  const inventory = graph.inventory || [];
  const sops = graph.sops || [];
  const tasks = graph.tasks || [];

  requireCondition(zones.length === 5, "Expected five Facility zones.", errors);
  requireCondition(rooms.length === 10, "Expected ten Facility rooms.", errors);
  requireCondition(grows.length === 5, "Expected five Facility grows.", errors);
  requireCondition(plants.length === 12, "Expected twelve Facility plants.", errors);
  requireCondition(equipment.length === 8, "Expected eight equipment records.", errors);
  requireCondition(inventory.length === 6, "Expected six inventory records.", errors);
  requireCondition(sops.length === 6, "Expected six SOP records.", errors);
  requireCondition(tasks.length === 10, "Expected ten recurring/incident tasks.", errors);

  const zoneIds = uniqueIds(zones, "zoneId", "Zone", errors);
  const roomIds = uniqueIds(rooms, "roomId", "Room", errors);
  const growIds = uniqueIds(grows, "growId", "Grow", errors);
  uniqueIds(plants, "plantId", "Plant", errors);
  uniqueIds(equipment, "equipmentId", "Equipment", errors);
  uniqueIds(inventory, "inventoryId", "Inventory", errors);
  const sopIds = uniqueIds(sops, "sopId", "SOP", errors);
  uniqueIds(tasks, "taskId", "Task", errors);

  requireCondition(
    sameValues(
      rooms.map((room) => room.purpose),
      [
        "mother",
        "clone_propagation",
        "seedling",
        "vegetative",
        "flower",
        "dry",
        "cure",
        "tissue_culture",
        "cold_storage",
        "general_storage"
      ]
    ),
    "Facility room-purpose coverage is incomplete.",
    errors
  );
  for (const room of rooms) {
    requireCondition(
      zoneIds.has(room.zoneId) && hasText(room.roomType) && hasText(room.trackingMode),
      `Room ${room.roomId} has invalid zone, room type, or tracking mode.`,
      errors
    );
    if (
      room.baselineStatus !== "reviewed_configured" ||
      !room.baselines ||
      !Object.keys(room.baselines).length
    ) {
      blockers.push(`Room ${room.roomId} baselines are not reviewed/configured.`);
    }
    requireCondition(
      room.baselinePurpose === "synthetic boundary-testing only; not operational advice",
      `Room ${room.roomId} must disclose its synthetic non-operational baseline purpose.`,
      errors
    );
    requireCondition(
      ["planned", "seeded_verified"].includes(room.seedRecordStatus),
      `Room ${room.roomId} has invalid seedRecordStatus.`,
      errors
    );
  }

  for (const grow of grows) {
    requireCondition(
      roomIds.has(grow.roomId) &&
        grow.synthetic === true &&
        grow.cropName === "Cannabis or hemp QA crop" &&
        grow.cultivar === null,
      `Grow ${grow.growId} has invalid room, synthetic scope, crop, or cultivar evidence.`,
      errors
    );
    requireCondition(
      ["planned", "seeded_verified"].includes(grow.seedRecordStatus),
      `Grow ${grow.growId} has invalid seedRecordStatus.`,
      errors
    );
  }
  for (const plant of plants) {
    requireCondition(
      growIds.has(plant.growId) &&
        roomIds.has(plant.roomId) &&
        plant.synthetic === true &&
        plant.cultivar === null,
      `Plant ${plant.plantId} has invalid grow/room scope or invented cultivar.`,
      errors
    );
    const grow = grows.find((candidate) => candidate.growId === plant.growId);
    requireCondition(
      grow?.roomId === plant.roomId,
      `Plant ${plant.plantId} room does not match its grow room.`,
      errors
    );
    requireCondition(
      ["planned", "seeded_verified"].includes(plant.seedRecordStatus),
      `Plant ${plant.plantId} has invalid seedRecordStatus.`,
      errors
    );
  }
  for (const item of equipment) {
    requireCondition(
      roomIds.has(item.roomId) && item.synthetic === true && item.readOnly === true,
      `Equipment ${item.equipmentId} must be synthetic, room-scoped, and read-only.`,
      errors
    );
    if (
      !hasText(item.connectionStatus) ||
      !["synthetic_test_adapter_ready", "verified_test_adapter"].includes(
        item.connectionStatus
      )
    ) {
      blockers.push(
        `Equipment ${item.equipmentId} lacks a seed-ready synthetic test adapter (${item.connectionStatus}).`
      );
    }
    requireCondition(
      ["planned", "seeded_verified"].includes(item.seedRecordStatus),
      `Equipment ${item.equipmentId} has invalid seedRecordStatus.`,
      errors
    );
  }
  for (const item of inventory) {
    requireCondition(
      item.synthetic === true &&
        Number(item.baselineQuantity) >= 0 &&
        Number(item.reorderPoint) >= 0 &&
        hasText(item.unit),
      `Inventory ${item.inventoryId} needs synthetic quantities, reorder point, and unit.`,
      errors
    );
    requireCondition(
      ["planned", "seeded_verified"].includes(item.seedRecordStatus),
      `Inventory ${item.inventoryId} has invalid seedRecordStatus.`,
      errors
    );
  }
  for (const sop of sops) {
    requireCondition(
      (sop.status === "draft" && sop.ownerApproved === false) ||
        (["approved", "active"].includes(sop.status) && sop.ownerApproved === true),
      `SOP ${sop.sopId} has an invalid status/owner-approval combination.`,
      errors
    );
    if (!sop.ownerApproved) {
      blockers.push(`SOP ${sop.sopId} lacks owner approval.`);
    }
    if (!Array.isArray(sop.checklist) || sop.checklist.length === 0) {
      blockers.push(`SOP ${sop.sopId} lacks executable synthetic QA steps.`);
    }
    requireCondition(
      ["planned", "seeded_verified"].includes(sop.seedRecordStatus),
      `SOP ${sop.sopId} has invalid seedRecordStatus.`,
      errors
    );
  }
  for (const task of tasks) {
    requireCondition(
      roomIds.has(task.roomId) &&
        (task.sopId === null || sopIds.has(task.sopId)) &&
        personaIds.has(task.assignedPersonaId) &&
        hasText(task.schedule) &&
        typeof task.verificationRequired === "boolean",
      `Task ${task.taskId} has invalid room, SOP, assignee, schedule, or verification rule.`,
      errors
    );
    requireCondition(
      ["planned", "seeded_verified"].includes(task.seedRecordStatus),
      `Task ${task.taskId} has invalid seedRecordStatus.`,
      errors
    );
  }

  const telemetry = fixture.telemetryContract || {};
  requireCondition(
    Number.isInteger(telemetry.targetMinimumTelemetryPoints) &&
      telemetry.targetMinimumTelemetryPoints >= 240,
    "Facility simulator needs at least 240 telemetry points.",
    errors
  );
  const expectedMetrics = {
    air_temperature: "C",
    relative_humidity: "percent",
    vpd: "kPa",
    dew_point: "C",
    co2: "ppm",
    ppfd: "umol/m2/s",
    dli: "mol/m2/day",
    substrate_moisture: "percent",
    substrate_ec: "mS/cm",
    substrate_ph: "pH",
    irrigation_event: "event",
    light_state: "state",
    alarm: "event",
    device_offline: "event",
    device_fault: "event"
  };
  const metrics = telemetry.canonicalMetrics || [];
  requireCondition(
    sameValues(
      Object.fromEntries(metrics.map((metric) => [metric.metric, metric.unit])),
      expectedMetrics
    ),
    "Canonical Facility metric names or units changed unexpectedly.",
    errors
  );
  const allowedConsumers = new Set([
    "display",
    "analytics",
    "ai",
    "search",
    "recommendations",
    "tasks",
    "alerts",
    "exports"
  ]);
  requireCondition(
    metrics.every(
      (metric) =>
        Array.isArray(metric.consumers) &&
        metric.consumers.length > 0 &&
        metric.consumers.every((consumer) => allowedConsumers.has(consumer))
    ),
    "Every canonical metric needs supported data-use consumers.",
    errors
  );

  const scenarioDefinitions = fixture.scenarioDefinitions || [];
  const scenarioIds = scenarioDefinitions.map((scenario) => scenario.scenarioId);
  const expectedScenarios = [
    "normal_operations",
    "two_hour_humidity_spike_after_lights_off",
    "dew_point_condensation_risk",
    "sensor_offline_and_stale_data",
    "high_substrate_ec",
    "irrigation_failure",
    "unexpected_high_co2",
    "light_or_exhaust_failure",
    "room_excursion_acknowledgement_and_escalation",
    "pest_found_and_plant_quarantined",
    "inventory_shortage",
    "missed_task_and_overdue_sop",
    "conflicting_permissions",
    "csv_api_duplicates_gaps_bad_timestamps_bad_units"
  ];
  requireCondition(
    sameValues(scenarioIds, expectedScenarios) &&
      new Set(scenarioIds).size === scenarioIds.length,
    "Facility normal/incident scenario coverage is incomplete.",
    errors
  );
  for (const scenario of scenarioDefinitions) {
    requireCondition(
      ["normal", "incident"].includes(scenario.category) &&
        scenario.targetRoomIds.every((roomId) => roomIds.has(roomId)) &&
        hasText(scenario.syntheticPattern) &&
        Array.isArray(scenario.requiredDetections) &&
        scenario.requiredDetections.length > 0 &&
        Array.isArray(scenario.expectedWriteBacks) &&
        scenario.expectedWriteBacks.length > 0,
      `Scenario ${scenario.scenarioId} lacks scope, pattern, detections, or write-backs.`,
      errors
    );
  }

  const requiredPointFields = telemetry.requiredPointFields || [];
  const telemetryRecords = telemetry.telemetryRecords || [];
  const telemetryIds = new Set();
  const telemetryTimestamps = new Set();
  const scenarioMetrics = new Map();
  for (const [index, point] of telemetryRecords.entries()) {
    const label = point.telemetryId || `index ${index}`;
    for (const field of requiredPointFields) {
      requireCondition(
        Object.prototype.hasOwnProperty.call(point, field),
        `Telemetry point ${label} is missing ${field}.`,
        errors
      );
    }
    requireCondition(
      hasText(point.telemetryId) && !telemetryIds.has(point.telemetryId),
      `Telemetry id ${label} is missing or duplicated.`,
      errors
    );
    telemetryIds.add(point.telemetryId);
    const recordedAt = String(point.recordedAt || "");
    requireCondition(
      scenarioIds.includes(point.scenarioId) &&
        point.facilityId === facility.facilityId &&
        roomIds.has(point.roomId) &&
        point.synthetic === true,
      `Telemetry point ${label} has invalid scenario/facility/room/synthetic scope.`,
      errors
    );
    requireCondition(
      hasText(point.deviceId) &&
        hasText(point.providerMetricKey) &&
        Object.prototype.hasOwnProperty.call(expectedMetrics, point.canonicalMetric) &&
        point.normalizedUnit === expectedMetrics[point.canonicalMetric] &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(recordedAt) &&
        !Number.isNaN(Date.parse(recordedAt)),
      `Telemetry point ${label} lacks device/provider identity, canonical unit, or valid timestamp.`,
      errors
    );
    requireCondition(
      !telemetryTimestamps.has(recordedAt),
      `Telemetry timestamp ${recordedAt || "<missing>"} is duplicated.`,
      errors
    );
    telemetryTimestamps.add(recordedAt);
    if (!scenarioMetrics.has(point.scenarioId)) {
      scenarioMetrics.set(point.scenarioId, new Set());
    }
    scenarioMetrics.get(point.scenarioId).add(point.canonicalMetric);
  }
  if (telemetryRecords.length < telemetry.targetMinimumTelemetryPoints) {
    blockers.push(
      `Telemetry has ${telemetryRecords.length}/${telemetry.targetMinimumTelemetryPoints} required synthetic points.`
    );
  }
  for (const scenarioId of scenarioIds) {
    requireCondition(
      scenarioMetrics.get(scenarioId)?.size === metrics.length,
      `Scenario ${scenarioId} must include all ${metrics.length} governed metrics.`,
      errors
    );
  }

  const scenarioRuns = fixture.scenarioRuns || [];
  const runScenarioIds = new Set();
  for (const [index, run] of scenarioRuns.entries()) {
    const label = run.runId || `index ${index}`;
    requireCondition(
      hasText(run.runId) &&
        scenarioIds.includes(run.scenarioId) &&
        !runScenarioIds.has(run.scenarioId) &&
        run.facilityId === facility.facilityId &&
        run.synthetic === true,
      `Scenario run ${label} has invalid id, scenario, Facility, or synthetic scope.`,
      errors
    );
    runScenarioIds.add(run.scenarioId);
    if (
      run.status !== "verified" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(run.executedAt || "") ||
      !hasText(run.evidenceRef)
    ) {
      postSeedBlockers.push(
        `Scenario ${run.scenarioId} lacks verified timestamped run evidence.`
      );
    }
  }
  for (const scenarioId of scenarioIds) {
    if (!runScenarioIds.has(scenarioId)) {
      postSeedBlockers.push(`Scenario ${scenarioId} has no verified run evidence.`);
    }
  }

  const writeBack = fixture.writeBackContract || {};
  requireCondition(
    writeBack.facilityScopeRequired === true &&
      writeBack.userConfirmationRequired === true &&
      writeBack.crossFacilityWritesAllowed === false &&
      writeBack.alertsAndTasksStartAsDrafts === true &&
      writeBack.budRotScreeningMayBePresentedAsDiagnosis === false &&
      sameValues(writeBack.targets, [
        "Plant",
        "Grow",
        "Log",
        "ToolRun",
        "Task",
        "room",
        "Facility"
      ]),
    "Facility write-back contract is incomplete or unsafe.",
    errors
  );

  const acceptanceChecks = fixture.acceptanceChecks || [];
  const requiredAcceptance = [
    "entitlement_loading",
    "ai_credit_charge_and_refund",
    "facility_owner_access",
    "manager_mapping_confirmation",
    "staff_task_and_log_write_limits",
    "viewer_read_only_access",
    "task_assignment",
    "rights_reviewed_uploads",
    "ask_ai_provider_and_fallback_labels",
    "alerts_and_acknowledgements",
    "persistence_and_reload",
    "tool_write_back_scope",
    "cross_role_shared_record"
  ];
  requireCondition(
    sameValues(acceptanceChecks, requiredAcceptance),
    "Facility acceptance coverage is incomplete.",
    errors
  );
  const acceptanceEvidence = fixture.acceptanceEvidence || [];
  const evidenceChecks = new Set();
  for (const [index, evidence] of acceptanceEvidence.entries()) {
    const label = evidence.evidenceId || `index ${index}`;
    requireCondition(
      hasText(evidence.evidenceId) &&
        acceptanceChecks.includes(evidence.checkId) &&
        !evidenceChecks.has(evidence.checkId) &&
        evidence.facilityId === facility.facilityId,
      `Acceptance evidence ${label} has invalid id, check, Facility, or duplicate coverage.`,
      errors
    );
    evidenceChecks.add(evidence.checkId);
    if (
      evidence.status !== "verified" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(evidence.testedAt || "") ||
      !hasText(evidence.evidenceRef)
    ) {
      postSeedBlockers.push(
        `Acceptance check ${evidence.checkId} lacks verified timestamped evidence.`
      );
    }
  }
  for (const checkId of acceptanceChecks) {
    if (!evidenceChecks.has(checkId)) {
      postSeedBlockers.push(`Acceptance check ${checkId} has no evidence.`);
    }
  }

  const secretPatterns = [
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{12,}/,
    /\bBearer\s+[A-Za-z0-9._-]{12,}/i,
    /mongodb(?:\+srv)?:\/\/[^\s:@]+:[^\s@]+@/i,
    /\b(?:password|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"']{8,}/i
  ];
  const exposedSecrets = collectValues(fixture).filter(
    (item) =>
      typeof item.value === "string" &&
      secretPatterns.some((pattern) => pattern.test(item.value))
  );
  requireCondition(
    exposedSecrets.length === 0,
    `Fixture appears to contain plaintext credentials at ${exposedSecrets
      .map((item) => item.path)
      .join(", ")}.`,
    errors
  );

  if (fixture.status !== "seed_ready") {
    blockers.unshift(`Catalog is not seed_ready (${fixture.status}).`);
  }

  const summary = {
    fixture: path.relative(ROOT, fixturePath),
    mode: allowPlanning
      ? "planning"
      : requireAcceptance
        ? "acceptance"
        : "seed-readiness",
    status: fixture.status,
    personaCount: personas.length,
    zoneCount: zones.length,
    roomCount: rooms.length,
    growCount: grows.length,
    plantCount: plants.length,
    equipmentCount: equipment.length,
    inventoryCount: inventory.length,
    sopCount: sops.length,
    taskCount: tasks.length,
    canonicalMetricCount: metrics.length,
    telemetryPointCount: telemetryRecords.length,
    scenarioDefinitionCount: scenarioDefinitions.length,
    scenarioRunCount: scenarioRuns.length,
    acceptanceEvidenceCount: acceptanceEvidence.length,
    errorCount: errors.length,
    seedBlockerCount: blockers.length,
    postSeedBlockerCount: postSeedBlockers.length,
    blockerCount: blockers.length + postSeedBlockers.length
  };
  console.log(JSON.stringify(summary, null, 2));

  if (errors.length) {
    console.error("Facility simulator QA catalog errors:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }
  if (!allowPlanning && blockers.length) {
    console.error("Facility simulator QA catalog is not seed-ready:");
    blockers.slice(0, 35).forEach((blocker) => console.error(`- ${blocker}`));
    if (blockers.length > 35) {
      console.error(`- ... ${blockers.length - 35} more blockers`);
    }
    process.exit(1);
  }
  if (!allowPlanning && requireAcceptance && postSeedBlockers.length) {
    console.error("Facility simulator QA acceptance is incomplete:");
    postSeedBlockers.slice(0, 35).forEach((blocker) => console.error(`- ${blocker}`));
    if (postSeedBlockers.length > 35) {
      console.error(`- ... ${postSeedBlockers.length - 35} more blockers`);
    }
    process.exit(1);
  }
  if (allowPlanning && blockers.length) {
    console.log(
      `Planning seed blockers retained: ${blockers.length}. Seed-readiness stays blocked until its governed inputs are complete.`
    );
  }
  if (postSeedBlockers.length) {
    console.log(
      `Post-seed acceptance blockers retained: ${postSeedBlockers.length}. Run with --require-acceptance after staging execution and browser review.`
    );
  }
}

main();
