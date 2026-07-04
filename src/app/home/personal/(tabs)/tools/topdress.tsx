import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
        dueDate: String(outputs.plannedApplyDate || tomorrow(1)).slice(0, 10)
      })}
    />
  );
}
