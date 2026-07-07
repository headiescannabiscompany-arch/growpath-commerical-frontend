import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function parseIngredientCosts(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line) => {
        const [name, quantity, unit, cost] = line.split(",").map((part) => part.trim());
        if (!name) return null;
        return { name, quantity: Number(quantity || 0), unit, cost: Number(cost || 0) };
      })
      .filter(Boolean);
  }
}

function parseIngredients(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split("\n")
      .map((line) => {
        const [
          name,
          quantity,
          unit,
          cost,
          N,
          P2O5,
          K2O,
          releaseClass,
          sourceConfidence,
          category
        ] = line.split(",").map((part) => part.trim());
        if (!name) return null;
        return {
          name,
          quantity: Number(quantity || 0),
          amount: Number(quantity || 0),
          unit,
          cost: Number(cost || 0),
          N: Number(N || 0),
          P2O5: Number(P2O5 || 0),
          K2O: Number(K2O || 0),
          releaseClass: releaseClass || "unknown",
          sourceConfidence: sourceConfidence || "low",
          category: category || undefined
        };
      })
      .filter(Boolean);
  }
}

function soilBatchTaskPlan(outputs: Record<string, any>) {
  const suggested = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  if (suggested.length) {
    return suggested.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `Soil batch follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      description:
        task?.description ||
        "Complete the soil batch step and save actual quantities, lot notes, photos, and QA findings."
    }));
  }

  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  const hasWarnings = warnings.length > 0 || outputs.purposeFit === "poor";
  const recipe = outputs.recipeId || "soil batch";
  const bagCount = outputs.bagCount ? ` Target bag count: ${outputs.bagCount}.` : "";

  return [
    {
      title: `Pull ingredients for ${recipe}`,
      priority: "medium" as const,
      dueDate: tomorrow(1),
      description:
        "Confirm ingredient lots, quantities, guaranteed analysis, costs, and substitutions before mixing."
    },
    {
      title: `Mix and record ${recipe} actuals`,
      priority: hasWarnings ? "high" : ("medium" as const),
      dueDate: tomorrow(2),
      description: `Mix the batch, record actual weights/volumes, moisture activation, shrinkage, photos, and operator notes.${bagCount}`
    },
    {
      title: "QA soil batch label and release notes",
      priority: hasWarnings ? "high" : ("medium" as const),
      dueDate: tomorrow(3),
      description:
        "Review N-P-K estimate, release timing, stage fit, warnings, directions, application rate, and required COA/SDS or lab documents."
    },
    {
      title: "Update inventory or product draft",
      priority: "medium" as const,
      dueDate: tomorrow(4),
      description:
        "Create or update product batch/lot inventory, storefront draft fields, facility production records, or grow recipe notes from this batch plan."
    }
  ];
}

function buildSoilBatchAssistantBrief(payload: Record<string, any>) {
  const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
  const ingredientLines = ingredients.length
    ? ingredients
        .slice(0, 12)
        .map(
          (row: any, index: number) =>
            `${index + 1}. ${row.name || "Unnamed"}: ${row.quantity || row.amount || 0} ${
              row.unit || "units"
            }, cost ${row.cost ?? 0}, label ${row.N ?? 0}-${row.P2O5 ?? 0}-${
              row.K2O ?? 0
            }, release ${row.releaseClass || "unknown"}, confidence ${
              row.sourceConfidence || "unknown"
            }`
        )
        .join("\n")
    : "No ingredient rows entered yet.";

  return [
    "AI Soil & Nutrient Batch brief",
    "",
    "Role: help the user scale the recipe into a production batch, but call the Soil & Nutrient Batch Planner for final bag count, guaranteed-analysis estimate, costs, warnings, ToolRun saving, and production task plan.",
    `Purpose/stage: ${payload.purpose || "not set"} / ${payload.stage || "not set"}`,
    `Recipe: ${payload.recipeId || "not set"}`,
    `Batch volume: ${payload.batchVolume || "-"} with ${payload.bagSize || "-"} bag size`,
    `Labor cost: ${payload.laborCost || 0}`,
    `Packaging cost: ${payload.packagingCost || 0}`,
    `Shrinkage: ${payload.shrinkagePercent || 0}%`,
    `Target margin: ${payload.targetMarginPercent || 0}%`,
    "Ingredients:",
    ingredientLines,
    "",
    "Explain ingredient pull-list risk, QA/label needs, batch/lot documentation, whether the mix is too hot for the purpose, and whether the result should update grow notes, facility production records, or a commercial product draft after user approval."
  ].join("\n");
}

export default function SoilNutrientBatchToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="soil-nutrient-batch"
      toolKey="soil-nutrient-batch"
      title="Soil & Nutrient Batch Planner"
      subtitle="Scale a purpose-built soil, dry amendment, or nutrient batch while checking guaranteed analysis, release timing, stage fit, cost, warnings, and tasks."
      fields={[
        { key: "purpose", label: "Purpose", defaultValue: "seedling" },
        { key: "stage", label: "Crop stage", defaultValue: "seedling" },
        { key: "recipeId", label: "Recipe ID or name", defaultValue: "Base Soil Mix" },
        {
          key: "batchVolume",
          label: "Batch volume",
          defaultValue: "120",
          keyboardType: "numeric"
        },
        {
          key: "bagSize",
          label: "Bag size",
          defaultValue: "1.5",
          keyboardType: "numeric"
        },
        {
          key: "ingredients",
          label:
            "Ingredients as lines: name, quantity, unit, cost, N, P2O5, K2O, releaseClass, confidence, category",
          defaultValue:
            "Compost, 40, gal, 80, 1, 1, 1, slow, low, compost\nFast N meal, 4, lb, 24, 12, 0, 0, fast, medium, dry_amendment\nGypsum, 3, lb, 12, 0, 0, 0, medium, medium, mineral",
          multiline: true
        },
        {
          key: "laborCost",
          label: "Labor cost",
          defaultValue: "120",
          keyboardType: "numeric"
        },
        {
          key: "packagingCost",
          label: "Packaging cost",
          defaultValue: "60",
          keyboardType: "numeric"
        },
        {
          key: "shrinkagePercent",
          label: "Shrinkage %",
          defaultValue: "5",
          keyboardType: "numeric"
        },
        {
          key: "targetMarginPercent",
          label: "Target margin %",
          defaultValue: "40",
          keyboardType: "numeric"
        }
      ]}
      buildPayload={(values, { growId }) => ({
        growId,
        purpose: values.purpose,
        stage: values.stage,
        recipeId: values.recipeId,
        batchVolume: values.batchVolume,
        bagSize: values.bagSize,
        ingredients: parseIngredients(values.ingredients),
        ingredientCosts: parseIngredientCosts(values.ingredients),
        laborCost: values.laborCost,
        packagingCost: values.packagingCost,
        shrinkagePercent: values.shrinkagePercent,
        targetMarginPercent: values.targetMarginPercent
      })}
      buildMetrics={(outputs) => [
        { key: "purpose", label: "Purpose", value: outputs.purpose },
        { key: "fit", label: "Purpose fit", value: outputs.purposeFit },
        { key: "bags", label: "Bag count", value: outputs.bagCount },
        { key: "analysisN", label: "N", value: outputs.guaranteedAnalysisEstimate?.N },
        {
          key: "analysisP",
          label: "P2O5",
          value: outputs.guaranteedAnalysisEstimate?.P2O5
        },
        {
          key: "analysisK",
          label: "K2O",
          value: outputs.guaranteedAnalysisEstimate?.K2O
        },
        { key: "costPerBag", label: "Cost / bag", value: outputs.costPerBag }
      ]}
      defaultLogTitle={(outputs) => `Soil batch plan: ${outputs.recipeId || "recipe"}`}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestion?.title || "Build soil batch",
        priority: outputs.taskSuggestion?.priority || "medium",
        dueDate: tomorrow(outputs.taskSuggestion?.dueInDays || 1),
        description:
          "Pull ingredients, mix batch, record bag count, update inventory, and log actuals."
      })}
      assistantBrief={{
        title: "AI-guided, calculator-verified",
        description:
          "Ask AI to help scale the recipe into a production workflow, pull list, QA checklist, or commercial/facility handoff. The batch planner remains the source of truth for bag count, analysis, costs, warnings, and tasks.",
        buttonLabel: "Ask AI to Plan Batch",
        accessibilityLabel: "Ask AI to plan soil nutrient batch",
        briefTitle: "AI soil batch brief",
        buildBrief: ({ payload }) => buildSoilBatchAssistantBrief(payload)
      }}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-soil-batch-tasks",
          label: "Create Batch Task Plan",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created soil batch tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "soil-nutrient-batch",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: soilBatchTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
