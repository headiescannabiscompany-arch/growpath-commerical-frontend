import React from "react";

import BackendCalculatorToolScreen, { tomorrow } from "@/features/personal/tools/BackendCalculatorToolScreen";

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

export default function LivingSoilBatchToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="living-soil-batch"
      toolKey="living-soil-batch"
      title="Living Soil Labs / Batch Production"
      subtitle="Estimate batch cost, bag count, pull sheet, packaging/labor cost, and margin from saved recipe inputs."
      fields={[
        { key: "recipeId", label: "Recipe ID or name", defaultValue: "Living Soil Base" },
        { key: "batchVolume", label: "Batch volume", defaultValue: "120", keyboardType: "numeric" },
        { key: "bagSize", label: "Bag size", defaultValue: "1.5", keyboardType: "numeric" },
        {
          key: "ingredientCosts",
          label: "Ingredients as lines: name, quantity, unit, cost",
          defaultValue: "Compost, 40, gal, 80\nAeration, 40, gal, 70\nBase peat, 40, gal, 65",
          multiline: true
        },
        { key: "laborCost", label: "Labor cost", defaultValue: "120", keyboardType: "numeric" },
        { key: "packagingCost", label: "Packaging cost", defaultValue: "60", keyboardType: "numeric" },
        { key: "shrinkagePercent", label: "Shrinkage %", defaultValue: "5", keyboardType: "numeric" },
        { key: "targetMarginPercent", label: "Target margin %", defaultValue: "40", keyboardType: "numeric" }
      ]}
      buildPayload={(values, { growId }) => ({
        growId,
        recipeId: values.recipeId,
        batchVolume: values.batchVolume,
        bagSize: values.bagSize,
        ingredientCosts: parseIngredientCosts(values.ingredientCosts),
        laborCost: values.laborCost,
        packagingCost: values.packagingCost,
        shrinkagePercent: values.shrinkagePercent,
        targetMarginPercent: values.targetMarginPercent
      })}
      buildMetrics={(outputs) => [
        { key: "bags", label: "Bag count", value: outputs.bagCount },
        { key: "batchCost", label: "Batch cost", value: outputs.totalBatchCost },
        { key: "costPerBag", label: "Cost / bag", value: outputs.costPerBag },
        { key: "retail", label: "Retail target", value: outputs.retailPriceSuggestion }
      ]}
      defaultLogTitle={(outputs) => `Soil batch plan: ${outputs.recipeId || "recipe"}`}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestion?.title || "Build soil batch",
        priority: outputs.taskSuggestion?.priority || "medium",
        dueDate: tomorrow(outputs.taskSuggestion?.dueInDays || 1),
        description: "Pull ingredients, mix batch, record bag count, update inventory, and log actuals."
      })}
    />
  );
}
