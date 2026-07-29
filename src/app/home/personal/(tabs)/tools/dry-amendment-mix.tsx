import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { createProduct } from "@/api/products";
import { createSoilNutrientBatch } from "@/api/commercialWorkflows";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ingredient(
  name: string,
  amount: string,
  analysis: string,
  releaseClass: string
) {
  const [N = 0, P2O5 = 0, K2O = 0] = analysis
    .split("-")
    .map((part) => Number(part.trim()));
  return {
    name,
    amount: n(amount, 0),
    amountUnit: "grams",
    N,
    P2O5,
    K2O,
    releaseClass,
    analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o"
  };
}

function dryBlendTasks(outputs: Record<string, any>, payload: Record<string, any>) {
  const recipeName = String(
    outputs.recipeName || payload.recipeName || "dry amendment blend"
  );
  const stage = String(payload.desiredStage || "target stage");
  const dose =
    outputs.dosePerCubicFoot || payload.dosePerGallonSoil
      ? ` Dose reference: ${outputs.dosePerCubicFoot ? `${outputs.dosePerCubicFoot} g/ft3` : `${payload.dosePerGallonSoil} g/gal soil`}.`
      : "";
  const calendarMetadata = {
    allDay: true,
    calendarType: "dry_amendment_batch",
    sourceStage: String(payload.desiredStage || outputs.stageFit || "dry_blend"),
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -24 * 60 }]
    }
  };

  return [
    {
      title: `Source ingredients for ${recipeName}`,
      description:
        "Confirm ingredient labels, guaranteed analysis, release class, and enough batch weight before mixing.",
      priority: "medium" as const,
      dueDate: tomorrow(0),
      ...calendarMetadata,
      sourceStage: "dry_blend_ingredient_pull"
    },
    {
      title: `Weigh and mix ${recipeName}`,
      description:
        Array.isArray(payload.ingredients) && payload.ingredients.length
          ? `Weigh: ${payload.ingredients
              .map((row: any) => `${row.name} ${row.amount}${row.amountUnit || "g"}`)
              .join(", ")}. Mix evenly and keep dust controlled.`
          : "Weigh ingredients, mix evenly, and record actual batch weight.",
      priority: "high" as const,
      dueDate: tomorrow(1),
      ...calendarMetadata,
      sourceStage: "dry_blend_mixing"
    },
    {
      title: `Label ${recipeName} batch`,
      description: `Record achieved analysis, stage fit for ${stage}, directions, batch date, and release notes.${dose}`,
      priority: "medium" as const,
      dueDate: tomorrow(1),
      ...calendarMetadata,
      sourceStage: "dry_blend_label_review"
    },
    {
      title: `Review ${recipeName} application result`,
      description:
        "Check plant response after application and compare the release expectation to actual results.",
      priority: "medium" as const,
      dueDate: tomorrow(14),
      ...calendarMetadata,
      sourceStage: "dry_blend_result_review"
    }
  ];
}

function buildDryBlendAssistantBrief(payload: Record<string, any>) {
  const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
  const ingredientLines = ingredients.length
    ? ingredients
        .map(
          (row: any, index: number) =>
            `${index + 1}. ${row.name || "Unnamed"}: ${row.amount || 0} ${
              row.amountUnit || "g"
            }, label ${row.N ?? 0}-${row.P2O5 ?? 0}-${row.K2O ?? 0}, release ${
              row.releaseClass || "unknown"
            }`
        )
        .join("\n")
    : "No ingredient rows entered yet.";

  return [
    "AI Dry Amendment Mix brief",
    "",
    "Role: help the user shape a dry amendment blend conversationally, but call the Dry Amendment Mix Builder for final guaranteed-analysis math, release grouping, warnings, ToolRun saving, batch tasks, and product draft conversion.",
    `Recipe: ${payload.recipeName || "not set"}`,
    `Target stage: ${payload.desiredStage || "not set"}`,
    `Application target: ${payload.dosePerGallonSoil || "-"} g per gallon soil`,
    "Ingredients:",
    ingredientLines,
    "",
    "Explain which ingredient is driving N, P2O5, and K2O, whether the blend is front-loaded or slow-release, what label/package data is still missing, and whether the output should become grow tasks, a facility production batch, or a commercial product draft after user approval."
  ].join("\n");
}

export default function DryAmendmentMixToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="dry-amendment-mix"
      toolKey="dry-amendment-mix"
      title="Dry Amendment Mix Builder"
      subtitle="Blend guaranteed-analysis ingredients, estimate achieved label N-P2O5-K2O, and group release timing."
      fields={[
        { key: "recipeName", label: "Recipe name", defaultValue: "Dry amendment blend" },
        { key: "desiredStage", label: "Desired stage", defaultValue: "veg" },
        { key: "ingredientA", label: "Ingredient A", defaultValue: "Alfalfa meal" },
        {
          key: "amountA",
          label: "Ingredient A grams",
          defaultValue: "500",
          keyboardType: "numeric"
        },
        {
          key: "analysisA",
          label: "Ingredient A guaranteed analysis N-P2O5-K2O",
          defaultValue: "3-1-2"
        },
        { key: "releaseA", label: "Ingredient A release", defaultValue: "medium" },
        { key: "ingredientB", label: "Ingredient B", defaultValue: "Bone meal" },
        {
          key: "amountB",
          label: "Ingredient B grams",
          defaultValue: "500",
          keyboardType: "numeric"
        },
        {
          key: "analysisB",
          label: "Ingredient B guaranteed analysis N-P2O5-K2O",
          defaultValue: "3-15-0"
        },
        { key: "releaseB", label: "Ingredient B release", defaultValue: "slow" },
        { key: "ingredientC", label: "Ingredient C (optional)", defaultValue: "" },
        {
          key: "amountC",
          label: "Ingredient C grams",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "analysisC",
          label: "Ingredient C guaranteed analysis N-P2O5-K2O",
          defaultValue: "0-0-0"
        },
        { key: "releaseC", label: "Ingredient C release", defaultValue: "medium" },
        { key: "ingredientD", label: "Ingredient D (optional)", defaultValue: "" },
        {
          key: "amountD",
          label: "Ingredient D grams",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "analysisD",
          label: "Ingredient D guaranteed analysis N-P2O5-K2O",
          defaultValue: "0-0-0"
        },
        { key: "releaseD", label: "Ingredient D release", defaultValue: "slow" },
        {
          key: "dosePerGallonSoil",
          label: "Dose per gallon soil (grams)",
          defaultValue: "10",
          keyboardType: "numeric"
        },
        {
          key: "packageSizeGrams",
          label: "Package / bag size (grams)",
          defaultValue: "1000",
          keyboardType: "numeric"
        },
        {
          key: "applicationDirections",
          label: "Application directions (optional)",
          defaultValue: ""
        }
      ]}
      buildPayload={(
        values,
        { growId, facilityId, commercialAccountId, plantContext }
      ) => ({
        growId: growId || undefined,
        facilityId: facilityId || undefined,
        commercialAccountId: commercialAccountId || undefined,
        ...plantContext.toolRunContext,
        recipeName: values.recipeName,
        desiredStage: values.desiredStage,
        ingredients: [
          ingredient(
            values.ingredientA,
            values.amountA,
            values.analysisA,
            values.releaseA
          ),
          ingredient(
            values.ingredientB,
            values.amountB,
            values.analysisB,
            values.releaseB
          ),
          ingredient(
            values.ingredientC,
            values.amountC,
            values.analysisC,
            values.releaseC
          ),
          ingredient(
            values.ingredientD,
            values.amountD,
            values.analysisD,
            values.releaseD
          )
        ].filter((row) => row.name.trim() && (row.amount ?? 0) > 0),
        dosePerGallonSoil: n(values.dosePerGallonSoil),
        packageSizeGrams: n(values.packageSizeGrams),
        applicationDirections: values.applicationDirections || undefined
      })}
      buildMetrics={(outputs) => [
        {
          key: "analysis",
          label: "Guaranteed analysis",
          value: `${outputs.totalAnalysis?.N}-${outputs.totalAnalysis?.P2O5}-${outputs.totalAnalysis?.K2O}`
        },
        {
          key: "ratio",
          label: "Achieved ratio",
          value: `${outputs.achievedRatio?.N}:${outputs.achievedRatio?.P}:${outputs.achievedRatio?.K}`
        },
        { key: "batch", label: "Batch weight", value: `${outputs.batchWeight} g` },
        {
          key: "dose",
          label: "Dose / ft3",
          value: `${outputs.dosePerCubicFoot ?? "-"} g`
        },
        {
          key: "stageFit",
          label: "Stage fit",
          value: outputs.stageFit
        },
        {
          key: "packages",
          label: "Packages / bags",
          value: outputs.packageCount ?? "-"
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.stageTimingWarnings)
          ? outputs.stageTimingWarnings.map((message: string, index: number) => ({
              key: `stage-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.compatibilityWarnings)
          ? outputs.compatibilityWarnings.map((message: string, index: number) => ({
              key: `compat-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(outputs.deliveryCurve?.explanation
          ? [
              {
                key: "delivery",
                severity: "info" as const,
                message: outputs.deliveryCurve.explanation
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) =>
        `${outputs.recipeName || "Dry amendment blend"} built`
      }
      defaultTask={(outputs) => ({
        title: `Mix ${outputs.recipeName || "dry amendment blend"}`,
        description: outputs.logSummary || "Mix dry amendment recipe.",
        priority: "medium",
        dueDate: tomorrow(1),
        allDay: true,
        calendarType: "dry_amendment_batch",
        sourceStage: "dry_blend_mixing",
        reminderPlan: {
          channels: ["in_app"],
          reminders: [{ offsetMinutes: -24 * 60 }]
        }
      })}
      assistantBrief={{
        title: "AI-guided, calculator-verified",
        description:
          "Ask AI to help balance the blend, explain which ingredients drive the label analysis, and identify product-label gaps. The Dry Amendment Mix Builder remains the source of truth for label N-P2O5-K2O math, release timing, batch tasks, and product drafts.",
        buttonLabel: "Ask AI to Build Dry Blend",
        accessibilityLabel: "Ask AI to build dry amendment blend",
        briefTitle: "AI dry amendment brief",
        buildBrief: ({ payload }) => buildDryBlendAssistantBrief(payload)
      }}
      buildActions={({ outputs, payload, toolRun }) => [
        {
          key: "create-dry-blend-checklist",
          label: "Create Blend Batch Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Created dry amendment batch tasks.",
          disabled: !payload.growId,
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId: payload.growId,
              toolKey: "dry-amendment-mix",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: dryBlendTasks(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        },
        {
          key: "create-production-batch",
          label: "Create Production Batch",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Created dry amendment production batch.",
          onPress: async () => {
            await createSoilNutrientBatch({
              batchName:
                outputs.recipeName || payload.recipeName || "Dry amendment batch",
              purpose: payload.desiredStage || "general",
              status: "planned",
              facilityId: payload.facilityId || undefined,
              linkedToolRunId: toolRun?.id || toolRun?._id || undefined,
              batchVolume: outputs.batchWeight || undefined,
              batchVolumeUnit: "grams",
              ingredientSummary: (
                outputs.ingredientContributions ||
                payload.ingredients ||
                []
              )
                .map((row: any) => `${row.name}: ${row.amount} ${row.amountUnit || "g"}`)
                .join("; "),
              guaranteedAnalysisNotes: JSON.stringify(
                outputs.totalAnalysis || outputs.guaranteedAnalysis || {}
              ),
              mixingInstructions: outputs.applicationDirections || undefined,
              releaseTimelineNotes: outputs.deliveryCurve?.explanation || undefined,
              notes: [
                outputs.analysisDisclaimer,
                payload.growId ? `Source grow: ${payload.growId}` : ""
              ]
                .filter(Boolean)
                .join("\n")
            });
          }
        },
        {
          key: "convert-product-draft",
          label: "Convert to Product Draft",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Created dry amendment product draft.",
          onPress: async () => {
            const ingredients = Array.isArray(payload.ingredients)
              ? payload.ingredients
              : [];
            await createProduct({
              name:
                outputs.recipeName || payload.recipeName || "Dry amendment blend product",
              category: "dry_amendment",
              shortDescription:
                outputs.stageFit ||
                `Dry amendment blend for ${payload.desiredStage || "target stage"}.`,
              fullDescription: [
                outputs.logSummary || "Draft created from Dry Amendment Mix Builder.",
                outputs.dosePerCubicFoot
                  ? `Suggested rate: ${outputs.dosePerCubicFoot} g per cubic foot.`
                  : payload.dosePerGallonSoil
                    ? `Input rate: ${payload.dosePerGallonSoil} g per gallon soil.`
                    : "",
                outputs.deliveryCurve?.explanation || ""
              ]
                .filter(Boolean)
                .join("\n"),
              status: "draft",
              linkedToolRunId: toolRun?.id || toolRun?._id || null,
              growInterests: ["dry amendments", "living soil", "recipe building"],
              specs: {
                sourceTool: "dry-amendment-mix",
                recipeType: "dry_amendment_blend",
                targetStage: payload.desiredStage,
                ingredients,
                analysisBasis: "label_guaranteed_analysis_n_p2o5_k2o",
                guaranteedAnalysisEstimate: outputs.totalAnalysis || null,
                analysisDisclaimer: outputs.analysisDisclaimer || null,
                ingredientContributions: outputs.ingredientContributions || [],
                achievedRatio: outputs.achievedRatio || null,
                batchWeightGrams: outputs.batchWeight || null,
                packageSizeGrams:
                  outputs.packageSizeGrams || payload.packageSizeGrams || null,
                packageCount: outputs.packageCount || null,
                applicationRate: {
                  dosePerCubicFoot: outputs.dosePerCubicFoot || null,
                  dosePerGallonSoil: payload.dosePerGallonSoil || null
                },
                releaseCurve: outputs.deliveryCurve || outputs.releaseCurve || null,
                directions: [
                  "Confirm each ingredient label and guaranteed analysis before commercial use.",
                  "Mix dry ingredients evenly, label the batch, and record batch/lot details before publishing.",
                  outputs.dosePerCubicFoot
                    ? `Apply around ${outputs.dosePerCubicFoot} g per cubic foot unless the final label directs otherwise.`
                    : "",
                  outputs.applicationDirections || payload.applicationDirections || ""
                ].filter(Boolean),
                warnings: [
                  ...(Array.isArray(outputs.stageTimingWarnings)
                    ? outputs.stageTimingWarnings
                    : []),
                  ...(Array.isArray(outputs.compatibilityWarnings)
                    ? outputs.compatibilityWarnings
                    : []),
                  "Draft product requires image, package size, price, Stripe, stock, label directions, and batch/lot review before publishing."
                ]
              }
            });
          }
        }
      ]}
    />
  );
}
