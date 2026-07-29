import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { LockedScreen } from "@/entitlements/LockedScreen";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import MixBuilderScienceBasis from "@/features/personal/tools/MixBuilderScienceBasis";
import { runCalculator, saveToolRunToLog, type ToolRun } from "@/api/toolRuns";
import {
  archiveNutrientRecipe,
  cloneNutrientRecipe,
  createNutrientRecipe,
  listNutrientRecipes,
  recordNutrientRecipeUse,
  reviseNutrientRecipe,
  updateNutrientRecipe,
  type NutrientRecipe
} from "@/api/nutrientRecipes";
import {
  saveToolRunAndCreateTask,
  saveToolRunAndCreateTasks
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  buildNutrientContextAssumption,
  buildNutrientContextNotices
} from "@/features/personal/tools/nutrientContext";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { createProduct } from "@/api/products";
import { radius } from "@/theme/theme";

type ProductRow = {
  id: string;
  name: string;
  amount: string;
  unit: "g" | "ml" | "oz" | "tsp" | "tbsp";
  chemistryKey: string;
  sourceType: "user_entered" | "manufacturer" | "extension_reference" | "lab_tested";
  releaseSpeed: "immediate" | "fast" | "medium" | "slow" | "unknown";
  releaseWindow:
    | "days_0_7"
    | "days_7_21"
    | "days_21_45"
    | "days_45_90"
    | "days_90_plus"
    | "unknown";
  densityGml: string;
  N: string;
  P: string;
  K: string;
  Ca: string;
  Mg: string;
  S: string;
  Fe: string;
  Mn: string;
  Zn: string;
  Cu: string;
  B: string;
  Mo: string;
  Si: string;
};

const chemistryOptions = [
  ["unknown", "Unknown / user-defined"],
  ["water_soluble_nitrate", "Water-soluble nitrate"],
  ["water_soluble_ammonium", "Water-soluble ammonium"],
  ["urea", "Urea nitrogen"],
  ["soluble_phosphate", "Water-soluble phosphate"],
  ["sulfate_salt", "Sulfate salt"],
  ["gypsum", "Gypsum / calcium sulfate"],
  ["carbonate_lime", "Calcitic lime / carbonate"],
  ["dolomitic_lime", "Dolomitic lime"],
  ["organic_protein_meal", "Protein meal / slow organic N"],
  ["organic_meal", "Mixed organic meal"],
  ["bone_meal", "Bone meal / calcium phosphate"],
  ["rock_mineral", "Rock mineral / weathering"],
  ["chelated_micronutrient", "Chelated micronutrient"]
] as const;

const MAX_PRODUCT_ROWS = 20;
const P2O5_TO_ELEMENTAL_P = 0.4364;
const K2O_TO_ELEMENTAL_K = 0.8301;
const TBSP_PER_CUP = 16;

const guaranteedAnalysisLabels: Record<"N" | "P" | "K" | "Ca" | "Mg" | "S", string> = {
  N: "N",
  P: "P2O5",
  K: "K2O",
  Ca: "Ca",
  Mg: "Mg",
  S: "S"
};

type GrowpathAmendmentKey =
  | "alfalfaMeal"
  | "kelpMeal"
  | "boneMeal"
  | "crabMeal"
  | "langbeinite"
  | "dolomiteLime"
  | "gardenGypsum"
  | "greenstone"
  | "rockPhosphate";

type GrowpathAmendmentPreset = {
  key: GrowpathAmendmentKey;
  name: string;
  cupsPerLb: number;
  chemistryKey: ProductRow["chemistryKey"];
  releaseSpeed: ProductRow["releaseSpeed"];
  releaseWindow: ProductRow["releaseWindow"];
  analysis: Partial<Pick<ProductRow, "N" | "P" | "K" | "Ca" | "Mg" | "S" | "Fe" | "Si">>;
};

type StageRecipePreset = {
  key: string;
  label: string;
  name: string;
  stage: string;
  target: { N: string; P: string; K: string };
  actual: string;
  amountsTbsp: Record<GrowpathAmendmentKey, number>;
};

const GROWPATH_AMENDMENTS: Record<GrowpathAmendmentKey, GrowpathAmendmentPreset> = {
  alfalfaMeal: {
    key: "alfalfaMeal",
    name: "Alfalfa Meal",
    cupsPerLb: 4,
    chemistryKey: "organic_protein_meal",
    releaseSpeed: "fast",
    releaseWindow: "days_7_21",
    analysis: { N: "2", P: "0", K: "1" }
  },
  kelpMeal: {
    key: "kelpMeal",
    name: "Kelp Meal",
    cupsPerLb: 3,
    chemistryKey: "organic_meal",
    releaseSpeed: "medium",
    releaseWindow: "days_21_45",
    analysis: { N: "1", P: "0.1", K: "2" }
  },
  boneMeal: {
    key: "boneMeal",
    name: "Bone Meal",
    cupsPerLb: 2,
    chemistryKey: "bone_meal",
    releaseSpeed: "slow",
    releaseWindow: "days_45_90",
    analysis: { N: "3", P: "15", K: "0", Ca: "18" }
  },
  crabMeal: {
    key: "crabMeal",
    name: "Crab Meal",
    cupsPerLb: 4,
    chemistryKey: "organic_protein_meal",
    releaseSpeed: "medium",
    releaseWindow: "days_21_45",
    analysis: { N: "4", P: "3", K: "0", Ca: "14" }
  },
  langbeinite: {
    key: "langbeinite",
    name: "Langbeinite",
    cupsPerLb: 1,
    chemistryKey: "sulfate_salt",
    releaseSpeed: "medium",
    releaseWindow: "days_7_21",
    analysis: { N: "0", P: "0", K: "22", Mg: "10.8", S: "22" }
  },
  dolomiteLime: {
    key: "dolomiteLime",
    name: "Dolomite Lime",
    cupsPerLb: 2,
    chemistryKey: "dolomitic_lime",
    releaseSpeed: "slow",
    releaseWindow: "days_90_plus",
    analysis: { N: "0", P: "0", K: "0", Ca: "23", Mg: "9.5" }
  },
  gardenGypsum: {
    key: "gardenGypsum",
    name: "Garden Gypsum",
    cupsPerLb: 2,
    chemistryKey: "gypsum",
    releaseSpeed: "medium",
    releaseWindow: "days_21_45",
    analysis: { N: "0", P: "0", K: "0", Ca: "21", S: "17" }
  },
  greenstone: {
    key: "greenstone",
    name: "Greenstone",
    cupsPerLb: 1.5,
    chemistryKey: "rock_mineral",
    releaseSpeed: "slow",
    releaseWindow: "days_90_plus",
    analysis: { N: "0", P: "0", K: "0", Ca: "2", Mg: "4", Fe: "4" }
  },
  rockPhosphate: {
    key: "rockPhosphate",
    name: "Rock Phosphate",
    cupsPerLb: 1.5,
    chemistryKey: "rock_mineral",
    releaseSpeed: "slow",
    releaseWindow: "days_90_plus",
    analysis: { N: "0", P: "3", K: "0", Ca: "18" }
  }
};

const GROWPATH_STAGE_RECIPES: StageRecipePreset[] = [
  {
    key: "starter",
    label: "Starter / Cook",
    name: "GrowPath 3-3-3 Starter / Cook",
    stage: "soil_building",
    target: { N: "3", P: "3", K: "3" },
    actual: "~2.9-3.0-2.8",
    amountsTbsp: {
      alfalfaMeal: 22,
      kelpMeal: 12,
      boneMeal: 10.6667,
      crabMeal: 16,
      langbeinite: 3.3333,
      dolomiteLime: 6.6667,
      gardenGypsum: 6.6667,
      greenstone: 2.3333,
      rockPhosphate: 2.3333
    }
  },
  {
    key: "vegetative",
    label: "Vegetative",
    name: "GrowPath 3-1-2 Vegetative",
    stage: "veg",
    target: { N: "3", P: "1", K: "2" },
    actual: "~3.1-0.9-2.1",
    amountsTbsp: {
      alfalfaMeal: 32,
      kelpMeal: 17,
      crabMeal: 19,
      langbeinite: 4,
      boneMeal: 6.6667,
      dolomiteLime: 4.6667,
      gardenGypsum: 4.6667,
      greenstone: 1.3333,
      rockPhosphate: 1.3333
    }
  },
  {
    key: "transition",
    label: "Pre-flower / Transition",
    name: "GrowPath 2-2-3 Pre-flower / Transition",
    stage: "preflower",
    target: { N: "2", P: "2", K: "3" },
    actual: "~2.0-2.1-3.0",
    amountsTbsp: {
      kelpMeal: 19,
      boneMeal: 12,
      langbeinite: 5.3333,
      crabMeal: 16,
      alfalfaMeal: 16,
      dolomiteLime: 4.6667,
      gardenGypsum: 4.6667,
      greenstone: 1.3333,
      rockPhosphate: 1.3333
    }
  },
  {
    key: "flower",
    label: "Flower",
    name: "GrowPath 2-6-4 Flower",
    stage: "flower",
    target: { N: "2", P: "6", K: "4" },
    actual: "~1.9-6.1-3.9",
    amountsTbsp: {
      langbeinite: 8,
      boneMeal: 14,
      kelpMeal: 19,
      rockPhosphate: 2.3333,
      alfalfaMeal: 8.6667,
      crabMeal: 8.6667,
      dolomiteLime: 3,
      gardenGypsum: 3,
      greenstone: 1.3333
    }
  },
  {
    key: "ripen",
    label: "Ripen / Finish",
    name: "GrowPath 0.5-3-3 Ripen / Finish",
    stage: "late_flower",
    target: { N: "0.5", P: "3", K: "3" },
    actual: "~0.55-3.0-3.2",
    amountsTbsp: {
      langbeinite: 10,
      kelpMeal: 19,
      boneMeal: 12,
      rockPhosphate: 2,
      gardenGypsum: 4.6667,
      dolomiteLime: 4.6667,
      greenstone: 2.3333,
      alfalfaMeal: 5.3333,
      crabMeal: 5.3333
    }
  }
];

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function newRow(index: number): ProductRow {
  return {
    id: `${Date.now()}-${index}`,
    name: "",
    amount: "0",
    unit: "g",
    chemistryKey: "unknown",
    sourceType: "user_entered",
    releaseSpeed: "unknown",
    releaseWindow: "unknown",
    densityGml: "1",
    N: "0",
    P: "0",
    K: "0",
    Ca: "0",
    Mg: "0",
    S: "0",
    Fe: "0",
    Mn: "0",
    Zn: "0",
    Cu: "0",
    B: "0",
    Mo: "0",
    Si: "0"
  };
}

function tbspToGrams(tbsp: number, cupsPerLb: number) {
  const lb = tbsp / (TBSP_PER_CUP * cupsPerLb);
  return Number((lb * 453.59237).toFixed(2));
}

function presetRow(key: GrowpathAmendmentKey, tbsp: number, index: number): ProductRow {
  const amendment = GROWPATH_AMENDMENTS[key];
  return {
    ...newRow(index),
    id: `growpath-${key}-${index}-${Date.now()}`,
    name: amendment.name,
    amount: String(tbspToGrams(tbsp, amendment.cupsPerLb)),
    unit: "g",
    chemistryKey: amendment.chemistryKey,
    sourceType: "manufacturer",
    releaseSpeed: amendment.releaseSpeed,
    releaseWindow: amendment.releaseWindow,
    densityGml: String(Number((453.59237 / (amendment.cupsPerLb * 236.588)).toFixed(4))),
    N: amendment.analysis.N || "0",
    P: amendment.analysis.P || "0",
    K: amendment.analysis.K || "0",
    Ca: amendment.analysis.Ca || "0",
    Mg: amendment.analysis.Mg || "0",
    S: amendment.analysis.S || "0",
    Fe: amendment.analysis.Fe || "0",
    Si: amendment.analysis.Si || "0"
  };
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeProductRow(row: ProductRow) {
  const rawDensity = row.densityGml.trim();
  const densityGml = numberValue(row.densityGml);
  const N = numberValue(row.N);
  const P2O5 = numberValue(row.P);
  const K2O = numberValue(row.K);
  const Ca = numberValue(row.Ca);
  const Mg = numberValue(row.Mg);
  const S = numberValue(row.S);
  const Fe = numberValue(row.Fe);
  const Mn = numberValue(row.Mn);
  const Zn = numberValue(row.Zn);
  const Cu = numberValue(row.Cu);
  const B = numberValue(row.B);
  const Mo = numberValue(row.Mo);
  const Si = numberValue(row.Si);

  return {
    ...row,
    amount: numberValue(row.amount),
    densityGml,
    densityAssumption:
      ["ml", "tsp", "tbsp"].includes(row.unit) && (!rawDensity || densityGml === 1)
        ? "Liquid density is assumed at 1 g/ml unless label density is supplied."
        : undefined,
    // P and K stay as label values for backward compatibility with the calculator.
    N,
    P: P2O5,
    K: K2O,
    P2O5,
    K2O,
    elementalP: Number((P2O5 * P2O5_TO_ELEMENTAL_P).toFixed(4)),
    elementalK: Number((K2O * K2O_TO_ELEMENTAL_K).toFixed(4)),
    Ca,
    Mg,
    S,
    Fe,
    Mn,
    Zn,
    Cu,
    B,
    Mo,
    Si,
    guaranteedAnalysis: {
      N,
      P2O5,
      K2O,
      Ca,
      Mg,
      S,
      Fe,
      Mn,
      Zn,
      Cu,
      B,
      Mo,
      Si
    },
    elementalAnalysis: {
      N,
      P: Number((P2O5 * P2O5_TO_ELEMENTAL_P).toFixed(4)),
      K: Number((K2O * K2O_TO_ELEMENTAL_K).toFixed(4)),
      Ca,
      Mg,
      S,
      Fe,
      Mn,
      Zn,
      Cu,
      B,
      Mo,
      Si
    }
  };
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function npkRecipeTasks(args: {
  recipeName: string;
  recipeMode: string;
  stage: string;
  medium: string;
  result: any;
  payload: Record<string, any>;
}) {
  const name = args.recipeName.trim() || "NPK feed recipe";
  const mode = args.recipeMode.replaceAll("_", " ");
  const confidence = args.result?.sourceConfidence?.overall || "unknown";
  const productNames = Array.isArray(args.payload.products)
    ? args.payload.products
        .map((product: any) => product.name)
        .filter(Boolean)
        .join(", ")
    : "";
  const calendarMetadata = {
    allDay: true,
    calendarType: "npk_recipe_followup",
    sourceStage: String(args.stage || args.payload.stage || "nutrient_recipe"),
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };

  return [
    {
      title: `Verify labels for ${name}`,
      description: [
        `Mode: ${mode}. Stage: ${args.stage}. Medium: ${args.medium}.`,
        productNames ? `Ingredients/products: ${productNames}.` : "",
        `Source confidence: ${confidence}. Confirm guaranteed analysis, P2O5/K2O label values, density for liquids, and water baseline before mixing.`
      ]
        .filter(Boolean)
        .join("\n"),
      priority: confidence === "low" ? ("high" as const) : ("medium" as const),
      dueDate: daysFromNow(0),
      ...calendarMetadata,
      sourceStage: "npk_label_verification"
    },
    {
      title: `Mix ${name}`,
      description: [
        args.result?.formula || "Mix the recipe from the calculator output.",
        "Record final EC/pH where relevant and keep this ToolRun linked to the grow history."
      ]
        .filter(Boolean)
        .join("\n"),
      priority: "high" as const,
      dueDate: daysFromNow(1),
      ...calendarMetadata,
      sourceStage: "npk_recipe_mixing"
    },
    {
      title: `Apply ${name}`,
      description:
        "Apply only after label, water, EC/pH, plant stage, and release timing checks are complete.",
      priority: "high" as const,
      dueDate: daysFromNow(1),
      ...calendarMetadata,
      sourceStage: "npk_recipe_application"
    },
    {
      title: `Check response to ${name}`,
      description:
        "Compare plant posture, color, runoff/feed notes, and any stress response against the recipe target.",
      priority: "medium" as const,
      dueDate: daysFromNow(3),
      ...calendarMetadata,
      sourceStage: "npk_recipe_response_check"
    },
    {
      title: `Review next adjustment for ${name}`,
      description:
        "Decide whether to repeat, reduce, increase, or revise the recipe based on measured response and release timing.",
      priority: "medium" as const,
      dueDate: daysFromNow(7),
      ...calendarMetadata,
      sourceStage: "npk_recipe_adjustment_review"
    }
  ];
}

function buildAiRecipeBrief(payload: Record<string, any>) {
  const target = payload.targetNpk || {};
  const products = Array.isArray(payload.products) ? payload.products : [];
  const productLines = products.length
    ? products.map((product: any, index: number) =>
        [
          `${index + 1}. ${product.name || "Unnamed ingredient"}`,
          `${product.amount || 0}${product.unit || ""}`,
          `label ${product.N || 0}-${product.P2O5 || 0}-${product.K2O || 0}`,
          `elemental P ${product.elementalP || 0}`,
          `elemental K ${product.elementalK || 0}`,
          `release ${product.releaseSpeed || "unknown"} / ${product.releaseWindow || "unknown"}`,
          product.densityAssumption
        ]
          .filter(Boolean)
          .join(" | ")
      )
    : ["No ingredients entered yet."];

  return [
    "Help me build this GrowPath NPK / feed recipe conversationally.",
    "Collect missing inputs, explain tradeoffs, and suggest adjustments, but do not invent final math.",
    "Final nutrient totals, elemental P/K conversion, ppm, release timing, ToolRun saving, tasks, and product draft conversion must come from the deterministic NPK calculator.",
    `Recipe: ${payload.name || "unnamed"}`,
    `Mode: ${String(payload.recipeMode || "dose_existing_products").replaceAll("_", " ")}`,
    `Stage: ${payload.stage || "unknown"} | Medium: ${payload.medium || "unknown"} | Batch: ${payload.batchVolume || 0} ${payload.batchUnit || ""}`,
    payload.dryMixWeightLb ? `Dry mix weight: ${payload.dryMixWeightLb} lb` : "",
    `Target label N-P2O5-K2O: ${target.N ?? "-"}-${target.P ?? "-"}-${target.K ?? "-"}`,
    `Desired release profile: ${payload.desiredReleaseProfile || "blended"}`,
    `Water baseline: EC ${payload.waterBaseline?.sourceEC ?? "-"}, pH ${payload.waterBaseline?.sourcePH ?? "-"}, Ca ${payload.waterBaseline?.Ca ?? "-"}, Mg ${payload.waterBaseline?.Mg ?? "-"}`,
    "Ingredients:",
    ...productLines,
    "Ask me for label density, source-water/soil-test data, compost uncertainty, stage constraints, and release timing when missing."
  ].join("\n");
}

export default function NpkToolScreen() {
  const router = useRouter();
  const { growId, plantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_NPK);
  const growContext = coerceParam(growId);
  const plantContext = useToolPlantContext(growContext, coerceParam(plantId));
  const [batchVolume, setBatchVolume] = useState("5");
  const [batchUnit, setBatchUnit] = useState<"gal" | "L">("gal");
  const [stage, setStage] = useState("veg");
  const [medium, setMedium] = useState("soil");
  const [recipeMode, setRecipeMode] = useState("dose_existing_products");
  const [dryMixWeightLb, setDryMixWeightLb] = useState("");
  const [targetN, setTargetN] = useState("");
  const [targetP, setTargetP] = useState("");
  const [targetK, setTargetK] = useState("");
  const [desiredReleaseProfile, setDesiredReleaseProfile] = useState("blended");
  const [recipeName, setRecipeName] = useState("");
  const [savedRecipes, setSavedRecipes] = useState<NutrientRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [daysUntilHarvest, setDaysUntilHarvest] = useState("");
  const [sourceEC, setSourceEC] = useState("");
  const [sourcePH, setSourcePH] = useState("");
  const [alkalinityPpm, setAlkalinityPpm] = useState("");
  const [waterCa, setWaterCa] = useState("");
  const [waterMg, setWaterMg] = useState("");
  const [measuredEC, setMeasuredEC] = useState("");
  const [measuredPH, setMeasuredPH] = useState("");
  const [soilTempC, setSoilTempC] = useState("22");
  const [moisture, setMoisture] = useState("even");
  const [livingSoil, setLivingSoil] = useState(false);
  const [isConcentrate, setIsConcentrate] = useState(false);
  const [rows, setRows] = useState<ProductRow[]>([newRow(0)]);
  const [result, setResult] = useState<any>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);
  const [feedback, setFeedback] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    listNutrientRecipes(growContext || undefined)
      .then(setSavedRecipes)
      .catch(() => setSavedRecipes([]));
  }, [growContext]);

  async function reloadRecipes() {
    setSavedRecipes(await listNutrientRecipes(growContext || undefined));
  }

  function recipePayload() {
    const waterBaseline = {
      sourceEC: sourceEC ? Number(sourceEC) : undefined,
      sourcePH: sourcePH ? Number(sourcePH) : undefined,
      alkalinityPpm: alkalinityPpm ? Number(alkalinityPpm) : undefined,
      Ca: waterCa ? Number(waterCa) : undefined,
      Mg: waterMg ? Number(waterMg) : undefined
    };
    return {
      name: recipeName.trim(),
      growId: growContext || undefined,
      batchVolume: Number(batchVolume),
      batchUnit,
      stage,
      medium,
      recipeMode,
      dryMixWeightLb: dryMixWeightLb ? Number(dryMixWeightLb) : undefined,
      targetNpk: {
        N: targetN ? Number(targetN) : undefined,
        P: targetP ? Number(targetP) : undefined,
        K: targetK ? Number(targetK) : undefined
      },
      desiredReleaseProfile,
      daysUntilHarvest: daysUntilHarvest ? Number(daysUntilHarvest) : undefined,
      isConcentrate,
      measuredEC: measuredEC ? Number(measuredEC) : undefined,
      measuredPH: measuredPH ? Number(measuredPH) : undefined,
      waterBaseline,
      releaseEnvironment: { soilTempC: Number(soilTempC), moisture, livingSoil },
      products: rows
        .filter((row) => row.name.trim() || Number(row.amount) > 0)
        .map(({ id: _id, ...row }) => normalizeProductRow(row as ProductRow))
    };
  }

  function loadRecipe(recipe: NutrientRecipe) {
    setSelectedRecipeId(recipe._id);
    setRecipeName(recipe.name);
    setBatchVolume(String(recipe.batchVolume));
    setBatchUnit(recipe.batchUnit);
    setStage(recipe.stage || "veg");
    setMedium(recipe.medium || "soil");
    setRecipeMode((recipe as any).recipeMode || "dose_existing_products");
    setDryMixWeightLb(String((recipe as any).dryMixWeightLb ?? ""));
    setTargetN(String((recipe as any).targetNpk?.N ?? ""));
    setTargetP(String((recipe as any).targetNpk?.P ?? ""));
    setTargetK(String((recipe as any).targetNpk?.K ?? ""));
    setDesiredReleaseProfile((recipe as any).desiredReleaseProfile || "blended");
    setSourceEC(String(recipe.waterBaseline?.sourceEC ?? ""));
    setSourcePH(String(recipe.waterBaseline?.sourcePH ?? ""));
    setAlkalinityPpm(String(recipe.waterBaseline?.alkalinityPpm ?? ""));
    setWaterCa(String(recipe.waterBaseline?.Ca ?? ""));
    setWaterMg(String(recipe.waterBaseline?.Mg ?? ""));
    setMeasuredEC(String(recipe.measuredEC ?? ""));
    setMeasuredPH(String(recipe.measuredPH ?? ""));
    setSoilTempC(String(recipe.releaseEnvironment?.soilTempC ?? 22));
    setMoisture(String(recipe.releaseEnvironment?.moisture ?? "even"));
    setLivingSoil(Boolean(recipe.releaseEnvironment?.livingSoil));
    setRows(
      (recipe.products || []).map((product, index) => ({
        ...newRow(index),
        ...Object.fromEntries(
          Object.entries(product).map(([key, value]) => [
            key,
            typeof value === "number" ? String(value) : value
          ])
        ),
        id: `${Date.now()}-${index}`
      })) as ProductRow[]
    );
  }

  function loadGrowpathStagePreset(preset: StageRecipePreset) {
    setSelectedRecipeId("");
    setRecipeName(preset.name);
    setRecipeMode("build_dry_blend");
    setStage(preset.stage);
    setMedium("living_soil");
    setTargetN(preset.target.N);
    setTargetP(preset.target.P);
    setTargetK(preset.target.K);
    setDesiredReleaseProfile("blended");
    setBatchVolume("5");
    setBatchUnit("gal");
    setDryMixWeightLb("2");
    setLivingSoil(true);
    setRows(
      Object.entries(preset.amountsTbsp).map(([key, tbsp], index) =>
        presetRow(key as GrowpathAmendmentKey, tbsp, index)
      )
    );
    setResult(null);
    setToolRun(null);
    setFeedback(
      `${preset.label} loaded. Actual target from source recipe: ${preset.actual}. Amounts use locked cups-per-pound densities and are converted to grams for calculator math. Dry mix size is 2 lb; batch volume remains the application/dilution context.`
    );
  }

  async function updateSelectedRecipe() {
    if (!selectedRecipeId) return;
    try {
      const updated = await updateNutrientRecipe(selectedRecipeId, recipePayload());
      await reloadRecipes();
      loadRecipe(updated);
      setFeedback(`Updated ${updated.name} v${updated.version}.`);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to update recipe.");
    }
  }

  async function archiveSelectedRecipe() {
    if (!selectedRecipeId) return;
    try {
      const archived = await archiveNutrientRecipe(selectedRecipeId);
      if (!archived) throw new Error("Archive failed.");
      setSelectedRecipeId("");
      setRecipeName("");
      setRows([newRow(0)]);
      setResult(null);
      setToolRun(null);
      await reloadRecipes();
      setFeedback("Recipe archived.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to archive recipe.");
    }
  }

  function updateRow(id: string, key: keyof ProductRow, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  async function calculate() {
    if (running) return;
    setRunning(true);
    setFeedback("");
    try {
      const products = rows
        .filter((row) => row.name.trim() || Number(row.amount) > 0)
        .map(({ id: _id, ...row }) => normalizeProductRow(row as ProductRow));
      const payload = recipePayload();
      const response = await runCalculator<any>("npk-recipe", {
        ...payload,
        growId: growContext || undefined,
        ...plantContext.toolRunContext,
        products
      });
      setResult(response.outputs);
      setToolRun(response.toolRun);
      setFeedback("Recipe calculated and saved.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to calculate recipe.");
    } finally {
      setRunning(false);
    }
  }

  function productDraftFromRecipe() {
    const payload = recipePayload();
    const linkedRecipeId = selectedRecipeId || toolRun?.linkedRecipeId || null;
    const linkedToolRunId = toolRun?._id || toolRun?.id || null;
    const normalizedProducts = payload.products || [];
    const primaryFormula = result?.formula || "";
    const warnings = [
      ...(Array.isArray(result?.warnings) ? result.warnings : []),
      result?.releaseDisclaimer,
      "Draft product created from calculator output. Review label, batch, image, price, Stripe, stock, and compliance fields before publishing."
    ].filter(Boolean);
    const directions = [
      primaryFormula,
      "Verify guaranteed analysis, source water, final EC/pH, and stage fit before use.",
      "Keep release timing visible on the product page when this draft is used for a soil or dry amendment product."
    ].filter(Boolean);

    return {
      name: recipeName.trim() || "NPK feed recipe draft",
      category:
        recipeMode === "build_dry_blend"
          ? "dry_amendment"
          : recipeMode === "soil_amendment_plan"
            ? "soil_amendment"
            : "nutrient_recipe",
      shortDescription:
        "Draft created from GrowPath Nutrient Mix Builder. Review label, batch, image, price, Stripe, and stock before publishing.",
      fullDescription: [
        `Mode: ${recipeMode.replaceAll("_", " ")}`,
        `Stage: ${stage}`,
        `Medium: ${medium}`,
        `Target label N-P2O5-K2O: ${[targetN || "-", targetP || "-", targetK || "-"].join("-")}`,
        `Desired release: ${desiredReleaseProfile}`,
        result?.formula ? `Formula: ${result.formula}` : "",
        result?.releaseDisclaimer || ""
      ]
        .filter(Boolean)
        .join("\n"),
      status: "draft" as const,
      linkedRecipeId,
      linkedToolRunId,
      specs: {
        source: "npk_feed_recipe_builder",
        targetNpk: payload.targetNpk,
        desiredReleaseProfile,
        dryMixWeightLb: payload.dryMixWeightLb,
        batchVolume: payload.batchVolume,
        batchUnit: payload.batchUnit,
        stage,
        medium,
        products: normalizedProducts,
        ingredients: normalizedProducts,
        guaranteedAnalysisEstimate:
          result?.guaranteedAnalysisEstimate || result?.totals || null,
        elementalEstimate: result?.elementalEstimate || result?.totals || null,
        directions,
        applicationRate: result?.applicationRate || {
          batchVolume: payload.batchVolume,
          batchUnit: payload.batchUnit
        },
        releaseCurve: result?.releaseCurve || result?.releaseTimeline || null,
        releaseTimeline: result?.releaseTimeline,
        calculatedTotals: result?.totals,
        availabilityEstimate: result?.availabilityEstimate,
        warnings,
        sourceConfidence: result?.sourceConfidence
      },
      growInterests: [
        medium,
        recipeMode === "build_dry_blend" ? "dry amendments" : "",
        recipeMode === "soil_amendment_plan" ? "living soil" : "",
        "NPK",
        "recipe building"
      ].filter(Boolean)
    };
  }

  if (!enabled) {
    return (
      <ScreenBoundary
        title="Nutrient Mix Builder"
        showBack
        backFallbackHref="/home/personal/tools"
      >
        <LockedScreen
          title="Nutrient Mix Builder is a Pro tool"
          message="Free accounts can use core tools and browse the app. Upgrade to build nutrient mixes, model release timing, and save results to grow history."
        />
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Nutrient Mix Builder"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nutrient Mix Builder</Text>
        <Text style={styles.subtitle}>
          Build up to {MAX_PRODUCT_ROWS} product rows from guaranteed analysis, target
          label N-P2O5-K2O, source water, and release timing. Fertilizer label P and K are
          entered as P2O5 and K2O, then converted to elemental P/K where appropriate.
        </Text>
        <MixBuilderScienceBasis variant="nutrient" />
        <View style={styles.guidanceCard}>
          <Text style={styles.resultTitle}>AI-guided, calculator-verified</Text>
          <Text style={styles.fieldHint}>
            Use the target profile and ingredient rows for recipe-building conversations.
            GrowPath AI should collect missing inputs and explain tradeoffs, while this
            deterministic tool preserves label N-P2O5-K2O, converts P2O5/K2O for elemental
            math, tracks release timing, and saves the ToolRun for review.
          </Text>
          <Text style={styles.fieldHint}>
            Fertilizer labels are interpreted as total N, available phosphate as P2O5, and
            soluble potash as K2O. When a dry ingredient has no measured bulk density, use
            4 cups per pound only as a planning assumption.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask AI to build nutrient mix"
            style={styles.secondaryButton}
            onPress={() => {
              const prompt = [
                buildAiRecipeBrief(recipePayload()),
                "Help me complete the missing recipe inputs conversationally.",
                "Use GrowPath's registered nutrients.computeDeliveredNPK deterministic calculator for final math once the required labels, amounts, units, density, and batch volume are known. Do not invent missing label values or claim a calculation ran when it did not."
              ].join("\n\n");
              const query = [
                `prompt=${encodeURIComponent(prompt)}`,
                growContext ? `growId=${encodeURIComponent(growContext)}` : ""
              ]
                .filter(Boolean)
                .join("&");
              router.push(`/home/personal/ai?${query}` as any);
            }}
          >
            <Text style={styles.secondaryButtonText}>Ask AI to Build Nutrient Mix</Text>
          </Pressable>
        </View>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_npk"
          longContent
        />
        {growContext ? (
          <Text style={styles.context}>Grow context: {growContext}</Text>
        ) : null}
        <ToolPlantContextPicker
          plants={plantContext.plants}
          plantId={plantContext.plantId}
          selectedPlant={plantContext.selectedPlant}
          onSelect={plantContext.setPlantId}
        />

        <Text style={styles.label}>Batch volume</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.volumeInput}
            value={batchVolume}
            onChangeText={setBatchVolume}
            keyboardType="numeric"
          />
          {(["gal", "L"] as const).map((unit) => (
            <Pressable
              key={unit}
              style={[styles.pill, batchUnit === unit && styles.pillOn]}
              onPress={() => setBatchUnit(unit)}
            >
              <Text style={[styles.pillText, batchUnit === unit && styles.pillTextOn]}>
                {unit}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Recipe name</Text>
        <TextInput
          style={styles.fullInput}
          value={recipeName}
          onChangeText={setRecipeName}
          placeholder="e.g. Veg base"
        />

        <View style={styles.guidanceCard}>
          <Text style={styles.resultTitle}>GrowPath cooked amendment presets</Text>
          <Text style={styles.fieldHint}>
            Load the locked 2 lb dry-amendment recipes using your guaranteed analysis,
            exact cups-per-pound densities, Greenstone as 0-0-0, and target tolerance
            workflow.
          </Text>
          <View style={styles.row}>
            {GROWPATH_STAGE_RECIPES.map((preset) => (
              <Pressable
                key={preset.key}
                accessibilityRole="button"
                accessibilityLabel={`Load ${preset.label} amendment preset`}
                style={styles.secondaryButton}
                onPress={() => loadGrowpathStagePreset(preset)}
              >
                <Text style={styles.secondaryButtonText}>{preset.label}</Text>
                <Text style={styles.fieldHint}>
                  Target {preset.target.N}-{preset.target.P}-{preset.target.K}; actual{" "}
                  {preset.actual}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {savedRecipes.length ? (
          <View style={styles.savedSection}>
            <Text style={styles.label}>Saved recipes</Text>
            {savedRecipes.map((recipe) => (
              <Pressable
                key={recipe._id}
                style={[
                  styles.savedRecipe,
                  selectedRecipeId === recipe._id && styles.savedRecipeOn
                ]}
                onPress={() => loadRecipe(recipe)}
              >
                <Text style={styles.productTitle}>
                  {recipe.name} v{recipe.version}
                </Text>
                <Text style={styles.fieldHint}>
                  {recipe.stage} | {recipe.medium} | used {recipe.useCount || 0} times
                </Text>
              </Pressable>
            ))}
            {selectedRecipeId ? (
              <View style={styles.row}>
                <Pressable style={styles.secondaryButton} onPress={updateSelectedRecipe}>
                  <Text style={styles.secondaryButtonText}>Update Selected Recipe</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={archiveSelectedRecipe}>
                  <Text style={styles.secondaryButtonText}>Archive Selected Recipe</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.label}>Recipe context</Text>
        <View style={styles.row}>
          <View style={styles.selectWrap}>
            <Picker
              selectedValue={recipeMode}
              onValueChange={setRecipeMode}
              style={styles.picker}
            >
              <Picker.Item
                label="Dose existing products"
                value="dose_existing_products"
              />
              <Picker.Item label="Hit target profile" value="hit_target_profile" />
              <Picker.Item label="Build dry blend" value="build_dry_blend" />
              <Picker.Item
                label="Build soil amendment plan"
                value="soil_amendment_plan"
              />
            </Picker>
          </View>
          <View style={styles.selectWrap}>
            <Picker selectedValue={stage} onValueChange={setStage} style={styles.picker}>
              {[
                "seedling",
                "veg",
                "preflower",
                "flower",
                "late_flower",
                "soil_building"
              ].map((value) => (
                <Picker.Item key={value} label={value.replace("_", " ")} value={value} />
              ))}
            </Picker>
          </View>
          <View style={styles.selectWrap}>
            <Picker
              selectedValue={medium}
              onValueChange={setMedium}
              style={styles.picker}
            >
              {["soil", "living_soil", "coco", "peat", "hydro"].map((value) => (
                <Picker.Item key={value} label={value.replace("_", " ")} value={value} />
              ))}
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            value={daysUntilHarvest}
            onChangeText={setDaysUntilHarvest}
            keyboardType="numeric"
            placeholder="Days until harvest"
          />
          <TextInput
            style={styles.input}
            value={soilTempC}
            onChangeText={setSoilTempC}
            keyboardType="numeric"
            placeholder="Soil temp C"
          />
          <TextInput
            style={styles.input}
            value={dryMixWeightLb}
            onChangeText={setDryMixWeightLb}
            keyboardType="numeric"
            placeholder="Dry mix lb"
          />
        </View>
        <Text style={styles.label}>Target profile</Text>
        <Text style={styles.fieldHint}>
          Optional target label N-P2O5-K2O lets AI and the calculator compare the recipe
          goal to the actual label math. Elemental P/K conversion stays inside the
          deterministic tool output.
        </Text>
        <View style={styles.analysisGrid}>
          {[
            ["Target N", targetN, setTargetN],
            ["Target P", targetP, setTargetP],
            ["Target K", targetK, setTargetK]
          ].map(([label, value, setter]: any) => (
            <View key={label} style={styles.analysisField}>
              <Text style={styles.analysisLabel}>{label}</Text>
              <TextInput
                style={styles.analysisInput}
                value={value}
                onChangeText={setter}
                keyboardType="numeric"
              />
            </View>
          ))}
          <View style={styles.selectWrapFull}>
            <Picker
              selectedValue={desiredReleaseProfile}
              onValueChange={setDesiredReleaseProfile}
              style={styles.picker}
            >
              {["fast", "medium", "slow", "blended"].map((value) => (
                <Picker.Item key={value} label={`${value} release`} value={value} />
              ))}
            </Picker>
          </View>
        </View>
        <View style={styles.row}>
          {["dry", "even", "waterlogged"].map((value) => (
            <Pressable
              key={value}
              style={[styles.pill, moisture === value && styles.pillOn]}
              onPress={() => setMoisture(value)}
            >
              <Text style={[styles.pillText, moisture === value && styles.pillTextOn]}>
                {value}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.pill, livingSoil && styles.pillOn]}
            onPress={() => setLivingSoil((value) => !value)}
          >
            <Text style={[styles.pillText, livingSoil && styles.pillTextOn]}>
              Living soil
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pill, isConcentrate && styles.pillOn]}
            onPress={() => setIsConcentrate((value) => !value)}
          >
            <Text style={[styles.pillText, isConcentrate && styles.pillTextOn]}>
              Concentrated stock
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Water baseline and measured feed</Text>
        <Text style={styles.fieldHint}>
          Add source-water minerals and the final mixed EC/pH so recipe history matches
          what was actually fed.
        </Text>
        <View style={styles.analysisGrid}>
          {[
            ["Source EC", sourceEC, setSourceEC],
            ["Source pH", sourcePH, setSourcePH],
            ["Alkalinity ppm", alkalinityPpm, setAlkalinityPpm],
            ["Water Ca ppm", waterCa, setWaterCa],
            ["Water Mg ppm", waterMg, setWaterMg],
            ["Measured EC", measuredEC, setMeasuredEC],
            ["Measured pH", measuredPH, setMeasuredPH]
          ].map(([label, value, setter]: any) => (
            <View key={label} style={styles.analysisFieldWide}>
              <Text style={styles.analysisLabel}>{label}</Text>
              <TextInput
                style={styles.analysisInput}
                value={value}
                onChangeText={setter}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>

        {rows.map((row, index) => (
          <View key={row.id} style={styles.product}>
            <View style={styles.productHeader}>
              <Text style={styles.productTitle}>Product {index + 1}</Text>
              {rows.length > 1 ? (
                <Pressable
                  onPress={() =>
                    setRows((current) => current.filter((item) => item.id !== row.id))
                  }
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              style={styles.fullInput}
              value={row.name}
              onChangeText={(value) => updateRow(row.id, "name", value)}
              placeholder="Product name"
            />
            <Text style={styles.fieldHint}>Chemical form and evidence</Text>
            <View style={styles.selectWrapFull}>
              <Picker
                selectedValue={row.chemistryKey}
                onValueChange={(value) => updateRow(row.id, "chemistryKey", value)}
                style={styles.picker}
              >
                {chemistryOptions.map(([value, label]) => (
                  <Picker.Item key={value} label={label} value={value} />
                ))}
              </Picker>
            </View>
            <View style={styles.selectWrapFull}>
              <Picker
                selectedValue={row.sourceType}
                onValueChange={(value) => updateRow(row.id, "sourceType", value)}
                style={styles.picker}
              >
                <Picker.Item label="User entered" value="user_entered" />
                <Picker.Item label="Manufacturer label" value="manufacturer" />
                <Picker.Item label="Extension reference" value="extension_reference" />
                <Picker.Item label="Lab tested" value="lab_tested" />
              </Picker>
            </View>
            <Text style={styles.fieldHint}>Release behavior</Text>
            <View style={styles.row}>
              <View style={styles.selectWrap}>
                <Picker
                  selectedValue={row.releaseSpeed}
                  onValueChange={(value) => updateRow(row.id, "releaseSpeed", value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Immediate release" value="immediate" />
                  <Picker.Item label="Fast release" value="fast" />
                  <Picker.Item label="Medium release" value="medium" />
                  <Picker.Item label="Slow release" value="slow" />
                  <Picker.Item label="Unknown release" value="unknown" />
                </Picker>
              </View>
              <View style={styles.selectWrap}>
                <Picker
                  selectedValue={row.releaseWindow}
                  onValueChange={(value) => updateRow(row.id, "releaseWindow", value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Day 0-7" value="days_0_7" />
                  <Picker.Item label="Day 7-21" value="days_7_21" />
                  <Picker.Item label="Day 21-45" value="days_21_45" />
                  <Picker.Item label="Day 45-90" value="days_45_90" />
                  <Picker.Item label="90+ days" value="days_90_plus" />
                  <Picker.Item label="Unknown window" value="unknown" />
                </Picker>
              </View>
            </View>
            <Text style={styles.fieldHint}>
              Use this when a label or your experience says an input behaves faster or
              slower than the chemical-form default. Compost and castings should usually
              stay uncertain unless lab-tested.
            </Text>
            <View style={styles.row}>
              <TextInput
                style={styles.input}
                value={row.amount}
                onChangeText={(value) => updateRow(row.id, "amount", value)}
                keyboardType="numeric"
                placeholder="Amount"
              />
              {(["g", "ml", "oz", "tsp", "tbsp"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  style={[styles.pill, row.unit === unit && styles.pillOn]}
                  onPress={() => updateRow(row.id, "unit", unit)}
                >
                  <Text style={[styles.pillText, row.unit === unit && styles.pillTextOn]}>
                    {unit}
                  </Text>
                </Pressable>
              ))}
              {["ml", "tsp", "tbsp"].includes(row.unit) ? (
                <View style={styles.densityField}>
                  <TextInput
                    style={styles.input}
                    value={row.densityGml}
                    onChangeText={(value) => updateRow(row.id, "densityGml", value)}
                    keyboardType="numeric"
                    placeholder="g/ml"
                    accessibilityLabel={`NPK ingredient ${index + 1} density g/ml`}
                  />
                  <Text style={styles.fieldHint}>
                    Required for liquid volume rows. 1 g/ml is an assumption unless the
                    label provides density.
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.fieldHint}>Micronutrient percentages</Text>
            <View style={styles.analysisGrid}>
              {(["Fe", "Mn", "Zn", "Cu", "B", "Mo", "Si"] as const).map((key) => (
                <View key={key} style={styles.analysisField}>
                  <Text style={styles.analysisLabel}>{key}%</Text>
                  <TextInput
                    style={styles.analysisInput}
                    value={row[key]}
                    onChangeText={(value) => updateRow(row.id, key, value)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>
            <Text style={styles.fieldHint}>Guaranteed analysis percentages</Text>
            <Text style={styles.fieldHint}>
              Label N-P2O5-K2O uses elemental N with oxide label values for P and K.
              GrowPath also stores elemental P and K for recipe math using P2O5 x 0.4364
              and K2O x 0.8301.
            </Text>
            <View style={styles.analysisGrid}>
              {(["N", "P", "K", "Ca", "Mg", "S"] as const).map((key) => (
                <View key={key} style={styles.analysisField}>
                  <Text style={styles.analysisLabel}>
                    {guaranteedAnalysisLabels[key]}%
                  </Text>
                  <TextInput
                    accessibilityLabel={`NPK ingredient ${index + 1} ${guaranteedAnalysisLabels[key]} percent`}
                    style={styles.analysisInput}
                    value={row[key]}
                    onChangeText={(value) => updateRow(row.id, key, value)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {rows.length < MAX_PRODUCT_ROWS ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setRows((current) => [...current, newRow(current.length)])}
          >
            <Text style={styles.secondaryButtonText}>
              Add product ({rows.length}/{MAX_PRODUCT_ROWS})
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.primaryButton, running && styles.disabled]}
          disabled={running}
          onPress={calculate}
        >
          <Text style={styles.primaryButtonText}>
            {running ? "Calculating..." : "Calculate recipe"}
          </Text>
        </Pressable>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {result && recipeName.trim() ? (
          <View style={styles.row}>
            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                try {
                  const saved = selectedRecipeId
                    ? await reviseNutrientRecipe(selectedRecipeId, recipePayload())
                    : await createNutrientRecipe(recipePayload());
                  setSelectedRecipeId(saved._id);
                  await reloadRecipes();
                  setFeedback(`Saved ${saved.name} v${saved.version}.`);
                } catch (error: any) {
                  setFeedback(error?.message || "Unable to save recipe.");
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>
                {selectedRecipeId ? "Save New Revision" : "Save Recipe"}
              </Text>
            </Pressable>
            {selectedRecipeId ? (
              <>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={async () => {
                    const clone = await cloneNutrientRecipe(
                      selectedRecipeId,
                      `${recipeName} copy`
                    );
                    await reloadRecipes();
                    loadRecipe(clone);
                    setFeedback("Recipe cloned.");
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Clone Recipe</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryButton}
                  onPress={async () => {
                    await recordNutrientRecipeUse(selectedRecipeId, {
                      growId: growContext || undefined,
                      batchVolume: Number(batchVolume),
                      batchUnit,
                      measuredEC: measuredEC ? Number(measuredEC) : undefined,
                      measuredPH: measuredPH ? Number(measuredPH) : undefined,
                      waterBaseline: recipePayload().waterBaseline,
                      saveLog: true
                    });
                    await reloadRecipes();
                    setFeedback("Recipe use saved to grow history.");
                  }}
                >
                  <Text style={styles.primaryButtonText}>Record Feeding</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

        {result ? (
          <>
            <PersonalFeedPlacement
              placement="middle"
              routeKey="personal_tools_npk"
              longContent
            />
            <ToolResultSurface
              title="NPK recipe result"
              status="CALCULATED"
              summary={result.formula}
              metrics={Object.entries(result.totals || {}).map(([key, value]) => ({
                key,
                label: key.replace("ppm", ""),
                value: String(value),
                detail: "ppm elemental"
              }))}
              inputs={toolRun?.inputs || recipePayload()}
              outputs={toolRun?.outputs || result}
              notices={[
                ...buildNutrientContextNotices(plantContext.selectedPlantContext),
                ...(result.warnings || []).map((warning: string, index: number) => ({
                  key: `warning-${index}`,
                  severity: "medium" as const,
                  message: warning
                })),
                ...(result.sourceConfidence && result.sourceConfidence.overall !== "high"
                  ? [
                      {
                        key: "source-confidence",
                        severity: "medium" as const,
                        message:
                          "One or more product rows are not high-confidence source data.",
                        remediation:
                          "Verify manufacturer labels, density assumptions, source water, and measured EC/pH before applying the recipe."
                      }
                    ]
                  : [])
              ]}
              recommendations={[
                ...(result.recommendations || []),
                "Verify product labels, water baseline, and final mixed EC/pH before applying this recipe."
              ]}
              formulas={
                toolRun?.formulas?.length
                  ? toolRun.formulas
                  : [
                      result.formula ||
                        "Fertilizer label P and K are converted from oxide label values to elemental ppm."
                    ]
              }
              uncertainty={
                toolRun?.uncertainty ||
                "Ingredient labels, density assumptions, water baseline, and product source confidence affect nutrient totals."
              }
              confidence={toolRun?.confidence || "label-math-calculator"}
              assumptions={[
                buildNutrientContextAssumption(plantContext.selectedPlantContext),
                result.releaseDisclaimer,
                "Raw NPK totals are label math; release timing and availability estimates are not a substitute for substrate tests, water tests, or measured runoff/feed data."
              ].filter(Boolean)}
              details={
                <>
                  {result.calculationBasis ? (
                    <>
                      <Text style={styles.resultTitle}>Calculation basis</Text>
                      <Text style={styles.recommendation}>
                        {result.calculationBasis.interpretation}
                      </Text>
                    </>
                  ) : null}
                  {result.targetProfile ? (
                    <>
                      <Text style={styles.resultTitle}>Target profile comparison</Text>
                      <Text style={styles.recommendation}>
                        Status: {String(result.targetProfile.status).replaceAll("_", " ")}
                        . Delivered label-equivalent ratio N-P2O5-K2O{" "}
                        {result.labelEquivalentRatio?.N ?? 0}-
                        {result.labelEquivalentRatio?.P ?? 0}-
                        {result.labelEquivalentRatio?.K ?? 0}.
                      </Text>
                    </>
                  ) : null}
                  {result.sourceConfidence ? (
                    <>
                      <Text style={styles.resultTitle}>Source confidence</Text>
                      <Text style={styles.recommendation}>
                        Overall: {result.sourceConfidence.overall}. High{" "}
                        {result.sourceConfidence.counts?.high || 0}, medium{" "}
                        {result.sourceConfidence.counts?.medium || 0}, low{" "}
                        {result.sourceConfidence.counts?.low || 0}.
                      </Text>
                    </>
                  ) : null}
                  {Array.isArray(result.mixingOrder) && result.mixingOrder.length ? (
                    <>
                      <Text style={styles.resultTitle}>Mixing sequence</Text>
                      {result.mixingOrder.map((step: string, index: number) => (
                        <Text key={`${step}-${index}`} style={styles.recommendation}>
                          {index + 1}. {step}
                        </Text>
                      ))}
                    </>
                  ) : null}
                  {result.availabilityEstimate?.windows ? (
                    <>
                      <Text style={styles.resultTitle}>Estimated availability</Text>
                      <Text style={styles.fieldHint}>
                        Raw ppm is label math. Availability estimates apply release timing
                        from the product form.
                      </Text>
                      {Object.entries(result.availabilityEstimate.windows).map(
                        ([window, totals]: [string, any]) => {
                          const primary = ["Nppm", "Pppm", "Kppm", "Cappm", "Mgppm"]
                            .map(
                              (key) => `${key.replace("ppm", "")}: ${totals?.[key] || 0}`
                            )
                            .join(" / ");
                          return (
                            <Text key={window} style={styles.recommendation}>
                              {window.replaceAll("_", "-")}: {primary}
                            </Text>
                          );
                        }
                      )}
                      {result.availabilityEstimate.disclaimer ? (
                        <Text style={styles.fieldHint}>
                          {result.availabilityEstimate.disclaimer}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  <Text style={styles.resultTitle}>Release timing</Text>
                  {Object.entries(result.releaseTimeline || {}).map(
                    ([window, entries]: [string, any]) =>
                      entries.length ? (
                        <View key={window} style={styles.timelineRow}>
                          <Text style={styles.timelineLabel}>
                            {window.replaceAll("_", "-")}
                          </Text>
                          <Text style={styles.recommendation}>
                            {entries
                              .map(
                                (entry: any) =>
                                  `${entry.name}: ${entry.form} (${entry.confidence})`
                              )
                              .join("; ")}
                          </Text>
                        </View>
                      ) : null
                  )}
                </>
              }
              actions={[
                ...(toolRun?._id && growContext
                  ? [
                      {
                        key: "save-log",
                        label: "Save to Grow Log",
                        onPress: async () => {
                          await saveToolRunToLog(toolRun._id!);
                          setFeedback("Saved to grow journal.");
                        }
                      },
                      {
                        key: "create-task",
                        label: "Create Recipe Review Task",
                        variant: "secondary" as const,
                        onPress: async () => {
                          const taskResult = await saveToolRunAndCreateTask({
                            growId: growContext,
                            ...plantContext.toolRunContext,
                            toolKey: "npk-recipe",
                            toolRunId: toolRun._id!,
                            input: toolRun.inputs || recipePayload(),
                            output: toolRun.outputs || result,
                            title: "Review NPK recipe before feeding",
                            description: [
                              recipeName.trim() ? `Recipe: ${recipeName.trim()}` : "",
                              result.sourceConfidence
                                ? `Source confidence: ${result.sourceConfidence.overall}`
                                : "",
                              measuredEC ? `Measured EC: ${measuredEC}` : "",
                              measuredPH ? `Measured pH: ${measuredPH}` : "",
                              "Verify product labels, water baseline, final EC/pH, and plant stage before application."
                            ]
                              .filter(Boolean)
                              .join("\n"),
                            priority:
                              result.sourceConfidence?.overall === "low"
                                ? "high"
                                : "medium",
                            dueDate: new Date(
                              Date.now() + 24 * 60 * 60 * 1000
                            ).toISOString()
                          });
                          if (!taskResult.ok) throw new Error(taskResult.error);
                          setFeedback("Recipe review task created.");
                        }
                      },
                      {
                        key: "create-recipe-task-plan",
                        label: "Create Recipe Task Plan",
                        variant: "secondary" as const,
                        onPress: async () => {
                          const taskInput =
                            toolRun.inputs && Object.keys(toolRun.inputs).length
                              ? toolRun.inputs
                              : recipePayload();
                          const taskOutput =
                            toolRun.outputs && Object.keys(toolRun.outputs).length
                              ? toolRun.outputs
                              : result;
                          const taskResult = await saveToolRunAndCreateTasks({
                            growId: growContext,
                            ...plantContext.toolRunContext,
                            toolKey: "npk-recipe",
                            toolRunId: toolRun._id!,
                            input: taskInput,
                            output: taskOutput,
                            tasks: npkRecipeTasks({
                              recipeName,
                              recipeMode,
                              stage,
                              medium,
                              result,
                              payload: taskInput
                            })
                          });
                          if (!taskResult.ok) throw new Error(taskResult.error);
                          setFeedback("Recipe task plan created.");
                        }
                      }
                    ]
                  : []),
                ...(recipeName.trim()
                  ? [
                      {
                        key: "convert-product-draft",
                        label: "Convert to Product Draft",
                        variant: "secondary" as const,
                        pendingLabel: "Creating draft...",
                        successMessage: "Product draft created.",
                        onPress: async () => {
                          const created = await createProduct(
                            productDraftFromRecipe() as any
                          );
                          const productId = created?.product?.id || created?.id;
                          setFeedback(
                            productId
                              ? `Product draft created: ${productId}.`
                              : "Product draft created."
                          );
                        }
                      }
                    ]
                  : [])
              ]}
              feedback={feedback}
              contextMessage={
                !growContext
                  ? "Select a grow to enable journal and task actions."
                  : undefined
              }
            />
          </>
        ) : null}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_npk"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B", lineHeight: 19 },
  context: { color: "#166534", fontWeight: "700" },
  label: { fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  guidanceCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    padding: 12
  },
  aiBriefBox: {
    backgroundColor: "white",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 8,
    padding: 10
  },
  aiBriefText: { color: "#334155", fontSize: 12, lineHeight: 18, marginTop: 6 },
  volumeInput: {
    minWidth: 130,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  product: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 14, gap: 10 },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  productTitle: { fontSize: 16, fontWeight: "700" },
  remove: { color: "#B91C1C", fontWeight: "600" },
  fullInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  input: {
    minWidth: 90,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  pill: {
    minWidth: 44,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  pillOn: { backgroundColor: "#166534", borderColor: "#166534" },
  pillText: { fontWeight: "700" },
  pillTextOn: { color: "#FFFFFF" },
  fieldHint: { color: "#64748B", fontSize: 12, lineHeight: 17 },
  analysisGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  analysisField: { width: 82 },
  densityField: { minWidth: 180, flexGrow: 1, gap: 4 },
  analysisFieldWide: { width: 132 },
  analysisLabel: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  analysisInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 9
  },
  selectWrap: {
    minWidth: 180,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    overflow: "hidden"
  },
  selectWrapFull: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    overflow: "hidden"
  },
  picker: { height: 44, backgroundColor: "#FFFFFF" },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignSelf: "flex-start"
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start"
  },
  secondaryButtonText: { color: "#166534", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  feedback: { color: "#475569", fontSize: 13 },
  resultCard: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
    backgroundColor: "#F8FAFC"
  },
  resultTitle: { fontSize: 18, fontWeight: "800" },
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resultMetric: { width: 72, borderRightWidth: 1, borderColor: "#CBD5E1" },
  metricLabel: { color: "#64748B", fontSize: 12 },
  metricValue: { fontSize: 18, fontWeight: "800" },
  warning: { color: "#B45309", fontWeight: "600" },
  recommendation: { color: "#334155", lineHeight: 19 },
  savedSection: { gap: 8 },
  savedRecipe: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  savedRecipeOn: { borderColor: "#166534", backgroundColor: "#F0FDF4" },
  timelineRow: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 8, gap: 4 },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  timelineLabel: { fontWeight: "700", color: "#166534" }
});
