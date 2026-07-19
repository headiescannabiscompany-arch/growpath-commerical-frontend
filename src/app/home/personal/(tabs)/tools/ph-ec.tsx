import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function n(value: string, fallback?: number) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    }
  };
}

function phEcTaskPlan(outputs: Record<string, any>) {
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
  return (
    <BackendCalculatorToolScreen
      tool="ph-ec-check"
      toolKey="ph-ec-check"
      title="pH / EC Range Check"
      subtitle="Compare input and runoff pH/EC against medium and stage ranges without pretending to dose pH up/down."
      aiPrefill={{
        buttonLabel: "Fill pH / EC review from grow",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill this pH/EC review from the selected grow/plant's actual medium or soil recipe, stage, water profile and alkalinity, nutrient recipe, calibrated meter records, recent input/runoff or reservoir readings, irrigation/feed events, drift history, and plant response. Return JSON only with exactly these string keys: medium, stage, inputPH, runoffPH, inputEC, runoffEC, ecUnit, waterSource, interpretationNotes. Every numeric reading and EC unit must come from a saved measurement; never estimate pH or EC from symptoms, images, product labels, or generic targets. Leave unknowns blank. In interpretationNotes separate measured drift from possible causes, include meter/calibration and sampling limitations, water alkalinity context, nutrient antagonism or salt-stacking considerations, and the next measurement needed. Do not recommend a pH-up/down dose.`
      }}
      fields={[
        { key: "medium", label: "Medium", defaultValue: "" },
        { key: "stage", label: "Stage", defaultValue: "" },
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
        { key: "ecUnit", label: "EC unit", defaultValue: "" },
        { key: "waterSource", label: "Water source", defaultValue: "" },
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
        medium: values.medium,
        stage: values.stage,
        inputPH: n(values.inputPH),
        runoffPH: n(values.runoffPH),
        inputEC: n(values.inputEC),
        runoffEC: n(values.runoffEC),
        ecUnit: values.ecUnit,
        waterSource: values.waterSource,
        interpretationNotes: values.interpretationNotes || undefined
      })}
      buildMetrics={(outputs) => [
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
