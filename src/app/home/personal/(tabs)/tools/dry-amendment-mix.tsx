import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ingredient(name: string, amount: string, analysis: string, releaseClass: string) {
  const [N = 0, P2O5 = 0, K2O = 0] = analysis.split("-").map((part) => Number(part.trim()));
  return { name, amount: n(amount, 0), amountUnit: "grams", N, P2O5, K2O, releaseClass };
}

export default function DryAmendmentMixToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="dry-amendment-mix"
      toolKey="dry-amendment-mix"
      title="Dry Amendment Mix Builder"
      subtitle="Blend guaranteed-analysis ingredients, estimate achieved NPK, and group release timing."
      fields={[
        { key: "recipeName", label: "Recipe name", defaultValue: "Dry amendment blend" },
        { key: "ingredientA", label: "Ingredient A", defaultValue: "Alfalfa meal" },
        { key: "amountA", label: "Ingredient A grams", defaultValue: "500", keyboardType: "numeric" },
        { key: "analysisA", label: "Ingredient A N-P-K", defaultValue: "3-1-2" },
        { key: "releaseA", label: "Ingredient A release", defaultValue: "medium" },
        { key: "ingredientB", label: "Ingredient B", defaultValue: "Bone meal" },
        { key: "amountB", label: "Ingredient B grams", defaultValue: "500", keyboardType: "numeric" },
        { key: "analysisB", label: "Ingredient B N-P-K", defaultValue: "3-15-0" },
        { key: "releaseB", label: "Ingredient B release", defaultValue: "slow" },
        { key: "dosePerGallonSoil", label: "Dose per gallon soil (grams)", defaultValue: "10", keyboardType: "numeric" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        recipeName: values.recipeName,
        ingredients: [
          ingredient(values.ingredientA, values.amountA, values.analysisA, values.releaseA),
          ingredient(values.ingredientB, values.amountB, values.analysisB, values.releaseB)
        ],
        dosePerGallonSoil: n(values.dosePerGallonSoil)
      })}
      buildMetrics={(outputs) => [
        { key: "analysis", label: "Guaranteed analysis", value: `${outputs.totalAnalysis?.N}-${outputs.totalAnalysis?.P2O5}-${outputs.totalAnalysis?.K2O}` },
        { key: "ratio", label: "Achieved ratio", value: `${outputs.achievedRatio?.N}:${outputs.achievedRatio?.P}:${outputs.achievedRatio?.K}` },
        { key: "batch", label: "Batch weight", value: `${outputs.batchWeight} g` },
        { key: "dose", label: "Dose / ft3", value: `${outputs.dosePerCubicFoot ?? "-"} g` }
      ]}
      defaultLogTitle={(outputs) => `${outputs.recipeName || "Dry amendment blend"} built`}
      defaultTask={(outputs) => ({
        title: `Mix ${outputs.recipeName || "dry amendment blend"}`,
        description: outputs.logSummary || "Mix dry amendment recipe.",
        priority: "medium",
        dueDate: tomorrow(1)
      })}
    />
  );
}
