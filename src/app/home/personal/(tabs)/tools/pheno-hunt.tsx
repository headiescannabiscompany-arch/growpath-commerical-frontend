import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

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

function phenoLabel(item: any, fallback: string) {
  return String(item?.label || item?.plantLabel || item?.plantId || item?.id || fallback);
}

function phenoHuntTaskPlan(outputs: Record<string, any>) {
  const keepers = Array.isArray(outputs.keeperRecommendations)
    ? outputs.keeperRecommendations
    : [];
  const retests = Array.isArray(outputs.retestRecommendations)
    ? outputs.retestRecommendations
    : [];
  const topPlant = outputs.comparisonMatrix?.[0];

  const keeperTasks = keepers.slice(0, 3).map((item: any, index: number) => ({
    title: `Preserve keeper candidate ${phenoLabel(item, `#${index + 1}`)}`,
    priority: "high" as const,
    dueDate: tomorrow(1),
    description:
      item?.reason ||
      "Take clone/mother notes, preserve the candidate, and record why it remains in keeper contention."
  }));

  const retestTasks = retests.slice(0, 3).map((item: any, index: number) => ({
    title: `Retest pheno ${phenoLabel(item, `#${index + 1}`)}`,
    priority: "medium" as const,
    dueDate: tomorrow(3),
    description:
      item?.reason ||
      "Recheck stability, stress response, flower quality, clone performance, and keeper/reject reasoning before final selection."
  }));

  return [
    ...keeperTasks,
    ...retestTasks,
    {
      title: "Record pheno hunt decision notes",
      priority: "medium" as const,
      dueDate: tomorrow(7),
      description: [
        topPlant ? `Top scored plant: ${phenoLabel(topPlant, "top plant")}.` : "",
        "Update keeper/watch/reject reasoning with smoke, hash, taste, structure, and stress notes."
      ]
        .filter(Boolean)
        .join("\n")
    }
  ];
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
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-pheno-hunt-tasks",
          label: "Create Pheno Decision Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId || phenoHuntTaskPlan(outputs).length === 0,
          successMessage: "Created pheno decision tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "pheno-hunt",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: phenoHuntTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
