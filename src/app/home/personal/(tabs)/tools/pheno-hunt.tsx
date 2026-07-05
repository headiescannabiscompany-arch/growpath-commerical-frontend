import React from "react";

import BackendCalculatorToolScreen from "@/features/personal/tools/BackendCalculatorToolScreen";

function parsePlants(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line, index) => {
        const [
          label,
          vigor,
          aroma,
          resin,
          stressResistance,
          yieldScore,
          sexWeek,
          cloneRootingDays,
          recoveryHours,
          notes
        ] = line.split(",").map((part) => part.trim());
        if (!label) return null;
        return {
          id: `plant_${index + 1}`,
          label,
          vigor,
          aroma,
          resin,
          stressResistance,
          yieldScore,
          sexWeek,
          cloneRootingDays,
          recoveryHours,
          notes
        };
      })
      .filter(Boolean);
  }
}

export default function PhenoHuntToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="pheno-hunt"
      toolKey="pheno-hunt"
      title="Pheno Hunting"
      subtitle="Score pheno plants, compare keeper candidates, retest decisions, and breeding notes."
      fields={[
        { key: "projectName", label: "Project name", defaultValue: "Pheno hunt" },
        {
          key: "plants",
          label:
            "Plants as lines: label, vigor, aroma, resin, stress, yield, sex week, clone root days, recovery hours, notes",
          defaultValue:
            "Plant 1, 8, 8, 8, 7, 7, 4, 9, 8, balanced\nPlant 2, 6, 9, 8, 6, 6, 6, 18, 30, sensory lean",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId }) => ({
        growId,
        projectName: values.projectName,
        plants: parsePlants(values.plants)
      })}
      buildMetrics={(outputs) => [
        { key: "project", label: "Project", value: outputs.projectName },
        { key: "top", label: "Top plant", value: outputs.comparisonMatrix?.[0]?.label },
        { key: "score", label: "Top score", value: outputs.comparisonMatrix?.[0]?.score },
        {
          key: "category",
          label: "Top category",
          value: outputs.comparisonMatrix?.[0]?.keeperCategory
        },
        {
          key: "keepers",
          label: "Keeper candidates",
          value: outputs.keeperRecommendations?.length || 0
        },
        {
          key: "retests",
          label: "Retests",
          value: outputs.retestRecommendations?.length || 0
        }
      ]}
      buildNotices={(outputs) => [
        ...(outputs.retestRecommendations?.length
          ? [
              {
                key: "retest",
                severity: "medium" as const,
                message:
                  "Some plants are marked for retest. Confirm with flower, smoke/taste, clone performance, and stability notes before final decisions."
              }
            ]
          : []),
        ...(outputs.comparisonMatrix?.some(
          (plant: any) =>
            Array.isArray(plant.tags) && plant.tags.includes("stability_concern")
        )
          ? [
              {
                key: "stability",
                severity: "high" as const,
                message:
                  "At least one pheno has a stability/intersex concern. Do not mark it as an automatic keeper from score alone."
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) => `Pheno hunt: ${outputs.projectName || "project"}`}
    />
  );
}
