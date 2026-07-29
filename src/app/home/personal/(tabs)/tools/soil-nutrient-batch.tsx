import React from "react";
import { Redirect } from "expo-router";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { createCommercialTask, createSoilNutrientBatch } from "@/api/commercialWorkflows";

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function optionalNumber(value: unknown) {
  if (value == null || String(value).trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
          category,
          lotId,
          inventoryItemId,
          availableQuantity,
          availableUnit
        ] = line.split(",").map((part) => part.trim());
        if (!name) return null;
        return {
          name,
          quantity: optionalNumber(quantity),
          amount: optionalNumber(quantity),
          unit: unit || undefined,
          cost: optionalNumber(cost),
          N: optionalNumber(N),
          P2O5: optionalNumber(P2O5),
          K2O: optionalNumber(K2O),
          releaseClass: releaseClass || undefined,
          sourceConfidence: sourceConfidence || undefined,
          category: category || undefined,
          lotId: lotId || undefined,
          inventoryItemId: inventoryItemId || undefined,
          availableQuantity: optionalNumber(availableQuantity),
          availableUnit: availableUnit || undefined
        };
      })
      .filter(Boolean);
  }
}

function soilBatchTaskPlan(outputs: Record<string, any>) {
  const suggested = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  const calendarMetadata = {
    allDay: true,
    calendarType: "soil_nutrient_batch",
    sourceStage: String(outputs.purpose || outputs.stage || "production_batch"),
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -24 * 60 }]
    }
  };
  if (suggested.length) {
    return suggested.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `Soil batch follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueAt: tomorrow(Number(task?.dueInDays ?? index + 1)),
      ...calendarMetadata,
      description:
        task?.description ||
        "Complete the soil batch step and save actual quantities, lot notes, photos, and QA findings."
    }));
  }

  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  const hasWarnings = warnings.length > 0 || outputs.purposeFit === "poor";
  const warningPriority: "medium" | "high" = hasWarnings ? "high" : "medium";
  const recipe = outputs.recipeId || "soil batch";
  const bagCount = outputs.bagCount ? ` Target bag count: ${outputs.bagCount}.` : "";

  return [
    {
      title: `Pull ingredients for ${recipe}`,
      priority: "medium" as const,
      dueAt: tomorrow(1),
      ...calendarMetadata,
      sourceStage: "ingredient_pull",
      description:
        "Confirm ingredient lots, quantities, guaranteed analysis, costs, and substitutions before mixing."
    },
    {
      title: `Mix and record ${recipe} actuals`,
      priority: warningPriority,
      dueAt: tomorrow(2),
      ...calendarMetadata,
      sourceStage: "batch_mixing_actuals",
      description: `Mix the batch, record actual weights/volumes, moisture activation, shrinkage, photos, and operator notes.${bagCount}`
    },
    {
      title: "QA soil batch label and release notes",
      priority: warningPriority,
      dueAt: tomorrow(3),
      ...calendarMetadata,
      sourceStage: "batch_qa_label_review",
      description:
        "Review label N-P2O5-K2O estimate, release timing, stage fit, warnings, directions, application rate, and required COA/SDS or lab documents."
    },
    {
      title: "Update inventory or product draft",
      priority: "medium" as const,
      dueAt: tomorrow(4),
      ...calendarMetadata,
      sourceStage: "batch_inventory_product_update",
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
            `${index + 1}. ${row.name || "Unnamed"}: ${row.quantity ?? row.amount ?? "unknown"} ${
              row.unit || "unknown unit"
            }, cost ${row.cost ?? "unknown"}, label ${row.N ?? "unknown"}-${row.P2O5 ?? "unknown"}-${
              row.K2O ?? "unknown"
            }, release ${row.releaseClass || "unknown"}, confidence ${
              row.sourceConfidence || "unknown"
            }`
        )
        .join("\n")
    : "No ingredient rows entered yet.";

  return [
    "AI Soil & Nutrient Batch brief",
    "",
    "Role: help the user scale the recipe into a production batch, but call the Soil & Nutrient Batch Planner for final bag count, label N-P2O5-K2O guaranteed-analysis estimate, costs, warnings, ToolRun saving, and production task plan.",
    `Purpose/stage: ${payload.purpose || "not set"} / ${payload.stage || "not set"}`,
    `Recipe: ${payload.recipeId || "not set"}`,
    `Batch volume: ${payload.batchVolume || "-"} with ${payload.bagSize || "-"} bag size`,
    `Labor cost: ${payload.laborCost ?? "unknown"}`,
    `Packaging cost: ${payload.packagingCost ?? "unknown"}`,
    `Shrinkage: ${payload.shrinkagePercent ?? "unknown"}%`,
    `Target margin: ${payload.targetMarginPercent ?? "unknown"}%`,
    "Ingredients:",
    ingredientLines,
    "",
    "Explain ingredient pull-list risk, QA/label needs, batch/lot documentation, whether the mix is too hot for the purpose, and whether the result should update grow notes, facility production records, or a commercial product draft after user approval."
  ].join("\n");
}

export function CommercialSoilNutrientBatchToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="soil-nutrient-batch"
      toolKey="soil-nutrient-batch"
      title="Soil & Nutrient Batch Planner"
      subtitle="Scale a purpose-built soil, dry amendment, or nutrient batch while checking guaranteed analysis, release timing, stage fit, cost, warnings, and tasks."
      growOptional
      noGrowContextMessage="A grow is optional. The reviewed result can be saved as a Commercial production batch without changing inventory."
      backFallbackHref="/home/commercial/tools"
      feedRouteKey="commercial_tool_soil_nutrient_batch"
      experienceMessage="Deterministic production math uses only the values you enter. Missing label, cost, shrinkage, and inventory evidence stays visibly unknown. No AI credits are used to calculate the batch."
      aiPrefill={{
        buttonLabel: "Fill batch from recipe and inventory",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill this Soil & Nutrient Batch Plan from saved recipes, verified ingredient/product catalog, label analyses, inventory lots and costs, crop and medium context, prior batch actuals, packaging, labor, QA outcomes, and commercial/facility production records available to this workspace. Return JSON only with exactly these string keys: batchName, purpose, stage, medium, growStyle, plantCount, recipeId, batchVolume, batchVolumeUnit, bagSize, ingredients, laborCost, packagingCost, shrinkagePercent, targetMarginPercent, measuredFinishedEc, maximumAcceptableEc, batchNotes. ingredients must be a JSON-array string or lines containing name, quantity, unit, cost, N, P2O5, K2O, releaseClass, sourceConfidence, category, lotId, inventoryItemId, availableQuantity, availableUnit. Never invent analysis, lot, quantity, cost, margin, density, or inventory. Preserve label N-P2O5-K2O separately from elemental conversions. Leave unknowns blank. In batchNotes identify missing labels/COAs, compost uncertainty, release timing, K/Ca/Mg antagonism, water context, substitutions, production scope, and QA checks.`
      }}
      fields={[
        {
          key: "batchName",
          label: "Production batch name",
          defaultValue: "",
          placeholder: "Required: a traceable batch name",
          required: true,
          section: "Batch identity"
        },
        {
          key: "purpose",
          label: "Purpose",
          defaultValue: "",
          placeholder: "Seedling mix, transplant blend, topdress...",
          required: true,
          section: "Batch identity"
        },
        {
          key: "stage",
          label: "Crop stage",
          defaultValue: "",
          section: "Batch identity"
        },
        { key: "medium", label: "Medium", defaultValue: "", section: "Batch identity" },
        {
          key: "growStyle",
          label: "Grow style",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "plantCount",
          label: "Plant count (optional)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Batch identity"
        },
        {
          key: "recipeId",
          label: "Recipe ID or version",
          defaultValue: "",
          section: "Batch identity"
        },
        {
          key: "batchVolume",
          label: "Batch volume",
          defaultValue: "",
          keyboardType: "numeric",
          required: true,
          section: "Yield and packaging"
        },
        {
          key: "batchVolumeUnit",
          label: "Batch and bag volume unit",
          defaultValue: "",
          placeholder: "gal, cu ft, L...",
          required: true,
          section: "Yield and packaging"
        },
        {
          key: "bagSize",
          label: "Bag size",
          defaultValue: "",
          keyboardType: "numeric",
          required: true,
          section: "Yield and packaging"
        },
        {
          key: "ingredients",
          label:
            "Ingredients: name, quantity, unit, cost, N, P2O5, K2O, release, confidence, category, lot, inventory ID, available quantity, available unit",
          defaultValue: "",
          placeholder:
            "One ingredient per line. Leave unknown columns blank; they will not become zero.",
          helpText:
            "Use one compatible quantity unit when you want a blended label estimate. Inventory availability is reviewed only and is never decremented here.",
          multiline: true,
          required: true,
          section: "Ingredient pull sheet"
        },
        {
          key: "laborCost",
          label: "Labor cost",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Cost and margin"
        },
        {
          key: "packagingCost",
          label: "Packaging cost",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Cost and margin"
        },
        {
          key: "shrinkagePercent",
          label: "Shrinkage %",
          defaultValue: "",
          keyboardType: "numeric",
          helpText:
            "Leave blank when unknown; saleable yield and bag count will remain unknown.",
          section: "Yield and packaging"
        },
        {
          key: "targetMarginPercent",
          label: "Target margin %",
          defaultValue: "",
          keyboardType: "numeric",
          section: "Cost and margin"
        },
        {
          key: "measuredFinishedEc",
          label: "Measured finished EC (optional)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "QA evidence"
        },
        {
          key: "maximumAcceptableEc",
          label: "Your maximum acceptable EC (optional)",
          defaultValue: "",
          keyboardType: "numeric",
          section: "QA evidence"
        },
        {
          key: "batchNotes",
          label: "Batch evidence, substitutions, and QA notes (optional)",
          defaultValue: "",
          multiline: true,
          section: "QA evidence"
        }
      ]}
      validateValues={(values) => {
        if (!values.batchName.trim()) return "Enter a traceable production batch name.";
        if (!values.purpose.trim()) return "Enter the intended purpose.";
        if (!optionalNumber(values.batchVolume) || Number(values.batchVolume) <= 0)
          return "Batch volume must be greater than zero.";
        if (!values.batchVolumeUnit.trim()) return "Enter the batch and bag volume unit.";
        if (!optionalNumber(values.bagSize) || Number(values.bagSize) <= 0)
          return "Bag size must be greater than zero.";
        if (!parseIngredients(values.ingredients).length)
          return "Enter at least one ingredient.";
        return null;
      }}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        batchName: values.batchName.trim(),
        purpose: values.purpose,
        stage: values.stage,
        medium: values.medium || undefined,
        growStyle: values.growStyle || undefined,
        plantCount: optionalNumber(values.plantCount),
        recipeId: values.recipeId,
        batchVolume: optionalNumber(values.batchVolume),
        batchVolumeUnit: values.batchVolumeUnit,
        bagSize: optionalNumber(values.bagSize),
        ingredients: parseIngredients(values.ingredients),
        laborCost: optionalNumber(values.laborCost),
        packagingCost: optionalNumber(values.packagingCost),
        shrinkagePercent: optionalNumber(values.shrinkagePercent),
        targetMarginPercent: optionalNumber(values.targetMarginPercent),
        measuredFinishedEc: optionalNumber(values.measuredFinishedEc),
        maximumAcceptableEc: optionalNumber(values.maximumAcceptableEc),
        batchNotes: values.batchNotes || undefined
      })}
      buildMetrics={(outputs) => [
        { key: "purpose", label: "Purpose", value: outputs.purpose },
        { key: "fit", label: "Purpose fit", value: outputs.purposeFit },
        { key: "bags", label: "Bag count", value: outputs.bagCount ?? "Unknown" },
        {
          key: "analysisStatus",
          label: "Label estimate",
          value: outputs.guaranteedAnalysisEstimate?.status || "Unknown"
        },
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
        {
          key: "costPerBag",
          label: "Cost / bag",
          value: outputs.costPerBag ?? "Unknown"
        },
        {
          key: "inventoryShortages",
          label: "Inventory shortages",
          value: Array.isArray(outputs.inventoryShortages)
            ? outputs.inventoryShortages.length
            : "Unknown"
        },
        { key: "aiCredits", label: "AI credits used", value: outputs.aiCreditsUsed ?? 0 }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.warnings) ? outputs.warnings : []).map(
          (message: string, index: number) => ({
            key: `warning-${index}`,
            severity: "high" as const,
            message
          })
        ),
        ...(Array.isArray(outputs.missingInformation) ? outputs.missingInformation : [])
          .slice(0, 8)
          .map((message: string, index: number) => ({
            key: `missing-${index}`,
            severity: "medium" as const,
            message,
            remediation: "Add verified evidence or leave this value explicitly unknown."
          }))
      ]}
      defaultLogTitle={(outputs) =>
        `Soil batch plan: ${outputs.batchName || outputs.recipeId || "batch"}`
      }
      assistantBrief={{
        title: "AI-guided, calculator-verified",
        description:
          "Ask AI to help scale the recipe into a production workflow, pull list, QA checklist, or commercial/facility handoff. The batch planner remains the source of truth for bag count, label N-P2O5-K2O analysis, costs, warnings, and tasks.",
        buttonLabel: "Ask AI to Plan Batch",
        accessibilityLabel: "Ask AI to plan soil nutrient batch",
        briefTitle: "AI soil batch brief",
        buildBrief: ({ payload }) => buildSoilBatchAssistantBrief(payload)
      }}
      buildActions={({ outputs, payload, toolRun }) => [
        {
          key: "save-commercial-production-batch",
          label: "Save Production Batch & Tasks",
          variant: "primary",
          pendingLabel: "Saving batch...",
          successMessage:
            "Saved the production batch and its reviewed Commercial task plan. Inventory was not changed.",
          onPress: async () => {
            const linkedToolRunId = String(toolRun?.id || toolRun?._id || "");
            const savedBatch = await createSoilNutrientBatch({
              batchName: payload.batchName,
              name: payload.batchName,
              purpose: payload.purpose,
              linkedToolRunId,
              toolRunId: linkedToolRunId,
              linkedRecipeId: payload.recipeId || undefined,
              batchVolume: payload.batchVolume,
              batchVolumeUnit: payload.batchVolumeUnit,
              bagSize: payload.bagSize,
              bagCount: outputs.bagCount,
              usableVolume: outputs.usableVolume,
              estimatedCost: outputs.costEstimate?.totalCost ?? undefined,
              costPerUnit: outputs.costPerBag ?? undefined,
              costEstimate: outputs.costEstimate,
              guaranteedAnalysisEstimate: outputs.guaranteedAnalysisEstimate,
              elementalEstimate: outputs.elementalEstimate,
              releaseTimeline: outputs.releaseTimeline,
              ingredientPullSheet: outputs.ingredientPullSheet,
              inventoryReview: outputs.inventoryReview,
              warnings: outputs.warnings,
              missingInformation: outputs.missingInformation,
              limitations: outputs.limitations,
              calculatorInput: payload,
              calculatorOutput: outputs,
              ingredientSummary: `${outputs.ingredientPullSheet?.length || 0} ingredient pull(s)`,
              mixingInstructions: Array.isArray(outputs.mixingSheet)
                ? outputs.mixingSheet.join("\n")
                : "",
              notes: payload.batchNotes || "",
              status: "planned"
            });
            const savedBatchId = String(savedBatch?.id || savedBatch?._id || "");
            if (!savedBatchId) throw new Error("The production batch was not returned.");
            await Promise.all(
              soilBatchTaskPlan(outputs).map((task) =>
                createCommercialTask({
                  ...task,
                  priority: task.priority === "medium" ? "normal" : task.priority,
                  sourceType: "product_batch",
                  sourceId: savedBatchId,
                  linkedProductBatchId: savedBatchId,
                  linkedToolRunId,
                  status: "open"
                })
              )
            );
          }
        }
      ]}
    />
  );
}

export default function LegacyPersonalSoilNutrientBatchRoute() {
  return <Redirect href="/home/commercial/tools/soil-nutrient-batch" />;
}
