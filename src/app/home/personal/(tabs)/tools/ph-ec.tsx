import React from "react";
import { useLocalSearchParams } from "expo-router";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import {
  saveToolRunAndCreateTasks,
  type LinkedTaskDraft
} from "@/features/personal/tools/saveToolRunAndOpenJournal";

function n(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function param(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function phEcCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "ph_ec_followup",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    },
    sourceType: "ph_ec_check"
  };
}

function phEcTaskPlan(outputs: Record<string, any>): LinkedTaskDraft[] {
  const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  if (planned.length) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `pH / EC follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      ...phEcCalendarMetadata(String(task?.sourceStage || `ph_ec_followup_${index + 1}`)),
      description:
        task?.description ||
        "Follow up on pH/EC readings with fresh measurements, plant response, and watering/feed notes."
    }));
  }

  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  const risks = Array.isArray(outputs.possibleRisks) ? outputs.possibleRisks : [];
  const highPriority =
    warnings.length > 0 ||
    risks.length > 0 ||
    ["high", "out_of_range"].includes(String(outputs.riskLevel || outputs.ecStatus));

  return [
    {
      title: outputs.retestTaskSuggestion?.title || "Retest pH / EC",
      priority: normalizePriority(
        outputs.retestTaskSuggestion?.priority,
        highPriority ? "high" : "medium"
      ),
      dueDate: tomorrow(outputs.retestTaskSuggestion?.dueInDays || 1),
      ...phEcCalendarMetadata("ph_ec_retest"),
      description:
        warnings.join(" ") ||
        "Retest input and runoff pH/EC before changing feed strength or pH adjustment."
    },
    {
      title: "Log plant response to pH / EC trend",
      priority: highPriority ? "high" : ("medium" as const),
      dueDate: tomorrow(2),
      ...phEcCalendarMetadata("ph_ec_plant_response"),
      description:
        "Record leaf posture, color, tip burn, clawing, deficiency signs, watering volume, runoff amount, and photos."
    },
    {
      title: "Review source water and feed assumptions",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...phEcCalendarMetadata("ph_ec_source_review"),
      description:
        "Check water source, alkalinity/minerals if known, meter calibration, input recipe, EC unit, and whether runoff drift is repeating."
    }
  ];
}

export default function PhEcToolScreen() {
  const params = useLocalSearchParams<{
    projectId?: string | string[];
  }>();
  const projectId = param(params.projectId);
  return (
    <BackendCalculatorToolScreen
      tool="ph-ec-check"
      toolKey="ph-ec-check"
      title="pH / EC Range Check"
      subtitle={
        projectId
          ? "Log a root-zone measurement inside the selected Crop Steering project. This interprets ranges and trends; it does not dose pH Up/Down."
          : "Compare input and runoff pH/EC against medium and stage ranges without pretending to dose pH Up/Down."
      }
      aiPrefill={{
        buttonLabel: "Fill pH / EC review from grow",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill this pH/EC review from the selected grow/plant's actual crop type, medium or soil recipe, stage, owner-entered target ranges, water profile and alkalinity/mineral report, nutrient recipe/topdress, calibrated meter records, recent input/runoff or reservoir readings, irrigation/feed events, drift history, and plant response. Return JSON only with exactly these string keys: cropType, medium, stage, inputPH, runoffPH, inputEC, runoffEC, ecUnit, targetPHMin, targetPHMax, targetECMin, targetECMax, waterSource, alkalinity, calcium, magnesium, sodium, chloride, recentFeedRecipeId, recentTopdressId, interpretationNotes. Every numeric reading and EC unit must come from a saved measurement; never estimate pH or EC from symptoms, images, product labels, or generic targets. Leave unknowns blank. In interpretationNotes separate measured drift from possible causes, include meter/calibration and sampling limitations, water alkalinity context, nutrient antagonism or salt-stacking considerations, and the next measurement needed. Do not recommend a pH-up/down dose.`
      }}
      validateValues={(values) => {
        if (!values.medium.trim()) return "Enter the actual medium or substrate.";
        if (!values.stage.trim()) return "Enter the crop stage.";
        const hasEcReading = ["inputEC", "runoffEC"].some((key) =>
          String(values[key] || "").trim()
        );
        if (hasEcReading && !values.ecUnit.trim()) {
          return "Enter the EC unit used by the meter.";
        }
        for (const [label, minKey, maxKey] of [
          ["pH", "targetPHMin", "targetPHMax"],
          ["EC", "targetECMin", "targetECMax"]
        ]) {
          const minText = String(values[minKey] || "").trim();
          const maxText = String(values[maxKey] || "").trim();
          if (Boolean(minText) !== Boolean(maxText)) {
            return `Enter both the ${label} target minimum and maximum, or leave both blank.`;
          }
          if (minText && Number(minText) >= Number(maxText)) {
            return `The ${label} target minimum must be lower than its maximum.`;
          }
        }
        if (
          !["inputPH", "runoffPH", "inputEC", "runoffEC"].some((key) =>
            String(values[key] || "").trim()
          )
        ) {
          return "Enter at least one calibrated pH or EC measurement.";
        }
        return null;
      }}
      fields={[
        {
          key: "cropType",
          label: "Crop type",
          defaultValue: projectId ? "cannabis" : "",
          section: "Crop and sampling context"
        },
        {
          key: "medium",
          label: "Medium",
          defaultValue: "",
          required: true,
          section: "Crop and sampling context"
        },
        {
          key: "stage",
          label: "Stage",
          defaultValue: "",
          required: true,
          section: "Crop and sampling context"
        },
        {
          key: "inputPH",
          label: "Input pH",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Measured input and runoff"
        },
        {
          key: "runoffPH",
          label: "Runoff pH",
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
          key: "ecUnit",
          label: "EC unit",
          defaultValue: "",
          section: "Measured input and runoff"
        },
        {
          key: "targetPHMin",
          label: "Owner target pH minimum (optional)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Owner targets (optional)"
        },
        {
          key: "targetPHMax",
          label: "Owner target pH maximum (optional)",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "targetECMin",
          label: "Owner target EC minimum (optional)",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "targetECMax",
          label: "Owner target EC maximum (optional)",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "waterSource",
          label: "Water source",
          defaultValue: "",
          section: "Water report (optional)"
        },
        {
          key: "alkalinity",
          label: "Alkalinity mg/L as CaCO3",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "calcium",
          label: "Calcium mg/L",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "magnesium",
          label: "Magnesium mg/L",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "sodium",
          label: "Sodium mg/L",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "chloride",
          label: "Chloride mg/L",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "recentFeedRecipeId",
          label: "Recent feed recipe ID or name",
          defaultValue: "",
          section: "Recent inputs and notes"
        },
        {
          key: "recentTopdressId",
          label: "Recent topdress ID or name",
          defaultValue: ""
        },
        {
          key: "interpretationNotes",
          label: "Measurement context and questions (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        projectId: projectId || undefined,
        cropType: values.cropType || undefined,
        phenoPlantId: plantContext.plantId || undefined,
        medium: values.medium,
        stage: values.stage,
        inputPH: n(values.inputPH),
        runoffPH: n(values.runoffPH),
        inputEC: n(values.inputEC),
        runoffEC: n(values.runoffEC),
        ecUnit: values.ecUnit,
        waterSource: values.waterSource,
        targetPHRange:
          n(values.targetPHMin) != null && n(values.targetPHMax) != null
            ? { min: n(values.targetPHMin), max: n(values.targetPHMax) }
            : undefined,
        targetECRange:
          n(values.targetECMin) != null && n(values.targetECMax) != null
            ? { min: n(values.targetECMin), max: n(values.targetECMax) }
            : undefined,
        alkalinity: n(values.alkalinity),
        calcium: n(values.calcium),
        magnesium: n(values.magnesium),
        sodium: n(values.sodium),
        chloride: n(values.chloride),
        recentFeedRecipeId: values.recentFeedRecipeId || undefined,
        recentTopdressId: values.recentTopdressId || undefined,
        interpretationNotes: values.interpretationNotes || undefined
      })}
      buildMetrics={(outputs) => [
        {
          key: "assessment",
          label: "Assessment",
          value: outputs.assessmentStatus || "-"
        },
        { key: "risk", label: "Risk", value: outputs.riskLevel || "-" },
        { key: "input-ph", label: "Input pH", value: outputs.phStatus || "-" },
        { key: "runoff-ph", label: "Runoff pH", value: outputs.runoffPHStatus || "-" },
        { key: "input-ec", label: "Input EC", value: outputs.ecStatus || "-" },
        { key: "runoff-ec", label: "Runoff EC", value: outputs.runoffECStatus || "-" },
        { key: "drift", label: "Drift", value: outputs.driftDirection || "-" },
        {
          key: "risks",
          label: "Risks",
          value: Array.isArray(outputs.possibleRisks) ? outputs.possibleRisks.length : "-"
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity: "high" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.missingInformation) && outputs.missingInformation.length
          ? [
              {
                key: "missing",
                severity: "medium" as const,
                message: `Missing context: ${outputs.missingInformation.join(", ")}.`
              }
            ]
          : []),
        ...(Array.isArray(outputs.limitations)
          ? outputs.limitations.map((message: string, index: number) => ({
              key: `limitation-${index}`,
              severity: "info" as const,
              message
            }))
          : [])
      ]}
      defaultLogTitle={() => "pH / EC range check"}
      defaultTask={(outputs) => ({
        title: outputs.retestTaskSuggestion?.title || "Retest pH / EC",
        description: Array.isArray(outputs.warnings)
          ? outputs.warnings.join(" ")
          : "Retest pH and EC.",
        priority: outputs.retestTaskSuggestion?.priority || "medium",
        dueDate: tomorrow(outputs.retestTaskSuggestion?.dueInDays || 1),
        ...phEcCalendarMetadata("ph_ec_retest")
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-ph-ec-tasks",
          label: "Create pH / EC Task Plan",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created pH / EC tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "ph-ec-check",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: phEcTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
