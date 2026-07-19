import React, { useState } from "react";

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

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const firstSuggestion = Array.isArray(outputs.taskSuggestions)
    ? outputs.taskSuggestions[0]
    : null;
  const riskSummary = [
    outputs.moldRisk ? `Mold risk: ${outputs.moldRisk}` : "",
    outputs.overdryRisk ? `Overdry risk: ${outputs.overdryRisk}` : "",
    outputs.dewPointF != null ? `Dew point: ${outputs.dewPointF} F` : "",
    outputs.nextAction ? `Next action: ${outputs.nextAction}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      title: firstSuggestion?.title || "Check dry/cure conditions",
      priority: firstSuggestion?.priority || "medium",
      dueDate: tomorrow(1),
      ...dryCureCalendarMetadata("dry_cure_condition_check"),
      description:
        riskSummary ||
        "Check dry-room temp/RH, airflow, bud density risk, and jar RH if curing."
    },
    {
      title: "Inspect buds for dry/cure quality",
      priority: mode === "drying" ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(mode === "drying" ? 2 : 1),
      ...dryCureCalendarMetadata("dry_cure_bud_inspection"),
      description:
        "Check stem flex/snap, exterior crispness, interior moisture, aroma, and any ammonia or hay notes."
    },
    {
      title:
        mode === "curing" ? "Check jar RH and burp response" : "Prepare jar RH check",
      priority: "medium" as const,
      dueDate: tomorrow(mode === "curing" ? 1 : 5),
      ...dryCureCalendarMetadata("dry_cure_jar_rh_review"),
      description:
        "Record jar or bag RH, burp timing, aroma trend, texture, and whether material is stabilizing or over-drying."
    },
    {
      title: "Record dry/cure outcome notes",
      priority: "medium" as const,
      dueDate: tomorrow(mode === "curing" ? 3 : 7),
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
  const tempF =
    String(payload.tempUnit || "F").toUpperCase() === "C"
      ? n(String(payload.dryRoomTemp), 0)! * 1.8 + 32
      : n(String(payload.dryRoomTemp));
  return {
    recordedAt: new Date().toISOString(),
    stage: dryCureStage(payload.mode),
    tempF,
    rh: n(String(payload.dryRoomRH)),
    jarRh: payload.jarRH == null ? null : n(String(payload.jarRH)),
    dewPointF: typeof outputs.dewPointF === "number" ? outputs.dewPointF : null,
    aromaNotes: outputs.aromaRisk || outputs.nextAction || "",
    textureNotes: outputs.overdryRisk ? `Overdry risk: ${outputs.overdryRisk}` : "",
    qualityNotes: [
      outputs.moldRisk ? `Mold risk: ${outputs.moldRisk}` : "",
      outputs.overdryRisk ? `Overdry risk: ${outputs.overdryRisk}` : "",
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
      subtitle="Check dry-room and jar moisture risk without pretending one target guarantees quality."
      formHeader={({ growId }) => (
        <MediaEvidencePicker
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="harvest"
          sourceContext={{ growId: growId || undefined }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
      aiPrefill={{
        buttonLabel: "Fill dry/cure review from records",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill this Dry/Cure Guard review from the selected grow's harvest batch, dry/cure records, room or device telemetry, logged temperature/RH, jar readings, tasks, and attached photos/video. Return JSON only with exactly these keys: {"mode":"string","dryRoomTemp":"string","tempUnit":"string","dryRoomRH":"string","jarRH":"string","harvestBatchId":"string","airflow":"string","budDensity":"string","observations":"string"}. Numeric temperature, room RH, and jar RH must come from saved measurements; never estimate them from an image. Media may support visible density, drying structure, surface condition, or airflow setup, but cannot rule mold in or out by itself. Leave unknowns blank. In observations summarize aroma/texture notes, measurement timing, evidence limitations, and the exact sensor or close-up checks still needed.`
      }}
      fields={[
        { key: "mode", label: "Mode", defaultValue: "drying" },
        {
          key: "dryRoomTemp",
          label: "Dry room temp",
          defaultValue: "68",
          keyboardType: "numeric"
        },
        { key: "tempUnit", label: "Temperature unit", defaultValue: "F" },
        {
          key: "dryRoomRH",
          label: "Dry room RH",
          defaultValue: "60",
          keyboardType: "numeric"
        },
        {
          key: "jarRH",
          label: "Jar RH (optional)",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "harvestBatchId",
          label: "Harvest batch ID (optional)",
          defaultValue: ""
        },
        { key: "airflow", label: "Airflow", defaultValue: "medium" },
        { key: "budDensity", label: "Bud density", defaultValue: "medium" },
        {
          key: "observations",
          label: "Aroma, texture, or other observations (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        mode: values.mode,
        dryRoomTemp: n(values.dryRoomTemp),
        tempUnit: values.tempUnit,
        dryRoomRH: n(values.dryRoomRH),
        jarRH: values.jarRH ? n(values.jarRH) : undefined,
        harvestBatchId: values.harvestBatchId.trim() || undefined,
        airflow: values.airflow,
        budDensity: values.budDensity,
        observations: values.observations || undefined,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
      })}
      buildMetrics={(outputs) => [
        { key: "mold", label: "Mold risk", value: outputs.moldRisk || "-" },
        { key: "overdry", label: "Overdry risk", value: outputs.overdryRisk || "-" },
        { key: "dew", label: "Dew point", value: `${outputs.dewPointF ?? "-"} F` },
        {
          key: "spread",
          label: "Dew spread",
          value: `${outputs.dewPointSpreadC ?? "-"} C`
        },
        { key: "action", label: "Next action", value: outputs.nextAction || "-" }
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
