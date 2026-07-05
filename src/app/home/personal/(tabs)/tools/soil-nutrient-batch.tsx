import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

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
    />
  );
}
