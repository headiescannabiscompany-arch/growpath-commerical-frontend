#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const ROOT = path.resolve(__dirname, "..");
const fixturePath = path.join(
  ROOT,
  "tests",
  "fixtures",
  "facility-simulator-qa-catalog.json"
);

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

fixture.status = "seed_ready";
fixture.seedInputApproval = {
  status: "approved",
  approvedAt: "2026-07-20",
  scope: "private synthetic QA fixtures for test and staging only",
  basis: "owner direction to execute master item 55",
  excludes: [
    "production records or identifiers",
    "publication or product claims",
    "operational cultivation setpoints",
    "external media or source-rights approval",
    "Living Soil Labs formulas, labels, prices, or product approval"
  ]
};
fixture.acceptanceLifecycle = {
  seedReadinessRequiresScenarioRuns: false,
  seedReadinessRequiresBrowserEvidence: false,
  postSeedAcceptanceRequiresScenarioRuns: true,
  postSeedAcceptanceRequiresBrowserEvidence: true,
  evidenceMayBeRecordedBeforeExecution: false
};

Object.assign(fixture.facilityTemplate, {
  status: "approved_for_synthetic_qa",
  ownerApproved: true
});

for (const persona of fixture.rolePolicy.personaAssignments) {
  persona.accountBindingStatus = "seed_on_execution";
}

const baselineProfiles = {
  mother: {
    temperature: { min: 20, max: 30, unit: "C" },
    humidity: { min: 40, max: 80, unit: "%" },
    vpd: { target: 1, unit: "kPa" }
  },
  clone_propagation: {
    temperature: { min: 20, max: 30, unit: "C" },
    humidity: { min: 50, max: 90, unit: "%" },
    vpd: { target: 0.8, unit: "kPa" }
  },
  seedling: {
    temperature: { min: 20, max: 30, unit: "C" },
    humidity: { min: 45, max: 85, unit: "%" },
    vpd: { target: 0.9, unit: "kPa" }
  },
  vegetative: {
    temperature: { min: 18, max: 32, unit: "C" },
    humidity: { min: 35, max: 80, unit: "%" },
    vpd: { target: 1.1, unit: "kPa" }
  },
  flower: {
    temperature: { min: 18, max: 30, unit: "C" },
    humidity: { min: 30, max: 70, unit: "%" },
    vpd: { target: 1.2, unit: "kPa" },
    co2: { target: 800, unit: "ppm" },
    ppfd: { target: 500, unit: "umol/m2/s" },
    ph: { min: 5, max: 7 },
    ec: { min: 0.5, max: 3, unit: "mS/cm" }
  },
  dry: {
    temperature: { min: 10, max: 28, unit: "C" },
    humidity: { min: 35, max: 75, unit: "%" },
    vpd: { target: 0.8, unit: "kPa" }
  },
  cure: {
    temperature: { min: 10, max: 28, unit: "C" },
    humidity: { min: 40, max: 75, unit: "%" },
    vpd: { target: 0.7, unit: "kPa" }
  },
  tissue_culture: {
    temperature: { min: 15, max: 30, unit: "C" },
    humidity: { min: 30, max: 80, unit: "%" }
  },
  cold_storage: {
    temperature: { min: 0, max: 12, unit: "C" },
    humidity: { min: 20, max: 80, unit: "%" }
  },
  general_storage: {
    temperature: { min: 5, max: 35, unit: "C" },
    humidity: { min: 15, max: 85, unit: "%" }
  }
};

for (const room of fixture.recordGraph.rooms) {
  room.baselineStatus = "reviewed_configured";
  room.baselinePurpose = "synthetic boundary-testing only; not operational advice";
  room.baselines = baselineProfiles[room.purpose];
}

for (const item of fixture.recordGraph.equipment) {
  item.connectionStatus = "synthetic_test_adapter_ready";
}

const sopContent = {
  "qa-sop-room-sanitation": {
    requiredInputs: ["selected QA room", "assigned QA user"],
    checklist: [
      "Confirm the selected room is a synthetic QA record.",
      "Record the checklist start time and assigned QA user.",
      "Inspect the configured test surfaces without adding chemical instructions.",
      "Record completion, exceptions, and any follow-up task."
    ]
  },
  "qa-sop-ipm-scouting": {
    requiredInputs: ["selected QA room", "QA plant labels", "scout observation"],
    checklist: [
      "Confirm Facility, room, and QA plant scope.",
      "Inspect the labeled QA plants and record observed signs only.",
      "Attach only rights-reviewed QA media when available.",
      "Keep the result as an observation until a user confirms it.",
      "Escalate uncertainty or urgent evidence without naming a pesticide product or rate."
    ]
  },
  "qa-sop-irrigation-response": {
    requiredInputs: ["selected QA room", "expected event", "latest telemetry age"],
    checklist: [
      "Confirm the expected synthetic irrigation event is missing.",
      "Check telemetry freshness before interpreting moisture evidence.",
      "Request manual equipment verification without issuing controller commands.",
      "Record the result and create a manager-visible follow-up when unresolved."
    ]
  },
  "qa-sop-sensor-offline": {
    requiredInputs: ["selected QA device", "last reading time", "connection status"],
    checklist: [
      "Confirm the selected device and last valid reading time.",
      "Mark the affected interval as missing or stale; do not fabricate replacement values.",
      "Record the synthetic adapter health result.",
      "Create a review task without changing controller settings."
    ]
  },
  "qa-sop-room-excursion": {
    requiredInputs: ["selected QA room", "metric", "recorded value", "recorded unit"],
    checklist: [
      "Confirm the metric, unit, timestamp, and synthetic room baseline.",
      "Check device health and evidence freshness.",
      "Acknowledge the draft alert with actor and timestamp.",
      "Escalate through the QA role chain when the configured interval is exceeded.",
      "Do not change automation or controller setpoints."
    ]
  },
  "qa-sop-plant-quarantine": {
    requiredInputs: ["selected QA plant", "user-confirmed observation", "approval actor"],
    checklist: [
      "Confirm the observation is user-reviewed and not an automatic diagnosis.",
      "Confirm the exact synthetic plant, grow, room, and Facility scope.",
      "Apply the QA quarantine state only after Owner or Manager confirmation.",
      "Record the audit event and create a follow-up scouting task."
    ]
  }
};

for (const sop of fixture.recordGraph.sops) {
  sop.status = "approved";
  sop.ownerApproved = true;
  Object.assign(sop, sopContent[sop.sopId]);
}

const metrics = fixture.telemetryContract.canonicalMetrics.map((metric) => metric.metric);
const metricUnits = Object.fromEntries(
  fixture.telemetryContract.canonicalMetrics.map((metric) => [metric.metric, metric.unit])
);
const defaultValues = {
  air_temperature: 24,
  relative_humidity: 58,
  vpd: 1.1,
  dew_point: 15,
  co2: 850,
  ppfd: 500,
  dli: 30,
  substrate_moisture: 45,
  substrate_ec: 1.8,
  substrate_ph: 6.2,
  irrigation_event: "recorded",
  light_state: "on",
  alarm: "clear",
  device_offline: "online",
  device_fault: "clear"
};
const scenarioOverrides = {
  two_hour_humidity_spike_after_lights_off: {
    relative_humidity: 82,
    light_state: "off",
    alarm: "humidity_excursion"
  },
  dew_point_condensation_risk: {
    air_temperature: 21,
    dew_point: 22,
    alarm: "condensation_risk"
  },
  sensor_offline_and_stale_data: {
    device_offline: "offline",
    alarm: "stale_data"
  },
  high_substrate_ec: {
    substrate_ec: 4.2,
    alarm: "high_substrate_ec"
  },
  irrigation_failure: {
    substrate_moisture: 18,
    irrigation_event: "missed",
    alarm: "irrigation_failure"
  },
  unexpected_high_co2: { co2: 1800, alarm: "high_co2" },
  light_or_exhaust_failure: {
    light_state: "state_mismatch",
    device_fault: "active",
    alarm: "equipment_failure"
  },
  room_excursion_acknowledgement_and_escalation: {
    relative_humidity: 78,
    alarm: "acknowledged_then_escalated"
  },
  pest_found_and_plant_quarantined: { alarm: "pest_observation_confirmed" },
  inventory_shortage: { alarm: "inventory_below_reorder_point" },
  missed_task_and_overdue_sop: { alarm: "task_overdue" },
  conflicting_permissions: { alarm: "authorization_denied" },
  csv_api_duplicates_gaps_bad_timestamps_bad_units: {
    alarm: "import_validation_error"
  }
};
const eventMetrics = new Set([
  "irrigation_event",
  "light_state",
  "alarm",
  "device_offline",
  "device_fault"
]);
const deviceForMetric = (metric) => {
  if (["substrate_moisture", "substrate_ec", "substrate_ph"].includes(metric)) {
    return "qa-equipment-substrate-sensor";
  }
  if (metric === "co2") return "qa-equipment-co2-monitor";
  if (["ppfd", "dli", "light_state"].includes(metric)) {
    return "qa-equipment-lighting";
  }
  if (metric === "irrigation_event") return "qa-equipment-irrigation";
  return "qa-equipment-sensor-hub";
};

const start = Date.parse("2026-07-20T00:00:00.000Z");
const telemetryRecords = [];
for (const [scenarioIndex, scenario] of fixture.scenarioDefinitions.entries()) {
  for (let sampleIndex = 0; sampleIndex < 18; sampleIndex += 1) {
    const metric = metrics[sampleIndex % metrics.length];
    const value =
      scenarioOverrides[scenario.scenarioId]?.[metric] ?? defaultValues[metric];
    const rawUnit = metricUnits[metric];
    const sequence = scenarioIndex * 18 + sampleIndex;
    telemetryRecords.push({
      telemetryId: `qa-telemetry-${String(sequence + 1).padStart(3, "0")}`,
      scenarioId: scenario.scenarioId,
      facilityId: fixture.facilityTemplate.facilityId,
      roomId: scenario.targetRoomIds[sampleIndex % scenario.targetRoomIds.length],
      deviceId: deviceForMetric(metric),
      providerMetricKey: `qa.synthetic.${metric}`,
      canonicalMetric: metric,
      rawValue: value,
      rawUnit,
      normalizedValue: value,
      normalizedUnit: rawUnit,
      recordedAt: new Date(start + sequence * 5 * 60 * 1000).toISOString(),
      synthetic: true,
      evidenceClass: eventMetrics.has(metric)
        ? "synthetic_qa_event"
        : "synthetic_qa_measurement"
    });
  }
}
fixture.telemetryContract.telemetryRecords = telemetryRecords;
fixture.telemetryContract.generator = {
  deterministic: true,
  script: "scripts/build-facility-simulator-qa-fixture.cjs",
  startingAt: "2026-07-20T00:00:00.000Z",
  intervalMinutes: 5,
  recordsPerScenario: 18,
  observedProductionData: false,
  operationalSetpoints: false
};

const manifestPath = path.join(ROOT, "tests", "fixtures", "growpath-qa-seed-system.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const facilityPack = manifest.packs.find((pack) => pack.id === "facility-simulator");
facilityPack.status = "seed_ready";
facilityPack.seedInputApproval = fixture.seedInputApproval;
facilityPack.postSeedAcceptanceRequired = true;
facilityPack.telemetryMetrics = metrics;

(async () => {
  const [fixtureConfig, manifestConfig] = await Promise.all([
    prettier.resolveConfig(fixturePath),
    prettier.resolveConfig(manifestPath)
  ]);
  const [formattedFixture, formattedManifest] = await Promise.all([
    prettier.format(`${JSON.stringify(fixture, null, 2)}\n`, {
      ...fixtureConfig,
      filepath: fixturePath
    }),
    prettier.format(`${JSON.stringify(manifest, null, 2)}\n`, {
      ...manifestConfig,
      filepath: manifestPath
    })
  ]);

  fs.writeFileSync(fixturePath, formattedFixture);
  fs.writeFileSync(manifestPath, formattedManifest);
  console.log(
    `Built ${telemetryRecords.length} synthetic Facility telemetry records across ${fixture.scenarioDefinitions.length} scenarios.`
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
