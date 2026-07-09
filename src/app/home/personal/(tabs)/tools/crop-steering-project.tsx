import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

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
  return (
    <BackendCalculatorToolScreen
      tool="crop-steering-project"
      toolKey="crop-steering-project"
      title="Crop Steering Projects"
      subtitle="Track vegetative/generative intent, root-zone behavior, dryback, light, VPD, EC, pH, recovery, and pheno impact."
      fields={[
        { key: "steeringIntent", label: "Goal", defaultValue: "generative" },
        { key: "stage", label: "Stage", defaultValue: "mid flower" },
        { key: "phase", label: "Phase P0/P1/P2/P3", defaultValue: "P1" },
        {
          key: "drybackPercent",
          label: "Dryback %",
          defaultValue: "25",
          keyboardType: "numeric"
        },
        {
          key: "irrigationTiming",
          label: "Irrigation timing",
          defaultValue: "controlled morning shot, runoff checked"
        },
        {
          key: "dli",
          label: "DLI",
          defaultValue: "38",
          keyboardType: "numeric"
        },
        {
          key: "vpd",
          label: "VPD",
          defaultValue: "1.25",
          keyboardType: "numeric"
        },
        {
          key: "inputEC",
          label: "Input EC",
          defaultValue: "1.4",
          keyboardType: "numeric"
        },
        {
          key: "runoffEC",
          label: "Runoff EC",
          defaultValue: "1.7",
          keyboardType: "numeric"
        },
        {
          key: "inputPH",
          label: "Input pH",
          defaultValue: "6.3",
          keyboardType: "numeric"
        },
        {
          key: "runoffPH",
          label: "Runoff pH",
          defaultValue: "6.6",
          keyboardType: "numeric"
        },
        { key: "recipeUsed", label: "Recipe used", defaultValue: "balanced flower feed" },
        { key: "kLevel", label: "K level / note", defaultValue: "moderate" },
        { key: "caMgResponse", label: "Ca/Mg response", defaultValue: "stable" },
        {
          key: "rootZoneCondition",
          label: "Root-zone condition",
          defaultValue: "even moisture"
        },
        {
          key: "recoveryHours",
          label: "Recovery hours",
          defaultValue: "12",
          keyboardType: "numeric"
        },
        {
          key: "plantResponse",
          label: "Plant response",
          defaultValue: "turgor recovered by next light cycle",
          multiline: true
        },
        {
          key: "lightChange",
          label: "Recent light change",
          defaultValue: "stable"
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
        ...values
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
