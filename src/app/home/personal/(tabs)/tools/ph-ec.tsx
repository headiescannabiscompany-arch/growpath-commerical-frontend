import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function n(value: string, fallback?: number) {
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
      fields={[
        { key: "medium", label: "Medium", defaultValue: "soil" },
        { key: "stage", label: "Stage", defaultValue: "flower" },
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
        {
          key: "inputEC",
          label: "Input EC",
          defaultValue: "1.4",
          keyboardType: "numeric"
        },
        {
          key: "runoffEC",
          label: "Runoff EC",
          defaultValue: "2.1",
          keyboardType: "numeric"
        },
        { key: "ecUnit", label: "EC unit", defaultValue: "mS/cm" },
        { key: "waterSource", label: "Water source", defaultValue: "unknown" }
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
        waterSource: values.waterSource
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
