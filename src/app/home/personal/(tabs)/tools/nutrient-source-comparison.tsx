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
        { key: "intent", label: "Intent", defaultValue: "fast_correction" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        nutrient: values.nutrient,
        intent: values.intent
      })}
      buildMetrics={(outputs) => [
        { key: "best", label: "Best by intent", value: outputs.bestChoiceByIntent || "-" },
        { key: "fast", label: "Fast sources", value: Array.isArray(outputs.fastSources) ? outputs.fastSources.join(", ") : "-" },
        { key: "medium", label: "Medium sources", value: Array.isArray(outputs.mediumSources) ? outputs.mediumSources.join(", ") : "-" },
        { key: "slow", label: "Slow sources", value: Array.isArray(outputs.slowSources) ? outputs.slowSources.join(", ") : "-" }
      ]}
      defaultLogTitle={(outputs) => `${outputs.nutrient || "Nutrient"} source comparison`}
    />
  );
}
