import React, { useState } from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";

function normalizePriority(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function cropSteeringTaskPlan(outputs: Record<string, any>) {
  const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  const calendarMetadata = {
    allDay: true,
    calendarType: "crop_steering_followup",
    sourceStage: String(outputs.phase || outputs.stage || "crop_steering_review"),
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
  if (planned.length) {
    return planned.slice(0, 8).map((item: any, index: number) => ({
      title: String(item?.title || `Crop steering follow-up ${index + 1}`),
      priority: normalizePriority(item?.priority),
      dueDate: tomorrow(Number(item?.dueInDays || index + 1)),
      ...calendarMetadata,
      description:
        item?.description ||
        "Follow up on crop steering response with dryback, EC, pH, environment, and plant response notes."
    }));
  }

  return [
    {
      title: "Log crop steering response",
      priority: normalizePriority(outputs.pressureLevel === "high" ? "high" : "medium"),
      dueDate: tomorrow(1),
      ...calendarMetadata,
      description:
        "Record plant response, dryback, EC, runoff, root-zone behavior, and comparison notes."
    },
    {
      title: "Review crop steering target fit",
      priority: "medium" as const,
      dueDate: tomorrow(2),
      ...calendarMetadata,
      sourceStage: "crop_steering_target_review",
      description:
        "Compare steering intent, phase, DLI, VPD, EC, pH, and recovery before increasing pressure."
    },
    {
      title: "Update pheno response notes",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...calendarMetadata,
      sourceStage: "pheno_steering_response",
      description:
        outputs.phenoImpact ||
        outputs.notesForPhenoScore ||
        "Record whether this plant handled the steering strategy well enough to affect keeper decisions."
    }
  ];
}

export default function CropSteeringProjectToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  return (
    <BackendCalculatorToolScreen
      tool="crop-steering-project"
      toolKey="crop-steering-project"
      title="Crop Steering Projects"
      subtitle="Review current conditions and optionally turn stage-appropriate steering techniques into grow tasks. Measurements and plant response remain the source of truth."
      formHeader={({ growId }) => (
        <MediaEvidencePicker
          aiUsable
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="grow_log"
          sourceContext={{ growId: growId || undefined }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
      aiPrefill={{
        buttonLabel: "Review steering options from grow",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill this optional Crop Steering review from the selected grow/plant stage, substrate/media, pot size, irrigation events, dryback or moisture telemetry, input/runoff EC and pH, DLI, VPD, recipe, nutrient antagonism warnings, stress history, and attached media. Return JSON only with exactly these string keys: steeringIntent, stage, phase, drybackPercent, irrigationTiming, dli, vpd, inputEC, runoffEC, inputPH, runoffPH, recipeUsed, kLevel, caMgResponse, rootZoneCondition, recoveryHours, plantResponse, lightChange, techniquesToConsider, notes. Measurements must come from saved records and include no invented targets. Describe techniquesToConsider as optional, conservative choices appropriate to the actual medium and stage, including prerequisites and stop conditions; do not prescribe aggressive dryback, EC stacking, or light increases when data is missing or stress is unresolved. Leave unknowns blank. In notes explain evidence, uncertainty, recent stress, and measurements needed before applying a technique.`
      }}
      fields={[
        { key: "steeringIntent", label: "Goal", defaultValue: "" },
        { key: "stage", label: "Stage", defaultValue: "" },
        { key: "phase", label: "Phase P0/P1/P2/P3", defaultValue: "" },
        {
          key: "drybackPercent",
          label: "Dryback %",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "irrigationTiming",
          label: "Irrigation timing",
          defaultValue: ""
        },
        {
          key: "dli",
          label: "DLI",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "vpd",
          label: "VPD",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "inputEC",
          label: "Input EC",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "runoffEC",
          label: "Runoff EC",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "inputPH",
          label: "Input pH",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "runoffPH",
          label: "Runoff pH",
          defaultValue: "",
          keyboardType: "numeric"
        },
        { key: "recipeUsed", label: "Recipe used", defaultValue: "" },
        { key: "kLevel", label: "K level / note", defaultValue: "" },
        { key: "caMgResponse", label: "Ca/Mg response", defaultValue: "" },
        {
          key: "rootZoneCondition",
          label: "Root-zone condition",
          defaultValue: ""
        },
        {
          key: "recoveryHours",
          label: "Recovery hours",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "plantResponse",
          label: "Plant response",
          defaultValue: "",
          multiline: true
        },
        {
          key: "lightChange",
          label: "Recent light change",
          defaultValue: ""
        },
        {
          key: "techniquesToConsider",
          label: "Optional techniques to consider",
          defaultValue: "",
          multiline: true
        },
        {
          key: "notes",
          label: "Tip burn, clawing, dark green, Mg/Ca symptoms, photos",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        ...values,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
      })}
      buildMetrics={(outputs) => [
        { key: "intent", label: "Intent", value: outputs.steeringIntent },
        { key: "outcome", label: "Outcome", value: outputs.steeringOutcome },
        { key: "pressure", label: "Pressure", value: outputs.pressureLevel },
        { key: "response", label: "Response", value: outputs.plantResponse },
        { key: "recovery", label: "Recovery", value: outputs.recoveryStatus },
        { key: "phase", label: "Phase", value: outputs.phase },
        { key: "warnings", label: "Warnings", value: outputs.warnings?.length || 0 },
        {
          key: "pheno",
          label: "Pheno note",
          value: outputs.phenoImpact || outputs.notesForPhenoScore
        }
      ]}
      defaultLogTitle={(outputs) => `Crop steering: ${outputs.phase || "phase"}`}
      defaultTask={(outputs) => ({
        title: outputs.tasksToCreate?.[0]?.title || "Log crop steering response",
        priority: outputs.tasksToCreate?.[0]?.priority || "medium",
        dueDate: tomorrow(outputs.tasksToCreate?.[0]?.dueInDays || 1),
        description: "Record plant response, dryback, EC, runoff, and comparison notes."
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-crop-steering-tasks",
          label: "Create Steering Task Plan",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created crop steering tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "crop-steering-project",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: cropSteeringTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
