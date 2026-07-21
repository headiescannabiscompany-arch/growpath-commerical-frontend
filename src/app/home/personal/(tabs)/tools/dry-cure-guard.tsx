import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  getHarvestBatch,
  updateHarvestBatch,
  type DryCureRecordInput
} from "@/api/harvestBatches";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";

function measuredNumber(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

function optionalNumber(value: unknown) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function metric(value: unknown, unit = "") {
  return value == null || value === "" ? "Not assessed" : `${value}${unit}`;
}

function dryCureCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "dry_cure_monitoring",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function dryCureTaskPlan(outputs: Record<string, any>, payload: Record<string, any>) {
  const mode = String(payload.mode || "drying").toLowerCase();
  const daysInStage = optionalNumber(payload.daysInStage) || 0;
  const daysUntilStageDay = (targetDay: number) =>
    Math.max(1, Math.ceil(targetDay - daysInStage));
  const firstSuggestion = Array.isArray(outputs.taskSuggestions)
    ? outputs.taskSuggestions[0]
    : null;
  const riskSummary = [
    outputs.moldRisk ? `Mold risk: ${outputs.moldRisk}` : "",
    outputs.overdryRisk ? `Overdry risk: ${outputs.overdryRisk}` : "",
    outputs.dewPointF != null ? `Dew point: ${outputs.dewPointF} F` : "",
    payload.lightExposure ? `Light exposure: ${payload.lightExposure}` : "",
    payload.daysInStage != null ? `Stage day: ${payload.daysInStage}` : "",
    outputs.nextAction ? `Next action: ${outputs.nextAction}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const firstCheck = {
    title: firstSuggestion?.title || "24-hour dry/cure recheck - not completion",
    priority: firstSuggestion?.priority || "medium",
    dueDate: tomorrow(1),
    ...dryCureCalendarMetadata("dry_cure_condition_check"),
    description: [
      riskSummary ||
        "Check dry-room temp/RH, light exposure, airflow, material density, and jar RH if curing.",
      "This is a 24-hour monitoring checkpoint, not a finish date."
    ].join("\n")
  };

  if (mode === "drying") {
    return [
      firstCheck,
      {
        title: "Inspect drying quality and interior moisture",
        priority: "high" as const,
        dueDate: tomorrow(daysUntilStageDay(3)),
        ...dryCureCalendarMetadata("dry_cure_bud_inspection"),
        description:
          "Check darkness, stem flex, exterior crispness, representative interior moisture, aroma, and any ammonia, musty, sour, or hay notes."
      },
      {
        title: "Assess fast-dry quality risk - not completion",
        priority: "high" as const,
        dueDate: tomorrow(daysUntilStageDay(7)),
        ...dryCureCalendarMetadata("dry_cure_fast_window_review"),
        description:
          "A hot, fast, low-humidity dry can reach an endpoint in 5-7 days but may overdry the exterior or reduce quality. Measure and inspect; do not mark complete from the calendar."
      },
      {
        title: "Review the controlled drying window",
        priority: "medium" as const,
        dueDate: tomorrow(daysUntilStageDay(10)),
        ...dryCureCalendarMetadata("dry_cure_planning_window_review"),
        description:
          "Controlled drying is commonly planned around 10-14 days. Use measured trends, interior/exterior feel, aroma, and an equilibrated container check to decide whether to continue."
      },
      {
        title: "Record drying outcome or continue monitoring",
        priority: "medium" as const,
        dueDate: tomorrow(daysUntilStageDay(14)),
        ...dryCureCalendarMetadata("dry_cure_outcome_notes"),
        description:
          "Day 14 is a review point, not an automatic completion date. Longer dries can occur but are not recommended as routine; save the measurements and observations supporting transition or continued drying."
      }
    ];
  }

  return [
    firstCheck,
    {
      title: "Inspect buds for dry/cure quality",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...dryCureCalendarMetadata("dry_cure_bud_inspection"),
      description:
        "Check darkness, exterior/interior moisture, aroma, texture, and any ammonia, musty, sour, or hay notes."
    },
    {
      title:
        mode === "curing" ? "Check jar RH and burp response" : "Prepare jar RH check",
      priority: "medium" as const,
      dueDate: tomorrow(mode === "curing" ? 7 : 5),
      ...dryCureCalendarMetadata("dry_cure_jar_rh_review"),
      description:
        "Record jar or bag RH, burp timing, aroma trend, texture, and whether material is stabilizing or over-drying."
    },
    {
      title: "Record dry/cure outcome notes",
      priority: "medium" as const,
      dueDate: tomorrow(mode === "curing" ? 14 : 7),
      ...dryCureCalendarMetadata("dry_cure_outcome_notes"),
      description:
        "Save smell, texture, moisture, trim readiness, and cure quality notes back to the grow timeline."
    }
  ];
}

function dryCureStage(mode: unknown): DryCureRecordInput["stage"] {
  const normalized = String(mode || "").toLowerCase();
  if (normalized.includes("cur")) return "curing";
  if (normalized.includes("trim")) return "trim";
  if (normalized.includes("store")) return "stored";
  if (normalized.includes("quality")) return "quality_review";
  if (normalized.includes("harvest")) return "harvested";
  return "drying";
}

function dryCureRecord(
  outputs: Record<string, any>,
  payload: Record<string, any>,
  toolRunId: string
): DryCureRecordInput {
  const enteredTemp = optionalNumber(payload.dryRoomTemp);
  const tempF =
    enteredTemp == null
      ? null
      : String(payload.tempUnit || "F").toUpperCase() === "C"
        ? enteredTemp * 1.8 + 32
        : enteredTemp;
  return {
    recordedAt: new Date().toISOString(),
    stage: dryCureStage(payload.mode),
    tempF,
    rh: optionalNumber(payload.dryRoomRH),
    jarRh: optionalNumber(payload.jarRH),
    dewPointF: typeof outputs.dewPointF === "number" ? outputs.dewPointF : null,
    aromaNotes: outputs.aromaRisk || outputs.nextAction || "",
    textureNotes: outputs.overdryRisk ? `Overdry risk: ${outputs.overdryRisk}` : "",
    qualityNotes: [
      outputs.moldRisk ? `Mold risk: ${outputs.moldRisk}` : "",
      outputs.overdryRisk ? `Overdry risk: ${outputs.overdryRisk}` : "",
      outputs.condensationRisk ? `Condensation signal: ${outputs.condensationRisk}` : "",
      outputs.surfaceDewPointMarginC != null
        ? `Surface-to-dew-point margin: ${outputs.surfaceDewPointMarginC} C`
        : "",
      payload.measuredAt ? `Measured at: ${payload.measuredAt}` : "",
      payload.measurementSource ? `Measurement source: ${payload.measurementSource}` : "",
      payload.lightExposure ? `Light exposure: ${payload.lightExposure}` : "",
      payload.daysInStage != null ? `Days in stage: ${payload.daysInStage}` : "",
      outputs.stageTiming?.planningWindow
        ? `Planning window: ${outputs.stageTiming.planningWindow}`
        : "",
      outputs.stageTiming?.completionBasis
        ? `Completion basis: ${outputs.stageTiming.completionBasis}`
        : "",
      outputs.nextAction ? `Next action: ${outputs.nextAction}` : "",
      payload.observations ? `Observations: ${payload.observations}` : ""
    ]
      .filter(Boolean)
      .join("\n"),
    linkedToolRunId: toolRunId
  };
}

export default function DryCureGuardToolScreen() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  return (
    <BackendCalculatorToolScreen
      tool="dry-cure-guard"
      toolKey="dry-cure-guard"
      title="Dry / Cure Guard"
      subtitle="Use real room, surface, container, light, and stage-time evidence without pretending one target or one day guarantees quality."
      experienceMessage="This is a measured-condition workflow. Drying and curing stay protected from light; a 24-hour item is only a recheck, and completion depends on measurements and trends."
      aiCreditMessage="The calculator itself uses no AI credit. Optional AI prefill uses one credit only when you choose it and may summarize saved records or approved media; it cannot invent sensor readings."
      formHeader={({ growId }) => (
        <View style={styles.evidenceSection}>
          <View style={styles.measurementCard}>
            <Text style={styles.measurementTitle}>Measure before deciding</Text>
            <Text style={styles.measurementText}>
              1. Record room temperature and RH at the same time and location.
            </Text>
            <Text style={styles.measurementText}>
              2. If possible, measure the coldest material, rack, wall, jar, or bag
              surface for a real condensation margin.
            </Text>
            <Text style={styles.measurementText}>
              3. During cure, let the container reading equilibrate and record its RH,
              sensor, time, aroma, texture, and representative interior checks.
            </Text>
            <Text style={styles.measurementText}>
              4. Keep drying and curing material dark. Use light only briefly for work and
              record any continuous or direct exposure.
            </Text>
            <Text style={styles.measurementText}>
              5. Plan controlled drying around 10-14 days. Fast, hot, low-humidity drying
              may reach an endpoint in 5-7 days with greater quality-loss or overdry
              concern. Longer than 14 days can occur but is not recommended as a routine
              target. Time alone never marks it done.
            </Text>
            <Text style={styles.measurementWarning}>
              Photos may document structure or visible concerns, but cannot supply
              temperature/RH readings or rule mold in or out.
            </Text>
          </View>
          <MediaEvidencePicker
            aiUsable
            maxPhotos={10}
            allowVideo
            maxVideoSeconds={30}
            purpose="harvest"
            sourceContext={{ growId: growId || undefined }}
            value={evidenceAssets}
            onChange={setEvidenceAssets}
          />
        </View>
      )}
      aiPrefill={{
        buttonLabel: "Fill dry/cure review from records",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill this Dry/Cure Guard review from the selected grow's harvest batch, dry/cure records, room or device telemetry, logged temperature/RH, surface temperature, jar readings, tasks, and attached photos/video. Return JSON only with exactly these keys: {"mode":"string","daysInStage":"string","dryRoomTemp":"string","tempUnit":"string","dryRoomRH":"string","surfaceTemp":"string","jarRH":"string","hoursAtConditions":"string","measuredAt":"string","measurementSource":"string","harvestBatchId":"string","lightExposure":"string","airflow":"string","budDensity":"string","observations":"string"}. Numeric room temperature, surface temperature, room RH, jar RH, duration, and days in stage must come from saved measurements or explicit dated records; never estimate them from an image. Light exposure may be dark, brief_work_light, continuous_indirect, direct_light, or unknown and must come from an explicit record, not a visual guess. Media may support visible density, drying structure, surface condition, or airflow setup, but cannot diagnose or rule mold in or out. Leave unknowns blank. In observations summarize aroma/texture notes, evidence limitations, and the exact sensor or close-up checks still needed.`
      }}
      fields={[
        {
          key: "mode",
          label: "Stage",
          defaultValue: "",
          placeholder: "drying, curing, stored, or quality_review",
          helpText:
            "Choose the stage being measured; do not infer it from the selected grow.",
          required: true,
          section: "Current process"
        },
        {
          key: "daysInStage",
          label: "Days in current stage",
          defaultValue: "",
          placeholder: "Elapsed stage days, not days remaining",
          helpText:
            "Used to schedule checkpoints. It never becomes an automatic completion countdown.",
          keyboardType: "numeric",
          required: true
        },
        {
          key: "dryRoomTemp",
          label: "Measured room temperature",
          defaultValue: "",
          placeholder: "Enter a sensor reading",
          helpText: "Use a real room reading taken with the RH reading below.",
          keyboardType: "numeric",
          required: true,
          section: "Measured conditions"
        },
        {
          key: "tempUnit",
          label: "Temperature unit",
          defaultValue: "F",
          placeholder: "F or C",
          helpText: "The same unit is used for room and surface temperature.",
          required: true
        },
        {
          key: "dryRoomRH",
          label: "Measured room RH",
          defaultValue: "",
          placeholder: "Enter relative humidity percent",
          helpText: "Enter a 1-100% sensor reading taken with the room temperature.",
          keyboardType: "numeric",
          required: true
        },
        {
          key: "surfaceTemp",
          label: "Coldest surface temperature (recommended)",
          defaultValue: "",
          placeholder: "Material, rack, wall, jar, or bag surface",
          helpText:
            "Without this measurement, the tool can calculate air dew point but cannot assess a true surface condensation margin.",
          keyboardType: "numeric"
        },
        {
          key: "jarRH",
          label: "Equilibrated jar or bag RH (during cure)",
          defaultValue: "",
          helpText: "Record only after the container sensor has had time to stabilize.",
          keyboardType: "numeric"
        },
        {
          key: "hoursAtConditions",
          label: "Hours near these conditions (optional)",
          defaultValue: "",
          placeholder: "Observed duration, not a guess",
          keyboardType: "numeric"
        },
        {
          key: "measuredAt",
          label: "Measurement time",
          defaultValue: "",
          placeholder: "Example: 2026-07-21 2:00 PM",
          helpText: "Time links this snapshot to logs, changes, and repeat checks."
        },
        {
          key: "measurementSource",
          label: "Sensor or measurement source",
          defaultValue: "",
          placeholder: "Device, logger, or manual meter",
          helpText: "Include placement or calibration notes when known."
        },
        {
          key: "harvestBatchId",
          label: "Harvest batch ID (optional)",
          defaultValue: "",
          helpText: "Add a batch ID to save this exact measurement snapshot to the batch."
        },
        {
          key: "lightExposure",
          label: "Light condition",
          defaultValue: "",
          placeholder:
            "dark, brief_work_light, continuous_indirect, direct_light, or unknown",
          helpText:
            "Drying and curing material should stay protected from light. Record brief work light separately from continuous or direct exposure.",
          required: true,
          section: "Environment and exposure"
        },
        {
          key: "airflow",
          label: "Observed airflow",
          defaultValue: "",
          placeholder: "low, medium, high, or unknown",
          section: "Physical observations"
        },
        {
          key: "budDensity",
          label: "Material or flower density",
          defaultValue: "",
          placeholder: "low, medium, high, or unknown"
        },
        {
          key: "observations",
          label: "Aroma, texture, interior, or visible observations (optional)",
          defaultValue: "",
          placeholder:
            "Record representative sites, exterior/interior feel, odor changes, visible concerns, and what was not checked.",
          multiline: true
        }
      ]}
      validateValues={(values) => {
        const missing = [
          ["mode", "Stage"],
          ["daysInStage", "Days in current stage"],
          ["dryRoomTemp", "Measured room temperature"],
          ["dryRoomRH", "Measured room RH"],
          ["lightExposure", "Light condition"]
        ].filter(([key]) => !String(values[key] || "").trim());
        return missing.length
          ? `Complete the required field${missing.length === 1 ? "" : "s"}: ${missing
              .map(([, label]) => label)
              .join(", ")}.`
          : !Number.isFinite(Number(values.daysInStage)) || Number(values.daysInStage) < 0
            ? "Days in current stage must be zero or greater."
            : ![
                  "dark",
                  "brief_work_light",
                  "continuous_indirect",
                  "direct_light",
                  "unknown"
                ].includes(
                  String(values.lightExposure || "")
                    .trim()
                    .toLowerCase()
                )
              ? "Light condition must be dark, brief_work_light, continuous_indirect, direct_light, or unknown."
              : null;
      }}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        mode: values.mode.trim(),
        daysInStage: measuredNumber(values.daysInStage),
        dryRoomTemp: measuredNumber(values.dryRoomTemp),
        tempUnit: values.tempUnit,
        dryRoomRH: measuredNumber(values.dryRoomRH),
        surfaceTemp: measuredNumber(values.surfaceTemp),
        jarRH: measuredNumber(values.jarRH),
        hoursAtConditions: measuredNumber(values.hoursAtConditions),
        measuredAt: values.measuredAt.trim() || undefined,
        measurementSource: values.measurementSource.trim() || undefined,
        harvestBatchId: values.harvestBatchId.trim() || undefined,
        lightExposure: values.lightExposure.trim() || undefined,
        airflow: values.airflow.trim() || undefined,
        budDensity: values.budDensity.trim() || undefined,
        observations: values.observations || undefined,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
      })}
      buildMetrics={(outputs) => [
        {
          key: "assessment",
          label: "Assessment",
          value: outputs.assessmentStatus || "Not assessed"
        },
        { key: "mold", label: "Mold concern", value: outputs.moldRisk || "Not assessed" },
        {
          key: "overdry",
          label: "Overdry concern",
          value: outputs.overdryRisk || "Not assessed"
        },
        { key: "dew", label: "Air dew point", value: metric(outputs.dewPointF, " F") },
        {
          key: "surface-margin",
          label: "Surface-to-dew-point margin",
          value: metric(outputs.surfaceDewPointMarginC, " C")
        },
        {
          key: "light",
          label: "Light protection",
          value: outputs.lightStatus || "Not assessed"
        },
        {
          key: "timing",
          label: "Stage timing",
          value:
            outputs.mode === "drying"
              ? "Plan 10-14 days; 24h is a recheck"
              : "Measurement-based; 24h is a recheck"
        },
        {
          key: "condensation",
          label: "Condensation signal",
          value: outputs.condensationRisk || "Not assessed"
        }
      ]}
      defaultLogTitle={() => "Dry / cure check"}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestions?.[0]?.title || "Check dry/cure conditions",
        description: outputs.nextAction || "Check dry/cure conditions.",
        priority: outputs.taskSuggestions?.[0]?.priority || "medium",
        dueDate: tomorrow(1),
        ...dryCureCalendarMetadata("dry_cure_condition_check")
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-dry-cure-monitoring-tasks",
          label: "Create Dry/Cure Monitoring Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created dry/cure monitoring tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "dry-cure-guard",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: dryCureTaskPlan(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        },
        {
          key: "save-dry-cure-harvest-record",
          label: "Save to Harvest Batch",
          variant: "secondary",
          pendingLabel: "Saving...",
          disabled: !growId || !payload.harvestBatchId,
          successMessage: "Saved dry/cure record to harvest batch.",
          onPress: async () => {
            const harvestBatchId = String(payload.harvestBatchId || "").trim();
            const linkedToolRunId = String(toolRun?.id || toolRun?._id || "").trim();
            if (!harvestBatchId) throw new Error("Harvest batch ID is required.");
            if (!linkedToolRunId) throw new Error("A saved ToolRun is required.");
            const batch = await getHarvestBatch(harvestBatchId);
            if (!batch) throw new Error("Harvest batch not found.");
            const existingRecords = Array.isArray(batch.dryCureRecords)
              ? batch.dryCureRecords
              : [];
            const existingRunIds = Array.isArray(batch.linkedToolRunIds)
              ? batch.linkedToolRunIds
              : [];
            const updated = await updateHarvestBatch(harvestBatchId, {
              status: dryCureStage(payload.mode) === "curing" ? "curing" : "drying",
              dryCureRecords: [
                ...existingRecords,
                dryCureRecord(outputs, payload, linkedToolRunId)
              ],
              linkedToolRunIds: Array.from(new Set([...existingRunIds, linkedToolRunId]))
            });
            if (!updated) throw new Error("Unable to update harvest batch.");
          }
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  evidenceSection: { gap: 12 },
  measurementCard: {
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4"
  },
  measurementTitle: { color: "#14532D", fontSize: 16, fontWeight: "800" },
  measurementText: { color: "#334155", fontSize: 13, lineHeight: 19 },
  measurementWarning: {
    color: "#92400E",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  }
});
