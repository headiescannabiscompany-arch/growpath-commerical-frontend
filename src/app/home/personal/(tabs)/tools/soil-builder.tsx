import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { createProduct } from "@/api/products";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function amendment(
  name: string,
  dose: string,
  doseUnit: string,
  releaseClass: string,
  analysis: string
) {
  const [N = 0, P2O5 = 0, K2O = 0] = analysis
    .split("-")
    .map((part) => Number(part.trim()));
  return {
    name,
    doseRate: n(dose, 0),
    doseUnit,
    releaseClass,
    guaranteedAnalysis: { N, P2O5, K2O }
  };
}

export default function SoilBuilderToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="soil-builder"
      toolKey="soil-builder"
      title="Soil Builder"
      subtitle="Build full soil recipes with base media, compost uncertainty, amendments, release timing, and rest/cook planning."
      fields={[
        { key: "mixName", label: "Mix name", defaultValue: "Living soil mix" },
        { key: "goal", label: "Goal", defaultValue: "medium veg soil" },
        {
          key: "targetNpk",
          label: "Target N-P-K",
          defaultValue: "3-1-1"
        },
        {
          key: "targetReleaseCurve",
          label: "Target release curve",
          defaultValue: "1-1-1 slow base plus faster nitrogen"
        },
        { key: "intendedUse", label: "Intended use", defaultValue: "veg" },
        { key: "stage", label: "Stage", defaultValue: "veg" },
        {
          key: "totalVolume",
          label: "Total volume",
          defaultValue: "30",
          keyboardType: "numeric"
        },
        { key: "volumeUnit", label: "Volume unit", defaultValue: "gallons" },
        { key: "baseMedia", label: "Base media", defaultValue: "peat/coco blend" },
        {
          key: "basePercent",
          label: "Base %",
          defaultValue: "33",
          keyboardType: "numeric"
        },
        {
          key: "compostPercent",
          label: "Compost %",
          defaultValue: "33",
          keyboardType: "numeric"
        },
        {
          key: "aerationPercent",
          label: "Aeration %",
          defaultValue: "34",
          keyboardType: "numeric"
        },
        {
          key: "biocharPercent",
          label: "Biochar %",
          defaultValue: "0",
          keyboardType: "numeric"
        },
        {
          key: "compostUncertainty",
          label: "Compost uncertainty",
          defaultValue: "medium - no lab test"
        },
        { key: "amendmentName", label: "Fast amendment", defaultValue: "Alfalfa meal" },
        {
          key: "amendmentDose",
          label: "Fast amendment dose",
          defaultValue: "0.5",
          keyboardType: "numeric"
        },
        {
          key: "amendmentUnit",
          label: "Fast amendment dose unit",
          defaultValue: "cups_per_cubic_foot"
        },
        {
          key: "amendmentAnalysis",
          label: "Fast amendment N-P-K",
          defaultValue: "3-1-2"
        },
        {
          key: "amendmentRelease",
          label: "Fast amendment release",
          defaultValue: "fast"
        },
        {
          key: "amendmentNameB",
          label: "Slow base amendment",
          defaultValue: "Fish bone meal"
        },
        {
          key: "amendmentDoseB",
          label: "Slow base dose",
          defaultValue: "0.5",
          keyboardType: "numeric"
        },
        {
          key: "amendmentUnitB",
          label: "Slow base dose unit",
          defaultValue: "cups_per_cubic_foot"
        },
        {
          key: "amendmentAnalysisB",
          label: "Slow base N-P-K",
          defaultValue: "3-16-0"
        },
        {
          key: "amendmentReleaseB",
          label: "Slow base release",
          defaultValue: "slow"
        },
        {
          key: "mineralSupport",
          label: "Mineral support",
          defaultValue: "gypsum, basalt, oyster shell"
        },
        {
          key: "biologySupport",
          label: "Biology / activation",
          defaultValue: "worm castings, microbial inoculant, moisture activation"
        },
        {
          key: "restCookDays",
          label: "Rest/cook days",
          defaultValue: "21",
          keyboardType: "numeric"
        },
        {
          key: "safetyNotes",
          label: "Assumptions and cautions",
          defaultValue:
            "Compost and castings are estimates unless lab-tested. Avoid hot mixes for seedlings.",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        mixName: values.mixName,
        goal: values.goal,
        targetNpk: values.targetNpk,
        targetReleaseCurve: values.targetReleaseCurve,
        totalVolume: n(values.totalVolume),
        volumeUnit: values.volumeUnit,
        baseMedia: values.baseMedia,
        basePercent: n(values.basePercent),
        compostPercent: n(values.compostPercent),
        aerationPercent: n(values.aerationPercent),
        biocharPercent: n(values.biocharPercent, 0),
        compostUncertainty: values.compostUncertainty,
        amendments: [
          amendment(
            values.amendmentName,
            values.amendmentDose,
            values.amendmentUnit,
            values.amendmentRelease,
            values.amendmentAnalysis
          ),
          amendment(
            values.amendmentNameB,
            values.amendmentDoseB,
            values.amendmentUnitB,
            values.amendmentReleaseB,
            values.amendmentAnalysisB
          )
        ].filter((row) => row.name.trim() && row.doseRate > 0),
        mineralSupport: values.mineralSupport,
        biologySupport: values.biologySupport,
        restCookDays: n(values.restCookDays, 21),
        safetyNotes: values.safetyNotes,
        intendedUse: values.intendedUse,
        stage: values.stage
      })}
      buildMetrics={(outputs) => [
        {
          key: "gallons",
          label: "Total gallons",
          value: String(outputs.totalGallons ?? "-")
        },
        {
          key: "ft3",
          label: "Total cubic feet",
          value: String(outputs.totalCubicFeet ?? "-")
        },
        {
          key: "bags",
          label: "Bag count",
          value: String(outputs.bagCountEstimate ?? "-")
        },
        {
          key: "fit",
          label: "Purpose fit",
          value: outputs.purposeFit || "-"
        },
        { key: "recipe", label: "Recipe type", value: outputs.recipe?.recipeType || "-" },
        {
          key: "release",
          label: "Release profile",
          value:
            outputs.releaseCurve?.summary ||
            outputs.deliveryCurve?.explanation ||
            outputs.targetReleaseCurve ||
            "-"
        },
        {
          key: "ready",
          label: "Ready / cook time",
          value: outputs.readyDate || `${outputs.restCookDays ?? "-"} days`
        }
      ]}
      buildNotices={(outputs) => [
        {
          key: "soil-estimate",
          severity: "info" as const,
          message:
            "Soil nutrient availability is an estimate until lab-tested; compost/castings add uncertainty."
        },
        ...(Array.isArray(outputs.stageTimingWarnings)
          ? outputs.stageTimingWarnings.map((message: string, index: number) => ({
              key: `stage-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.sourceConfidenceWarnings)
          ? outputs.sourceConfidenceWarnings.map((message: string, index: number) => ({
              key: `source-${index}`,
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
          : [])
      ]}
      defaultLogTitle={(outputs) => `${outputs.mixName || "Soil mix"} planned`}
      defaultTask={(outputs) => ({
        title: `Mix ${outputs.mixName || "soil"}`,
        description: Array.isArray(outputs.mixingInstructions)
          ? outputs.mixingInstructions.join(" ")
          : `Mix soil recipe, moisten, activate biology, and rest/cook for ${outputs.restCookDays ?? 21} days before use when appropriate.`,
        priority: "medium",
        dueDate: tomorrow(1)
      })}
      buildActions={({ outputs, payload, toolRun }) => [
        {
          key: "convert-product-draft",
          label: "Convert to Product Draft",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Created commercial product draft.",
          onPress: async () => {
            await createProduct({
              name: outputs.mixName || payload.mixName || "Soil recipe product",
              category: "soil_mix",
              shortDescription:
                outputs.purposeFit ||
                payload.goal ||
                "Soil recipe created from Soil Builder.",
              fullDescription: Array.isArray(outputs.mixingInstructions)
                ? outputs.mixingInstructions.join("\n")
                : payload.safetyNotes ||
                  "Draft product created from a saved soil recipe.",
              status: "draft",
              linkedToolRunId: toolRun?.id || toolRun?._id || null,
              growInterests: ["living soil", "soil builder", "dry amendments"],
              specs: {
                sourceTool: "soil-builder",
                recipe: outputs.recipe || null,
                targetNpk: payload.targetNpk,
                estimatedNpk: outputs.estimatedNpk || outputs.guaranteedAnalysis || null,
                guaranteedAnalysisEstimate:
                  outputs.guaranteedAnalysis ||
                  outputs.guaranteedAnalysisEstimate ||
                  null,
                ingredients: payload.amendments,
                baseMix: {
                  baseMedia: payload.baseMedia,
                  basePercent: payload.basePercent,
                  compostPercent: payload.compostPercent,
                  aerationPercent: payload.aerationPercent,
                  biocharPercent: payload.biocharPercent
                },
                directions: Array.isArray(outputs.mixingInstructions)
                  ? outputs.mixingInstructions
                  : [],
                applicationRate: outputs.applicationRate || null,
                releaseCurve: outputs.releaseCurve || outputs.deliveryCurve || null,
                restCookDays: outputs.restCookDays ?? payload.restCookDays,
                readyDate: outputs.readyDate || null,
                compostUncertainty: payload.compostUncertainty,
                mineralSupport: payload.mineralSupport,
                biologySupport: payload.biologySupport,
                warnings: [
                  payload.safetyNotes,
                  ...(Array.isArray(outputs.stageTimingWarnings)
                    ? outputs.stageTimingWarnings
                    : []),
                  ...(Array.isArray(outputs.sourceConfidenceWarnings)
                    ? outputs.sourceConfidenceWarnings
                    : []),
                  ...(Array.isArray(outputs.compatibilityWarnings)
                    ? outputs.compatibilityWarnings
                    : [])
                ].filter(Boolean)
              }
            });
          }
        }
      ]}
    />
  );
}
