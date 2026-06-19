export type NutrientKey =
  | "calcium"
  | "nitrogen"
  | "phosphorus"
  | "magnesium"
  | "sulfur"
  | "iron";

export type NutrientIntent =
  | "fast_fix"
  | "long_term_soil"
  | "without_raising_ph"
  | "raise_ph"
  | "calcium_plus_magnesium"
  | "high_pH_iron"
  | "nitrogen_support"
  | "phosphorus_support";

export type NutrientStage =
  | "seedling"
  | "veg"
  | "preflower"
  | "flower"
  | "late_flower"
  | "soil_building";

export type MoistureState = "dry" | "moderate" | "wet";
export type MicrobialActivity = "low" | "moderate" | "high";
export type ReleaseClass = "immediate" | "fast" | "medium" | "slow" | "very_slow";
export type PHImpact = "raises_pH" | "lowers_pH" | "neutral" | "buffers_pH" | "depends";
export type ECImpact = "low" | "medium" | "high";
export type Mobility = "mobile" | "moderately_mobile" | "immobile" | "variable";
export type SourceConfidence = "low" | "medium" | "high";
export type ReleaseMechanism =
  | "water_soluble"
  | "microbial_mineralization"
  | "carbonate_dissolution"
  | "acid_reaction"
  | "chelated"
  | "mineral_weathering"
  | "organic_matrix";

export type NutrientEnvironment = {
  stage: NutrientStage;
  soilTempC: number | null;
  moisture: MoistureState;
  microbialActivity: MicrobialActivity;
  pH: number | null;
  daysUntilNeed: number | null;
  livingSoil: boolean;
  isConcentrate: boolean;
};

export type NutrientForm = {
  nutrient: NutrientKey | string;
  form: string;
  chemicalName: string;
  availabilityClass: ReleaseClass;
  estimatedReleaseDays: { min: number; max: number };
  releaseMechanism: ReleaseMechanism;
  pHEffect: PHImpact;
  ecImpact: ECImpact;
  mobility: Mobility;
  notes: string;
};

export type NutrientIngredient = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  labelNPK: { N?: number; P?: number; K?: number };
  elemental: {
    N?: number;
    P?: number;
    K?: number;
    Ca?: number;
    Mg?: number;
    S?: number;
    Fe?: number;
  };
  nutrientForms: NutrientForm[];
  bestUseCases: string[];
  badUseCases: string[];
  warnings: string[];
  sourceType: "user_entered" | "verified" | "extension_reference" | "manufacturer";
  confidence: SourceConfidence;
  intentTags: NutrientIntent[];
  nutrientTags: NutrientKey[];
};

export type ReleaseCurveRow = NutrientForm & {
  adjustedReleaseDays: { min: number; max: number };
  fitLabel: string;
};

export type IngredientRecommendation = {
  ingredient: NutrientIngredient;
  score: number;
  reasons: string[];
  fitLabel: string;
  releaseSummary: string;
  timing: ReleaseCurveRow[];
};

export const nutrientOptions: { key: NutrientKey; label: string }[] = [
  { key: "calcium", label: "Calcium" },
  { key: "nitrogen", label: "Nitrogen" },
  { key: "phosphorus", label: "Phosphorus" },
  { key: "magnesium", label: "Magnesium" },
  { key: "sulfur", label: "Sulfur" },
  { key: "iron", label: "Iron" }
];

export const intentOptions: { key: NutrientIntent; label: string; hint: string }[] = [
  { key: "fast_fix", label: "Fast fix", hint: "Immediate correction or rescue input" },
  { key: "long_term_soil", label: "Soil building", hint: "Slow background amendment" },
  { key: "without_raising_ph", label: "No liming", hint: "Add nutrient without pushing pH up" },
  { key: "raise_ph", label: "Raise pH", hint: "Buffer or lift acidic media" },
  {
    key: "calcium_plus_magnesium",
    label: "Ca + Mg",
    hint: "Choose a source that adds both"
  },
  { key: "high_pH_iron", label: "High-pH iron", hint: "Stable iron above neutral pH" },
  { key: "nitrogen_support", label: "N support", hint: "Quick to slow nitrogen sources" },
  { key: "phosphorus_support", label: "P support", hint: "Phosphorus with release timing in mind" }
];

export const stageOptions: { key: NutrientStage; label: string }[] = [
  { key: "seedling", label: "Seedling" },
  { key: "veg", label: "Veg" },
  { key: "preflower", label: "Preflower" },
  { key: "flower", label: "Flower" },
  { key: "late_flower", label: "Late flower" },
  { key: "soil_building", label: "Soil building" }
];

export const moistureOptions: { key: MoistureState; label: string }[] = [
  { key: "dry", label: "Dry" },
  { key: "moderate", label: "Moderate" },
  { key: "wet", label: "Wet" }
];

export const microbialOptions: { key: MicrobialActivity; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "moderate", label: "Moderate" },
  { key: "high", label: "High" }
];

export const ingredientLibrary: NutrientIngredient[] = [
  {
    id: "calcium-nitrate",
    name: "Calcium Nitrate",
    category: "salt",
    labelNPK: { N: 15.5 },
    elemental: { N: 15.5, Ca: 19 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "nitrate",
        chemicalName: "calcium nitrate",
        availabilityClass: "immediate",
        estimatedReleaseDays: { min: 0, max: 3 },
        releaseMechanism: "water_soluble",
        pHEffect: "lowers_pH",
        ecImpact: "high",
        mobility: "mobile",
        notes: "Fast soluble calcium with fast nitrate nitrogen."
      },
      {
        nutrient: "nitrogen",
        form: "nitrate",
        chemicalName: "nitrate nitrogen",
        availabilityClass: "immediate",
        estimatedReleaseDays: { min: 0, max: 3 },
        releaseMechanism: "water_soluble",
        pHEffect: "lowers_pH",
        ecImpact: "high",
        mobility: "mobile",
        notes: "Fast plant-available N."
      }
    ],
    bestUseCases: ["fast calcium rescue", "fast nitrate support", "soilless fertigation"],
    badUseCases: ["slow background feeding", "A/B concentrate with phosphate"],
    warnings: ["Do not mix in concentrate with phosphate salts."],
    sourceType: "verified",
    confidence: "high",
    intentTags: ["fast_fix", "without_raising_ph", "nitrogen_support"],
    nutrientTags: ["calcium", "nitrogen"]
  },
  {
    id: "calcium-chloride",
    name: "Calcium Chloride",
    category: "salt",
    labelNPK: {},
    elemental: { Ca: 36 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "chloride",
        chemicalName: "calcium chloride",
        availabilityClass: "immediate",
        estimatedReleaseDays: { min: 0, max: 2 },
        releaseMechanism: "water_soluble",
        pHEffect: "neutral",
        ecImpact: "high",
        mobility: "mobile",
        notes: "Very fast calcium, but chloride load can be a problem."
      }
    ],
    bestUseCases: ["rapid calcium correction", "foliar or targeted short-term use"],
    badUseCases: ["chloride-sensitive crops", "broad soil building", "phosphate concentrates"],
    warnings: ["Watch chloride accumulation and foliar burn."],
    sourceType: "extension_reference",
    confidence: "medium",
    intentTags: ["fast_fix", "without_raising_ph"],
    nutrientTags: ["calcium"]
  },
  {
    id: "calcium-acetate",
    name: "Calcium Acetate",
    category: "salt",
    labelNPK: {},
    elemental: { Ca: 19 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "acetate",
        chemicalName: "calcium acetate",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 5 },
        releaseMechanism: "water_soluble",
        pHEffect: "neutral",
        ecImpact: "medium",
        mobility: "mobile",
        notes: "Quick calcium input without a liming effect."
      }
    ],
    bestUseCases: ["fast calcium support", "non-liming calcium correction"],
    badUseCases: ["long-term buffering", "high-EC stock mixing with phosphate"],
    warnings: ["Still count it as a soluble salt in concentrate handling."],
    sourceType: "extension_reference",
    confidence: "medium",
    intentTags: ["fast_fix", "without_raising_ph"],
    nutrientTags: ["calcium"]
  },
  {
    id: "gypsum",
    name: "Gypsum",
    category: "mineral",
    labelNPK: {},
    elemental: { Ca: 23, S: 18 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "sulfate",
        chemicalName: "calcium sulfate",
        availabilityClass: "medium",
        estimatedReleaseDays: { min: 7, max: 28 },
        releaseMechanism: "mineral_weathering",
        pHEffect: "neutral",
        ecImpact: "low",
        mobility: "moderately_mobile",
        notes: "Adds calcium and sulfur without acting like lime."
      },
      {
        nutrient: "sulfur",
        form: "sulfate",
        chemicalName: "sulfate sulfur",
        availabilityClass: "medium",
        estimatedReleaseDays: { min: 7, max: 28 },
        releaseMechanism: "mineral_weathering",
        pHEffect: "neutral",
        ecImpact: "low",
        mobility: "mobile",
        notes: "Sulfur source without soil-acidifying rescue claims."
      }
    ],
    bestUseCases: ["calcium without liming", "sulfur source", "soil structure context"],
    badUseCases: ["fast calcium rescue", "raising pH", "lowering pH product"],
    warnings: ["Gypsum is not a liming material."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["long_term_soil", "without_raising_ph"],
    nutrientTags: ["calcium", "sulfur"]
  },
  {
    id: "calcitic-lime",
    name: "Calcitic Lime",
    category: "mineral",
    labelNPK: {},
    elemental: { Ca: 38 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "carbonate",
        chemicalName: "calcium carbonate",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 21, max: 120 },
        releaseMechanism: "carbonate_dissolution",
        pHEffect: "raises_pH",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Long-term calcium plus pH buffering."
      }
    ],
    bestUseCases: ["low pH soil", "long-term calcium buffer", "pH correction"],
    badUseCases: ["fast deficiency rescue", "already high pH media"],
    warnings: ["Use cautiously in already alkaline media."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["long_term_soil", "raise_ph"],
    nutrientTags: ["calcium"]
  },
  {
    id: "dolomitic-lime",
    name: "Dolomitic Lime",
    category: "mineral",
    labelNPK: {},
    elemental: { Ca: 21, Mg: 12 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "carbonate",
        chemicalName: "calcium magnesium carbonate",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 21, max: 120 },
        releaseMechanism: "carbonate_dissolution",
        pHEffect: "raises_pH",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Adds calcium, magnesium, and pH buffering over time."
      },
      {
        nutrient: "magnesium",
        form: "carbonate",
        chemicalName: "magnesium carbonate",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 21, max: 120 },
        releaseMechanism: "carbonate_dissolution",
        pHEffect: "raises_pH",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Best when magnesium is low or marginal."
      }
    ],
    bestUseCases: ["low pH soil", "magnesium needed", "long-term buffer"],
    badUseCases: ["fast calcium correction", "already high pH media"],
    warnings: ["Do not add to already high pH media unless you need the buffer."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["long_term_soil", "raise_ph", "calcium_plus_magnesium"],
    nutrientTags: ["calcium", "magnesium"]
  },
  {
    id: "oyster-shell-flour",
    name: "Oyster Shell Flour",
    category: "mineral",
    labelNPK: {},
    elemental: { Ca: 38 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "carbonate",
        chemicalName: "oyster shell calcium carbonate",
        availabilityClass: "very_slow",
        estimatedReleaseDays: { min: 60, max: 240 },
        releaseMechanism: "carbonate_dissolution",
        pHEffect: "buffers_pH",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Very slow long-term calcium and pH buffer."
      }
    ],
    bestUseCases: ["long-term soil building", "buffering", "pre-mix"],
    badUseCases: ["urgent rescue", "short cycle fix"],
    warnings: ["Particle size matters a lot for release speed."],
    sourceType: "extension_reference",
    confidence: "medium",
    intentTags: ["long_term_soil", "raise_ph"],
    nutrientTags: ["calcium"]
  },
  {
    id: "bone-meal",
    name: "Bone Meal",
    category: "organic-mineral",
    labelNPK: { P: 12 },
    elemental: { P: 12, Ca: 12 },
    nutrientForms: [
      {
        nutrient: "phosphorus",
        form: "phosphate",
        chemicalName: "calcium phosphate",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 21, max: 180 },
        releaseMechanism: "microbial_mineralization",
        pHEffect: "depends",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Slow phosphorus with calcium, dependent on biology and particle size."
      },
      {
        nutrient: "calcium",
        form: "phosphate mineral",
        chemicalName: "bone mineral calcium",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 21, max: 180 },
        releaseMechanism: "microbial_mineralization",
        pHEffect: "depends",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Not a fast calcium rescue product."
      }
    ],
    bestUseCases: ["pre-mix", "long-term soil building", "root-zone phosphorus support"],
    badUseCases: ["fast calcium correction", "short cycle rescue"],
    warnings: ["High phosphorus can accumulate if the soil already has plenty."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["long_term_soil", "phosphorus_support"],
    nutrientTags: ["calcium", "phosphorus"]
  },
  {
    id: "crab-meal",
    name: "Crab Meal",
    category: "organic-mineral",
    labelNPK: { N: 4, P: 3 },
    elemental: { N: 4, P: 3, Ca: 8 },
    nutrientForms: [
      {
        nutrient: "calcium",
        form: "organic_matrix",
        chemicalName: "crustacean calcium",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 28, max: 180 },
        releaseMechanism: "microbial_mineralization",
        pHEffect: "depends",
        ecImpact: "low",
        mobility: "immobile",
        notes: "Long-term calcium plus biology-adjacent organic matter."
      },
      {
        nutrient: "nitrogen",
        form: "organic protein",
        chemicalName: "proteinaceous nitrogen",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 28, max: 180 },
        releaseMechanism: "microbial_mineralization",
        pHEffect: "depends",
        ecImpact: "low",
        mobility: "variable",
        notes: "Microbe-driven nitrogen release."
      }
    ],
    bestUseCases: ["soil building", "biology support", "slow calcium background"],
    badUseCases: ["fast rescue", "precision salt-style correction"],
    warnings: ["Release speed depends heavily on biology and particle size."],
    sourceType: "extension_reference",
    confidence: "medium",
    intentTags: ["long_term_soil"],
    nutrientTags: ["calcium", "nitrogen"]
  },
  {
    id: "feather-meal",
    name: "Feather Meal",
    category: "organic-mineral",
    labelNPK: { N: 12 },
    elemental: { N: 12 },
    nutrientForms: [
      {
        nutrient: "nitrogen",
        form: "organic protein",
        chemicalName: "keratin protein nitrogen",
        availabilityClass: "slow",
        estimatedReleaseDays: { min: 120, max: 180 },
        releaseMechanism: "microbial_mineralization",
        pHEffect: "depends",
        ecImpact: "low",
        mobility: "variable",
        notes: "High-N organic fertilizer with a long release window."
      }
    ],
    bestUseCases: ["background N", "pre-mix", "long cycle veg support"],
    badUseCases: ["fast deficiency rescue", "late flower correction"],
    warnings: ["Release depends on microbial activity and temperature."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["long_term_soil", "nitrogen_support"],
    nutrientTags: ["nitrogen"]
  },
  {
    id: "urea",
    name: "Urea",
    category: "salt",
    labelNPK: { N: 46 },
    elemental: { N: 46 },
    nutrientForms: [
      {
        nutrient: "nitrogen",
        form: "urea",
        chemicalName: "urea nitrogen",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 7 },
        releaseMechanism: "acid_reaction",
        pHEffect: "lowers_pH",
        ecImpact: "high",
        mobility: "mobile",
        notes: "Must hydrolyze before uptake; volatilization risk if mismanaged."
      }
    ],
    bestUseCases: ["fast nitrogen support", "high-N soluble programs"],
    badUseCases: ["slow soil building"],
    warnings: ["Can volatilize if surface-applied poorly."],
    sourceType: "verified",
    confidence: "high",
    intentTags: ["fast_fix", "nitrogen_support"],
    nutrientTags: ["nitrogen"]
  },
  {
    id: "ammonium-sulfate",
    name: "Ammonium Sulfate",
    category: "salt",
    labelNPK: { N: 21 },
    elemental: { N: 21, S: 24 },
    nutrientForms: [
      {
        nutrient: "nitrogen",
        form: "ammonium",
        chemicalName: "ammonium nitrogen",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 7 },
        releaseMechanism: "water_soluble",
        pHEffect: "lowers_pH",
        ecImpact: "high",
        mobility: "moderately_mobile",
        notes: "Fast N plus sulfur, acidifying over time." 
      },
      {
        nutrient: "sulfur",
        form: "sulfate",
        chemicalName: "sulfate sulfur",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 7 },
        releaseMechanism: "water_soluble",
        pHEffect: "lowers_pH",
        ecImpact: "high",
        mobility: "mobile",
        notes: "Sulfur is immediately available as sulfate."
      }
    ],
    bestUseCases: ["fast nitrogen support", "sulfur support", "acidifying saline programs"],
    badUseCases: ["pH raising", "sensitive root zones"],
    warnings: ["Check EC and acidification pressure."],
    sourceType: "verified",
    confidence: "high",
    intentTags: ["fast_fix", "nitrogen_support"],
    nutrientTags: ["nitrogen", "sulfur"]
  },
  {
    id: "epsom-salt",
    name: "Epsom Salt",
    category: "salt",
    labelNPK: {},
    elemental: { Mg: 10, S: 13 },
    nutrientForms: [
      {
        nutrient: "magnesium",
        form: "sulfate",
        chemicalName: "magnesium sulfate",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 7 },
        releaseMechanism: "water_soluble",
        pHEffect: "neutral",
        ecImpact: "medium",
        mobility: "mobile",
        notes: "Fast magnesium and sulfur support."
      },
      {
        nutrient: "sulfur",
        form: "sulfate",
        chemicalName: "sulfate sulfur",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 7 },
        releaseMechanism: "water_soluble",
        pHEffect: "neutral",
        ecImpact: "medium",
        mobility: "mobile",
        notes: "Immediately available sulfur."
      }
    ],
    bestUseCases: ["fast magnesium correction", "magnesium plus sulfur"],
    badUseCases: ["long-term calcium buffering"],
    warnings: ["Does not solve calcium transport issues."],
    sourceType: "verified",
    confidence: "high",
    intentTags: ["fast_fix", "without_raising_ph"],
    nutrientTags: ["magnesium", "sulfur"]
  },
  {
    id: "fe-dtpa",
    name: "Iron DTPA",
    category: "chelate",
    labelNPK: {},
    elemental: { Fe: 11 },
    nutrientForms: [
      {
        nutrient: "iron",
        form: "chelate",
        chemicalName: "iron DTPA",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 14 },
        releaseMechanism: "chelated",
        pHEffect: "neutral",
        ecImpact: "low",
        mobility: "variable",
        notes: "More stable than EDTA near neutral pH."
      }
    ],
    bestUseCases: ["iron correction near neutral pH", "chelated micro package"],
    badUseCases: ["very high pH media"],
    warnings: ["Less reliable as pH rises beyond neutral."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["fast_fix", "without_raising_ph", "high_pH_iron"],
    nutrientTags: ["iron"]
  },
  {
    id: "fe-eddha",
    name: "Iron EDDHA",
    category: "chelate",
    labelNPK: {},
    elemental: { Fe: 6 },
    nutrientForms: [
      {
        nutrient: "iron",
        form: "chelate",
        chemicalName: "iron EDDHA",
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 14 },
        releaseMechanism: "chelated",
        pHEffect: "neutral",
        ecImpact: "low",
        mobility: "variable",
        notes: "Best high-pH iron option in this starter library."
      }
    ],
    bestUseCases: ["high pH iron correction", "alkaline media"],
    badUseCases: ["budget-only low pH corrections"],
    warnings: ["Often more expensive than other iron chelates."],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["fast_fix", "without_raising_ph", "high_pH_iron"],
    nutrientTags: ["iron"]
  }
];

function releaseClassFromDays(days: number): ReleaseClass {
  if (days <= 1) return "immediate";
  if (days <= 7) return "fast";
  if (days <= 21) return "medium";
  if (days <= 60) return "slow";
  return "very_slow";
}

function nutrientIntentHints(intent: NutrientIntent): string[] {
  switch (intent) {
    case "fast_fix":
      return ["Immediate correction or rescue inputs", "Prioritize soluble or chelated sources"];
    case "long_term_soil":
      return ["Background feeding and pre-mix inputs", "Prioritize biological or mineral-release sources"];
    case "without_raising_ph":
      return ["Avoid carbonate liming materials", "Favor neutral or slightly acidifying sources"];
    case "raise_ph":
      return ["Favor carbonate or buffering materials", "Do not use this for fast rescue"];
    case "calcium_plus_magnesium":
      return ["Select a source that contributes both Ca and Mg", "Dolomitic lime is the common soil example"];
    case "high_pH_iron":
      return ["Choose chelated iron with stronger high-pH stability", "EDDHA is the safest starter choice"];
    case "nitrogen_support":
      return ["Fast N can come from salts; slow N from meals", "Release timing matters more than the label"];
    case "phosphorus_support":
      return ["Phosphorus availability is often biology-dependent", "Check whether the need is immediate or soil-building"];
    default:
      return [];
  }
}

export function getIngredientsForNutrient(nutrient: NutrientKey) {
  return ingredientLibrary.filter((ingredient) => ingredient.nutrientTags.includes(nutrient));
}

export function estimateReleaseCurve(
  ingredient: NutrientIngredient,
  environment: NutrientEnvironment
): ReleaseCurveRow[] {
  return ingredient.nutrientForms.map((form) => {
    let factor = 1;

    if (form.releaseMechanism === "water_soluble") factor *= 1.55;
    if (form.releaseMechanism === "microbial_mineralization" || form.releaseMechanism === "organic_matrix") {
      if (environment.livingSoil) factor *= 1.12;
      if (environment.microbialActivity === "high") factor *= 1.18;
      if (environment.microbialActivity === "low") factor *= 0.72;
      if (environment.soilTempC != null) {
        if (environment.soilTempC < 15) factor *= 0.7;
        else if (environment.soilTempC < 20) factor *= 0.88;
        else if (environment.soilTempC > 28) factor *= 0.9;
      }
      if (environment.moisture === "dry") factor *= 0.7;
      else if (environment.moisture === "wet") factor *= 0.82;
    }
    if (form.releaseMechanism === "carbonate_dissolution") {
      if (environment.pH != null && environment.pH < 6.5) factor *= 1.15;
      if (environment.pH != null && environment.pH > 7.2) factor *= 0.82;
    }
    if (form.releaseMechanism === "chelated" && environment.pH != null && environment.pH >= 7) {
      factor *= 1.15;
    }

    const adjustedMin = Math.max(0, Math.round(form.estimatedReleaseDays.min / factor));
    const adjustedMax = Math.max(adjustedMin, Math.round(form.estimatedReleaseDays.max / factor));

    let fitLabel = form.availabilityClass;
    if (adjustedMin <= 1) fitLabel = "immediate";
    else if (adjustedMin <= 7) fitLabel = "fast";
    else if (adjustedMin <= 21) fitLabel = "medium";
    else if (adjustedMin <= 60) fitLabel = "slow";
    else fitLabel = "very_slow";

    return { ...form, adjustedReleaseDays: { min: adjustedMin, max: adjustedMax }, fitLabel };
  });
}

export function summarizeReleaseCurve(rows: ReleaseCurveRow[]) {
  if (!rows.length) return "No release forms available.";
  const fastest = Math.min(...rows.map((row) => row.adjustedReleaseDays.min));
  const slowest = Math.max(...rows.map((row) => row.adjustedReleaseDays.max));
  return `${releaseClassFromDays(fastest)} window (${fastest}-${slowest} days)`;
}

export function stageTimingWarning(stage: NutrientStage, rows: ReleaseCurveRow[]) {
  if (!rows.length) return null;
  const fastest = Math.min(...rows.map((row) => row.adjustedReleaseDays.min));
  if (stage === "late_flower" && fastest > 14) {
    return "This source may be too slow to help the current run. It is better suited as a soil-building input for the next cycle.";
  }
  if (stage === "seedling" && fastest <= 7) {
    return "Fast sources can still be useful later, but avoid hot mixes around seedlings.";
  }
  if (stage === "soil_building" && fastest <= 7) {
    return "Fast products can patch a problem, but slower sources usually fit soil building better.";
  }
  return null;
}

export function recommendIngredients(
  nutrient: NutrientKey,
  intent: NutrientIntent,
  environment: NutrientEnvironment
): IngredientRecommendation[] {
  return getIngredientsForNutrient(nutrient)
    .map((ingredient) => {
      const timing = estimateReleaseCurve(ingredient, environment);
      const fastest = Math.min(...timing.map((row) => row.adjustedReleaseDays.min));
      const slowest = Math.max(...timing.map((row) => row.adjustedReleaseDays.max));
      const intentHints = nutrientIntentHints(intent);
      const reasons: string[] = [];
      let score = 0;

      if (ingredient.intentTags.includes(intent)) score += 30;
      if (ingredient.nutrientTags.includes(nutrient)) score += 15;
      if (intent === "fast_fix") {
        if (fastest <= 1) score += 28;
        else if (fastest <= 7) score += 20;
      }
      if (intent === "long_term_soil") {
        if (slowest >= 21) score += 24;
        if (slowest >= 60) score += 10;
      }
      if (intent === "without_raising_ph") {
        if (timing.some((row) => row.pHEffect === "neutral" || row.pHEffect === "lowers_pH")) score += 18;
      }
      if (intent === "raise_ph") {
        if (timing.some((row) => row.pHEffect === "raises_pH" || row.pHEffect === "buffers_pH")) score += 18;
      }
      if (intent === "calcium_plus_magnesium" && ingredient.elemental.Ca && ingredient.elemental.Mg) score += 32;
      if (intent === "high_pH_iron") {
        if (ingredient.id.includes("eddha")) score += 30;
        else if (ingredient.id.includes("dtpa")) score += 20;
      }
      if (environment.daysUntilNeed != null) {
        if (fastest <= environment.daysUntilNeed) score += 12;
        else score -= 8;
      }
      if (environment.pH != null && environment.pH > 7) {
        if (timing.some((row) => row.pHEffect === "raises_pH")) score -= 12;
        if (timing.some((row) => row.nutrient === "iron" && row.releaseMechanism === "chelated")) score += 8;
      }
      if (environment.microbialActivity === "low" && timing.some((row) => row.releaseMechanism === "microbial_mineralization")) {
        score -= 14;
        reasons.push("Low biological activity may slow microbe-released sources.");
      }
      if (environment.moisture === "dry" && timing.some((row) => row.releaseMechanism === "microbial_mineralization")) {
        score -= 10;
        reasons.push("Dry media slows microbial mineralization.");
      }
      if (environment.isConcentrate) {
        const hasCalciumSalt = timing.some(
          (row) => row.nutrient === "calcium" && row.releaseMechanism === "water_soluble"
        );
        const hasPhosphate = timing.some((row) => row.form.includes("phosphate"));
        if (hasCalciumSalt && hasPhosphate) score -= 24;
      }

      if (!reasons.length) reasons.push(...intentHints.slice(0, 2));
      if (ingredient.warnings.length) reasons.push(...ingredient.warnings);

      return {
        ingredient,
        score,
        reasons: Array.from(new Set(reasons)),
        fitLabel: releaseClassFromDays(fastest),
        releaseSummary: summarizeReleaseCurve(timing),
        timing
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function checkCompatibility(ingredients: NutrientIngredient[], environment: NutrientEnvironment) {
  const warnings: string[] = [];
  const totals = ingredients.reduce(
    (acc, ingredient) => ({
      Ca: acc.Ca + (ingredient.elemental.Ca || 0),
      Mg: acc.Mg + (ingredient.elemental.Mg || 0),
      K: acc.K + (ingredient.elemental.K || 0),
      P: acc.P + (ingredient.elemental.P || 0),
      N: acc.N + (ingredient.elemental.N || 0)
    }),
    { Ca: 0, Mg: 0, K: 0, P: 0, N: 0 }
  );

  const hasCalciumSalt = ingredients.some((ingredient) =>
    ingredient.nutrientForms.some(
      (form) => form.nutrient === "calcium" && form.releaseMechanism === "water_soluble"
    )
  );
  const hasPhosphate = ingredients.some((ingredient) =>
    ingredient.nutrientForms.some((form) => form.form.includes("phosphate"))
  );

  if (environment.isConcentrate && hasCalciumSalt && hasPhosphate) {
    warnings.push("Calcium salts and phosphate sources can precipitate in concentrated stock solutions. Separate A/B stock if needed.");
  }
  if (totals.Ca > 0 && totals.K > totals.Ca * 2.5) {
    warnings.push("High potassium relative to calcium may contribute to Ca/Mg uptake imbalance.");
  }
  if (environment.pH != null && environment.pH > 7 && ingredients.some((ingredient) => ingredient.bestUseCases.some((use) => use.toLowerCase().includes("raise pH")))) {
    warnings.push("Lime or buffering materials may worsen already high-pH media and reduce micronutrient availability.");
  }
  if (environment.stage === "late_flower" && ingredients.some((ingredient) => ingredient.intentTags.includes("long_term_soil"))) {
    warnings.push("Long-horizon soil-building inputs may not move fast enough for late flower correction.");
  }
  return Array.from(new Set(warnings));
}

export function compareIngredientsBySpeed(nutrient: NutrientKey, intent: NutrientIntent, environment: NutrientEnvironment) {
  const ranked = recommendIngredients(nutrient, intent, environment);
  return {
    fast: ranked.filter((row) => row.fitLabel === "immediate" || row.fitLabel === "fast").slice(0, 3),
    medium: ranked.filter((row) => row.fitLabel === "medium").slice(0, 3),
    slow: ranked.filter((row) => row.fitLabel === "slow" || row.fitLabel === "very_slow").slice(0, 3)
  };
}

export function getIngredientById(id: string) {
  return ingredientLibrary.find((ingredient) => ingredient.id === id) || null;
}
