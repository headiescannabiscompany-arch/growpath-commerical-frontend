import React from "react";

import BackendCalculatorToolScreen from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function NutrientSourceComparisonToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="nutrient-source-comparison"
      toolKey="nutrient-source-comparison"
      title="Nutrient Source Comparison"
      subtitle="Compare source speed, pH effects, secondary nutrients, and poor-fit use cases."
      fields={[
        { key: "nutrient", label: "Nutrient", defaultValue: "calcium" },
        { key: "intent", label: "Intent", defaultValue: "fast_correction" },
        { key: "medium", label: "Medium", defaultValue: "living_soil" },
        { key: "stage", label: "Stage", defaultValue: "veg" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        nutrient: values.nutrient,
        intent: values.intent,
        medium: values.medium,
        stage: values.stage
      })}
      buildMetrics={(outputs) => [
        {
          key: "best",
          label: "Best by intent",
          value: outputs.bestChoiceByIntent || "-"
        },
        {
          key: "speed",
          label: "Speed",
          value: outputs.desiredSpeed || "-"
        },
        {
          key: "fast",
          label: "Fast sources",
          value: Array.isArray(outputs.fastSources) ? outputs.fastSources.join(", ") : "-"
        },
        {
          key: "medium",
          label: "Medium sources",
          value: Array.isArray(outputs.mediumSources)
            ? outputs.mediumSources.join(", ")
            : "-"
        },
        {
          key: "slow",
          label: "Slow sources",
          value: Array.isArray(outputs.slowSources) ? outputs.slowSources.join(", ") : "-"
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.intentQuestions)
          ? outputs.intentQuestions.slice(0, 2).map((message: string, index: number) => ({
              key: `intent-${index}`,
              severity: "info" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.timingWarnings)
          ? outputs.timingWarnings.map((message: string, index: number) => ({
              key: `timing-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.pHEffectWarnings)
          ? outputs.pHEffectWarnings.map((message: string, index: number) => ({
              key: `ph-${index}`,
              severity: "medium" as const,
              message
            }))
          : [])
      ]}
      defaultLogTitle={(outputs) => `${outputs.nutrient || "Nutrient"} source comparison`}
    />
  );
}
