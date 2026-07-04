import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function SoilBuilderToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="soil-builder"
      toolKey="soil-builder"
      title="Soil Builder"
      subtitle="Build base, compost, aeration, amendment, and mineral amounts from total soil volume."
      fields={[
        { key: "mixName", label: "Mix name", defaultValue: "Living soil mix" },
        { key: "intendedUse", label: "Intended use", defaultValue: "veg" },
        { key: "stage", label: "Stage", defaultValue: "veg" },
        {
          key: "totalVolume",
          label: "Total volume",
          defaultValue: "30",
          keyboardType: "numeric"
        },
        { key: "volumeUnit", label: "Volume unit", defaultValue: "gallons" },
        {
          key: "basePercent",
          label: "Base %",
          defaultValue: "33",
          keyboardType: "numeric"
        },
        {
          key: "compostPercent",
          label: "Compost %",
          defaultValue: "33",
          keyboardType: "numeric"
        },
        {
          key: "aerationPercent",
          label: "Aeration %",
          defaultValue: "34",
          keyboardType: "numeric"
        },
        { key: "amendmentName", label: "Amendment", defaultValue: "Kelp meal" },
        {
          key: "amendmentDose",
          label: "Amendment dose",
          defaultValue: "0.5",
          keyboardType: "numeric"
        },
        {
          key: "amendmentUnit",
          label: "Amendment dose unit",
          defaultValue: "cups_per_cubic_foot"
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        mixName: values.mixName,
        totalVolume: n(values.totalVolume),
        volumeUnit: values.volumeUnit,
        basePercent: n(values.basePercent),
        compostPercent: n(values.compostPercent),
        aerationPercent: n(values.aerationPercent),
        amendments: [
          {
            name: values.amendmentName,
            doseRate: n(values.amendmentDose),
            doseUnit: values.amendmentUnit,
            releaseClass: "medium"
          }
        ],
        intendedUse: values.intendedUse,
        stage: values.stage
      })}
      buildMetrics={(outputs) => [
        {
          key: "gallons",
          label: "Total gallons",
          value: String(outputs.totalGallons ?? "-")
        },
        {
          key: "ft3",
          label: "Total cubic feet",
          value: String(outputs.totalCubicFeet ?? "-")
        },
        {
          key: "bags",
          label: "Bag count",
          value: String(outputs.bagCountEstimate ?? "-")
        },
        {
          key: "fit",
          label: "Purpose fit",
          value: outputs.purposeFit || "-"
        },
        { key: "recipe", label: "Recipe type", value: outputs.recipe?.recipeType || "-" }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.stageTimingWarnings)
          ? outputs.stageTimingWarnings.map((message: string, index: number) => ({
              key: `stage-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.sourceConfidenceWarnings)
          ? outputs.sourceConfidenceWarnings.map((message: string, index: number) => ({
              key: `source-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.compatibilityWarnings)
          ? outputs.compatibilityWarnings.map((message: string, index: number) => ({
              key: `compat-${index}`,
              severity: "medium" as const,
              message
            }))
          : [])
      ]}
      defaultLogTitle={(outputs) => `${outputs.mixName || "Soil mix"} planned`}
      defaultTask={(outputs) => ({
        title: `Mix ${outputs.mixName || "soil"}`,
        description: Array.isArray(outputs.mixingInstructions)
          ? outputs.mixingInstructions.join(" ")
          : "Mix soil recipe.",
        priority: "medium",
        dueDate: tomorrow(1)
      })}
    />
  );
}
