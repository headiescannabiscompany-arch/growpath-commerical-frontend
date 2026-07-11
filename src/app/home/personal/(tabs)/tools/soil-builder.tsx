import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { createProduct } from "@/api/products";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

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

const PENNY_SAVER_SOIL_RECIPE = [
  "Penny Saver Soil",
  "",
  "Purpose: lower-cost living soil intended for one or two cycles before being moved into vegetable gardens or landscaping.",
  "",
  "Base: 1/3 coco and peat.",
  "Compost: 1/3 Blue Ribbon Compost, Detroit Worm Castings, and Soil Conditioner.",
  "Aeration: 1/3 total, split 50% perlite and 50% rice hulls.",
  "",
  "Rice hulls provide temporary aeration and slowly decompose over approximately one year while contributing plant-available silica.",
  "",
  "Mineral package: GrowPathAI 3-3-3 cooked amendment plus basalt rock dust during the initial soil build.",
  "",
  "Locked formula rule: this is the recipe. Do not redesign it unless the user explicitly asks for a new formula."
].join("\n");

const SCIENTIFIC_NOTES = [
  "Scientific Notes",
  "",
  "These notes explain why the recipes were designed this way. They are reference material, not instructions to modify the formulas.",
  "",
  "Compost diversity: different compost feedstocks contribute different microbial communities, nutrient profiles, carbon fractions, and decomposition rates. The recipes intentionally combine multiple compost types to diversify biology rather than relying on a single compost source.",
  "",
  "Woody compost: finished woody compost provides slower carbon fractions and supports fungal communities. Immature woody materials should be avoided because they can temporarily immobilize nitrogen while decomposing.",
  "",
  "Rice hulls: rice hulls provide temporary aeration, renewable organic matter, silica, and gradual decomposition. They are excellent for economical soils but are not permanent structural aeration.",
  "",
  "Vermiculite: vermiculite contributes water retention, calcium, magnesium, iron, and cation exchange capacity. It is used because it provides both physical and chemical benefits beyond simple aeration.",
  "",
  "Pumice: pumice provides the most durable long-term pore structure of the aeration materials considered.",
  "",
  "Clay pebbles: expanded clay provides durable structure but creates larger pore spaces and is generally better suited as a component rather than the entire aeration fraction.",
  "",
  "Basalt rock dust: basalt is included as a long-term mineral source and trace element reserve. It is not treated as an immediate fertilizer."
].join("\n");

const NUTRIENT_PHILOSOPHY = [
  "Nutrient Philosophy",
  "",
  "The cooked 3-3-3 amendment is the soil's baseline fertility.",
  "Additional stage-specific amendments steer nutrient availability through the grow.",
  "",
  "The stage recipes are based on long-term mineralization, microbial nutrient cycling, cation exchange, calcium management, potassium mobility, and phosphorus timing.",
  "",
  "They are not intended to mimic soluble fertilizer schedules.",
  "",
  "Instruction to AI: preserve the recipe first. Use this section to explain the design, not to redesign the formula."
].join("\n");

function soilTimelineTasks(outputs: Record<string, any>, payload: Record<string, any>) {
  const mixName = String(outputs.mixName || payload.mixName || "soil recipe");
  const restCookDays = Number(outputs.restCookDays ?? payload.restCookDays ?? 21);
  const cookCheckDay = Math.max(7, Math.floor(restCookDays / 2));
  const readyDay = Math.max(1, restCookDays);
  const calendarMetadata = {
    allDay: true,
    calendarType: "soil_recipe_timeline",
    sourceStage: String(payload.stage || payload.intendedUse || "soil_recipe"),
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -24 * 60 }]
    }
  };

  return [
    {
      title: `Mix ${mixName}`,
      description:
        Array.isArray(outputs.mixingInstructions) && outputs.mixingInstructions.length
          ? outputs.mixingInstructions.join(" ")
          : "Blend base media, compost/castings, aeration, minerals, and amendments.",
      priority: "medium" as const,
      dueDate: tomorrow(0),
      ...calendarMetadata,
      sourceStage: "soil_mix"
    },
    {
      title: `Moisten and activate ${mixName}`,
      description:
        "Moisten evenly, add planned biology/inoculant support, and label the mix date.",
      priority: "medium" as const,
      dueDate: tomorrow(1),
      ...calendarMetadata,
      sourceStage: "soil_activation"
    },
    {
      title: `Check soil cook for ${mixName}`,
      description:
        "Check moisture, temperature, odor, and whether fast nitrogen sources are still too active.",
      priority: "medium" as const,
      dueDate: tomorrow(cookCheckDay),
      ...calendarMetadata,
      sourceStage: "soil_cook_check"
    },
    {
      title: `${mixName} ready/transplant review`,
      description:
        "Review rest/cook readiness before transplant or product batching. Compost/casting values remain estimates unless lab-tested.",
      priority: "high" as const,
      dueDate: tomorrow(readyDay),
      ...calendarMetadata,
      sourceStage: "soil_ready_review"
    }
  ];
}

function buildSoilAssistantBrief(payload: Record<string, any>) {
  const amendments = Array.isArray(payload.amendments) ? payload.amendments : [];
  const amendmentLines = amendments.length
    ? amendments
        .map(
          (row: any, index: number) =>
            `${index + 1}. ${row.name || "Unnamed"}: ${row.doseRate || 0} ${
              row.doseUnit || "unit"
            }, label ${row.guaranteedAnalysis?.N ?? 0}-${
              row.guaranteedAnalysis?.P2O5 ?? 0
            }-${row.guaranteedAnalysis?.K2O ?? 0}, release ${
              row.releaseClass || "unknown"
            }`
        )
        .join("\n")
    : "No amendment rows entered yet.";

  return [
    "AI Soil Builder brief",
    "",
    "Role: help the user design the recipe conversationally, but call the Soil Builder calculator for final nutrient estimates, release chart, warnings, ToolRun saving, tasks, and product draft conversion.",
    `Goal: ${payload.goal || "not set"}`,
    `Stage/use: ${payload.stage || payload.intendedUse || "not set"}`,
    `Target label N-P2O5-K2O: ${payload.targetNpk || "not set"}`,
    `Target release logic: ${payload.targetReleaseCurve || "not set"}`,
    `Batch: ${payload.totalVolume || "-"} ${payload.volumeUnit || ""}`.trim(),
    `Base mix: ${payload.baseMedia || "base media"} with ${payload.basePercent || 0}% base, ${payload.compostPercent || 0}% compost/castings, ${payload.aerationPercent || 0}% aeration, ${payload.biocharPercent || 0}% biochar.`,
    `Compost uncertainty: ${payload.compostUncertainty || "unknown"}`,
    "Amendments:",
    amendmentLines,
    `Mineral support: ${payload.mineralSupport || "none entered"}`,
    `Biology/activation: ${payload.biologySupport || "none entered"}`,
    `Rest/cook time: ${payload.restCookDays || 21} days`,
    `Safety notes: ${payload.safetyNotes || "none"}`,
    "",
    "Locked soil recipe reference:",
    payload.soilRecipeReference || "none entered",
    "",
    "Scientific notes:",
    payload.scientificNotes || "none entered",
    "",
    "Nutrient philosophy:",
    payload.nutrientPhilosophy || "none entered",
    "",
    "Explain tradeoffs like fast nitrogen versus slower base nutrition, compost uncertainty, mineral/biology support, seedling hot-mix risk, and whether this should become grow tasks, a facility batch, or a commercial product draft after user approval.",
    "Do not redesign locked formulas. Treat science notes and nutrient philosophy as explanation/reference material unless the user asks for a new recipe."
  ].join("\n");
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
          label: "Target label N-P2O5-K2O",
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
          label: "Fast amendment label N-P2O5-K2O",
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
          label: "Slow base label N-P2O5-K2O",
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
        },
        {
          key: "soilRecipeReference",
          label: "Locked soil recipe reference",
          defaultValue: PENNY_SAVER_SOIL_RECIPE,
          multiline: true
        },
        {
          key: "scientificNotes",
          label: "Scientific notes",
          defaultValue: SCIENTIFIC_NOTES,
          multiline: true
        },
        {
          key: "nutrientPhilosophy",
          label: "Nutrient philosophy",
          defaultValue: NUTRIENT_PHILOSOPHY,
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
        soilRecipeReference: values.soilRecipeReference,
        scientificNotes: values.scientificNotes,
        nutrientPhilosophy: values.nutrientPhilosophy,
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
        dueDate: tomorrow(1),
        allDay: true,
        calendarType: "soil_recipe_timeline",
        sourceStage: "soil_mix",
        reminderPlan: {
          channels: ["in_app"],
          reminders: [{ offsetMinutes: -24 * 60 }]
        }
      })}
      assistantBrief={{
        title: "AI-guided, calculator-verified",
        description:
          "Ask AI to help shape the soil recipe, collect missing label data, and explain fast/medium/slow release choices. The Soil Builder remains the source of truth for recipe math, warnings, ToolRuns, tasks, and product conversion.",
        buttonLabel: "Ask AI to Build Soil Recipe",
        accessibilityLabel: "Ask AI to build soil recipe",
        briefTitle: "AI soil recipe brief",
        buildBrief: ({ payload }) => buildSoilAssistantBrief(payload)
      }}
      buildActions={({ outputs, payload, toolRun }) => [
        {
          key: "create-recipe-timeline",
          label: "Create Recipe Timeline Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Created soil recipe timeline tasks.",
          disabled: !payload.growId,
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId: payload.growId,
              toolKey: "soil-builder",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: soilTimelineTasks(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        },
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
                estimatedLabelAnalysis:
                  outputs.guaranteedAnalysis ||
                  outputs.guaranteedAnalysisEstimate ||
                  outputs.estimatedNpk ||
                  null,
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
                  : [
                      "Confirm base media, amendment labels, and guaranteed analysis before commercial use.",
                      "Mix evenly, moisten, label the mixed date, and complete rest/cook review before publishing or batching."
                    ],
                applicationRate: outputs.applicationRate || null,
                releaseCurve: outputs.releaseCurve || outputs.deliveryCurve || null,
                restCookDays: outputs.restCookDays ?? payload.restCookDays,
                readyDate: outputs.readyDate || null,
                compostUncertainty: payload.compostUncertainty,
                mineralSupport: payload.mineralSupport,
                biologySupport: payload.biologySupport,
                soilRecipeReference: payload.soilRecipeReference,
                scientificNotes: payload.scientificNotes,
                nutrientPhilosophy: payload.nutrientPhilosophy,
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
                    : []),
                  "Draft product requires image, package size, price, Stripe, stock, label directions, documents, and batch/lot review before publishing."
                ].filter(Boolean)
              }
            });
          }
        }
      ]}
    />
  );
}
