import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function listSummary(value: unknown) {
  return Array.isArray(value) && value.length ? value.slice(0, 4).join(", ") : "";
}

function parseCandidateSources(value: string) {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line) => {
        const [name, analysis, releaseClass, cost, secondaryNutrients, lotId] = line
          .split(",")
          .map((part) => part.trim());
        if (!name) return null;
        return { name, analysis, releaseClass, cost, secondaryNutrients, lotId };
      })
      .filter(Boolean);
  }
}

function nutrientSourceTaskPlan(outputs: Record<string, any>) {
  const nutrient = String(outputs.nutrient || "nutrient");
  const bestChoice = String(outputs.bestChoiceByIntent || "best-fit source");
  const timingWarnings = listSummary(outputs.timingWarnings);
  const phWarnings = listSummary(outputs.pHEffectWarnings);
  const calendarMetadata = {
    allDay: true,
    calendarType: "nutrient_source_review",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };

  return [
    {
      title: `Review ${nutrient} source choice`,
      priority: timingWarnings || phWarnings ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(1),
      ...calendarMetadata,
      sourceStage: "source_fit_review",
      description: [
        `Best choice by intent: ${bestChoice}.`,
        timingWarnings ? `Timing warnings: ${timingWarnings}` : "",
        phWarnings ? `pH warnings: ${phWarnings}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: `Compare available ${nutrient} inputs`,
      priority: "medium" as const,
      dueDate: tomorrow(2),
      ...calendarMetadata,
      sourceStage: "source_speed_comparison",
      description: [
        listSummary(outputs.fastSources)
          ? `Fast sources: ${listSummary(outputs.fastSources)}`
          : "",
        listSummary(outputs.mediumSources)
          ? `Medium sources: ${listSummary(outputs.mediumSources)}`
          : "",
        listSummary(outputs.slowSources)
          ? `Slow sources: ${listSummary(outputs.slowSources)}`
          : ""
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: `Log ${nutrient} source result after application`,
      priority: "medium" as const,
      dueDate: tomorrow(7),
      ...calendarMetadata,
      sourceStage: "source_application_review",
      description:
        "Record plant response, timing, pH/EC side effects, and whether this source should be reused in future recipes."
    }
  ];
}

export default function NutrientSourceComparisonToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="nutrient-source-comparison"
      toolKey="nutrient-source-comparison"
      title="Nutrient Source Comparison"
      subtitle="Compare source speed, pH effects, secondary nutrients, and poor-fit use cases."
      aiPrefill={{
        buttonLabel: "Fill comparison from ingredient catalog",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill this Nutrient Source Comparison from the selected grow's verified ingredient/product catalog, label photos/extractions, guaranteed analyses, lots, costs, water profile, medium, stage, recipes, prior applications, pH/EC outcomes, and plant response. Return JSON only with exactly these string keys: nutrient, intent, medium, stage, candidateSources, waterContext, comparisonNotes. candidateSources must be a JSON-array string or lines containing name, guaranteed analysis, release class/window, cost, secondary nutrients, and lot ID. Never invent products, analyses, chemical forms, lots, costs, solubility, or release rates. Leave unknowns blank. In comparisonNotes distinguish label N-P2O5-K2O from elemental contribution, fast/medium/slow availability, pH/EC effects, nitrogen/carbon context, mobility, water compatibility, K/Ca/Mg antagonism, timing fit, uncertainty, and whether a lab/label check is still needed.`
      }}
      fields={[
        { key: "nutrient", label: "Nutrient", defaultValue: "calcium" },
        { key: "intent", label: "Intent", defaultValue: "fast_correction" },
        { key: "medium", label: "Medium", defaultValue: "living_soil" },
        { key: "stage", label: "Stage", defaultValue: "veg" },
        {
          key: "candidateSources",
          label:
            "Candidate sources: name, analysis, release, cost, secondary nutrients, lot ID",
          defaultValue: "",
          multiline: true
        },
        {
          key: "waterContext",
          label: "Water profile / alkalinity context (optional)",
          defaultValue: "",
          multiline: true
        },
        {
          key: "comparisonNotes",
          label: "Evidence and comparison questions (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        nutrient: values.nutrient,
        intent: values.intent,
        medium: values.medium,
        stage: values.stage,
        candidateSources: parseCandidateSources(values.candidateSources),
        waterContext: values.waterContext || undefined,
        comparisonNotes: values.comparisonNotes || undefined
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
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-source-comparison-tasks",
          label: "Create Source Review Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created source review tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "nutrient-source-comparison",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: nutrientSourceTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
