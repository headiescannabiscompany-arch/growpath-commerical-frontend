import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addDays(dateValue: unknown, days: number) {
  const base = new Date(String(dateValue || tomorrow(1)));
  if (Number.isNaN(base.getTime())) return tomorrow(days);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function topdressTasks(outputs: Record<string, any>, payload: Record<string, any>) {
  const productName = String(
    outputs.productName || payload.productName || "topdress plan"
  );
  const topdressLabel = /topdress/i.test(productName)
    ? productName
    : `${productName} topdress`;
  const applyDate = String(
    outputs.plannedApplyDate || payload.plannedApplyDate || tomorrow(1)
  ).slice(0, 10);
  const amount =
    outputs.amountPerPlant && outputs.amountUnit
      ? `${outputs.amountPerPlant} ${outputs.amountUnit} per plant`
      : payload.doseRate
        ? `${payload.doseRate} ${payload.doseUnit || "dose units"}`
        : "planned rate";
  const total =
    outputs.totalAmount && outputs.amountUnit
      ? ` Total batch: ${outputs.totalAmount} ${outputs.amountUnit}.`
      : "";
  const releaseWindow = outputs.releaseWindowDays
    ? `${outputs.releaseWindowDays.min}-${outputs.releaseWindowDays.max} days`
    : outputs.expectedReleaseWindow || payload.releaseClass || "estimated release window";
  const calendarMetadata = {
    allDay: true,
    calendarType: "topdress_followup",
    sourceStage: String(payload.stage || outputs.stage || "topdress"),
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };

  return [
    {
      title: `Apply ${topdressLabel}`,
      description: `Apply ${amount} for ${payload.stage || "the current stage"}.${total} Keep off stems and spread evenly.`,
      priority: "high" as const,
      dueDate: applyDate,
      ...calendarMetadata,
      sourceStage: "topdress_application"
    },
    {
      title: `Water in ${productName}`,
      description:
        "Water in the topdress gently so amendments make soil contact without runoff or channeling.",
      priority: "high" as const,
      dueDate: applyDate,
      ...calendarMetadata,
      sourceStage: "topdress_water_in"
    },
    {
      title: `Check ${productName} response after 3 days`,
      description:
        "Compare leaf posture, color, moisture, and stress response against the original topdress reason.",
      priority: "medium" as const,
      dueDate: addDays(applyDate, 3),
      ...calendarMetadata,
      sourceStage: "topdress_response_3_day"
    },
    {
      title: `Recheck ${productName} response after 7 days`,
      description: `Review whether the expected ${releaseWindow} is matching plant response, and add photos/notes.`,
      priority: "medium" as const,
      dueDate: addDays(applyDate, 7),
      ...calendarMetadata,
      sourceStage: "topdress_response_7_day"
    },
    {
      title: `Review next re-amend timing for ${productName}`,
      description:
        "Decide whether to re-amend, wait, or adjust based on plant response, harvest window, and release timing.",
      priority: "medium" as const,
      dueDate: addDays(applyDate, 21),
      ...calendarMetadata,
      sourceStage: "topdress_reamend_review"
    }
  ];
}

function buildTopdressAssistantBrief(payload: Record<string, any>) {
  return [
    "AI Topdress Planner brief",
    "",
    "Role: help the user decide whether this topdress plan fits the current grow context, but call the Topdress Planner for final rate, total amount, release window, warnings, ToolRun saving, and follow-up task schedule.",
    `Product/recipe: ${payload.productName || "not set"}`,
    `Stage: ${payload.stage || "not set"}`,
    `Plants: ${payload.plantCount || "-"} plants`,
    `Soil volume: ${payload.soilVolumePerPlant || "-"} ${
      payload.soilVolumeUnit || "units"
    } per plant`,
    `Dose: ${payload.doseRate || "-"} ${payload.doseUnit || "dose units"}`,
    `Release class: ${payload.releaseClass || "unknown"}`,
    `Days until harvest: ${payload.daysUntilHarvest ?? "unknown"}`,
    `Planned apply date: ${payload.plannedApplyDate || "not set"}`,
    "",
    "Explain whether this is too hot, too late, or too slow for the stage, what to watch after watering in, and whether the follow-up tasks should include 3-day, 7-day, and 21-day checks."
  ].join("\n");
}

export default function TopdressToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="topdress-plan"
      toolKey="topdress-plan"
      title="Topdress Planner"
      subtitle="Plan amendment amount by soil volume, stage, and plant count, then create the grow task."
      fields={[
        {
          key: "productName",
          label: "Product or recipe name",
          defaultValue: "Dry amendment blend"
        },
        {
          key: "plantCount",
          label: "Plant count",
          defaultValue: "4",
          keyboardType: "numeric"
        },
        {
          key: "soilVolumePerPlant",
          label: "Soil volume per plant",
          defaultValue: "10",
          keyboardType: "numeric"
        },
        { key: "soilVolumeUnit", label: "Soil volume unit", defaultValue: "gallons" },
        { key: "stage", label: "Stage", defaultValue: "flower" },
        {
          key: "doseRate",
          label: "Dose rate",
          defaultValue: "2",
          keyboardType: "numeric"
        },
        { key: "doseUnit", label: "Dose unit", defaultValue: "tbsp_per_gallon" },
        { key: "releaseClass", label: "Release class", defaultValue: "medium" },
        {
          key: "daysUntilHarvest",
          label: "Days until harvest",
          defaultValue: "42",
          keyboardType: "numeric"
        },
        {
          key: "plannedApplyDate",
          label: "Planned apply date",
          defaultValue: tomorrow(1)
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        productName: values.productName,
        plantCount: n(values.plantCount, 1),
        soilVolumePerPlant: n(values.soilVolumePerPlant, 0),
        soilVolumeUnit: values.soilVolumeUnit,
        stage: values.stage,
        doseRate: n(values.doseRate, 0),
        doseUnit: values.doseUnit,
        releaseClass: values.releaseClass,
        daysUntilHarvest: n(values.daysUntilHarvest),
        plannedApplyDate: values.plannedApplyDate,
        waterInAfterApply: true
      })}
      buildMetrics={(outputs) => [
        {
          key: "per-plant",
          label: "Per plant",
          value: `${outputs.amountPerPlant} ${outputs.amountUnit}`
        },
        {
          key: "total",
          label: "Total",
          value: `${outputs.totalAmount} ${outputs.amountUnit}`
        },
        { key: "plants", label: "Plants", value: String(outputs.plantCount ?? "-") },
        {
          key: "release",
          label: "Release window",
          value: outputs.releaseWindowDays
            ? `${outputs.releaseWindowDays.min}-${outputs.releaseWindowDays.max} days`
            : outputs.expectedReleaseWindow || "-"
        },
        {
          key: "fit",
          label: "Timing fit",
          value: outputs.purposeFit || "-"
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(outputs.timingInterpretation
          ? [
              {
                key: "timing",
                severity: "info" as const,
                message: outputs.timingInterpretation
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) => outputs.taskToCreate?.title || "Topdress planned"}
      defaultTask={(outputs) => ({
        title: outputs.taskToCreate?.title || "Topdress plants",
        description: outputs.logSummary || "Apply planned topdress.",
        priority: outputs.taskToCreate?.priority || "medium",
        dueDate: String(outputs.plannedApplyDate || tomorrow(1)).slice(0, 10),
        allDay: true,
        calendarType: "topdress_followup",
        sourceStage: "topdress_application",
        reminderPlan: {
          channels: ["in_app"],
          reminders: [{ offsetMinutes: -12 * 60 }]
        }
      })}
      assistantBrief={{
        title: "AI-guided, calculator-verified",
        description:
          "Ask AI to help reason through the stage fit, release timing, harvest window, and follow-up checks. The Topdress Planner remains the source of truth for rate math and task dates.",
        buttonLabel: "Ask AI to Build Topdress Plan",
        accessibilityLabel: "Ask AI to build topdress plan",
        briefTitle: "AI topdress plan brief",
        buildBrief: ({ payload }) => buildTopdressAssistantBrief(payload)
      }}
      buildActions={({ outputs, payload, toolRun, plantContext }) => [
        {
          key: "create-topdress-plan-tasks",
          label: "Create Topdress Follow-up Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Created topdress follow-up tasks.",
          disabled: !payload.growId,
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId: payload.growId,
              ...plantContext.toolRunContext,
              toolKey: "topdress-plan",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: topdressTasks(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
