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
        const [label, vigor, aroma, resin, stressResistance, yieldScore, notes] = line.split(",").map((part) => part.trim());
        if (!label) return null;
        return { id: `plant_${index + 1}`, label, vigor, aroma, resin, stressResistance, yieldScore, notes };
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
          label: "Plants as lines: label, vigor, aroma, resin, stress, yield, notes",
          defaultValue: "Plant 1, 8, 8, 8, 7, 7, balanced\nPlant 2, 6, 9, 8, 6, 6, sensory lean",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId }) => ({ growId, projectName: values.projectName, plants: parsePlants(values.plants) })}
      buildMetrics={(outputs) => [
        { key: "project", label: "Project", value: outputs.projectName },
        { key: "top", label: "Top plant", value: outputs.comparisonMatrix?.[0]?.label },
        { key: "score", label: "Top score", value: outputs.comparisonMatrix?.[0]?.score },
        { key: "keepers", label: "Keeper candidates", value: outputs.keeperRecommendations?.length || 0 }
      ]}
      defaultLogTitle={(outputs) => `Pheno hunt: ${outputs.projectName || "project"}`}
    />
  );
}
