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
export type EvidenceClass =
  | "verified_label"
  | "user_entered"
  | "typical_estimate"
  | "manufacturer_source"
  | "extension_backed_estimate"
  | "lab_tested";
export type ReleaseMechanism =
  | "water_soluble"
  | "microbial_mineralization"
  | "carbonate_dissolution"
  | "acid_reaction"
  | "chelated"
  | "mineral_weathering"
  | "organic_matrix";

export type NitrogenForm = "nitrate" | "ammonium" | "urea" | "organic_protein";
export type ChelatingAgent = "EDTA" | "DTPA" | "EDDHA";
export type RiskSeverity = "low" | "medium" | "high";
export type NitrogenRiskCode =
  | "leaching"
  | "volatilization"
  | "acidification"
  | "slow_mineralization";
export type NitrogenRiskCondition =
  | "always"
  | "wet_media"
  | "dry_media"
  | "low_microbes"
  | "cool_media"
  | "high_ph";

export type NitrogenRisk = {
  code: NitrogenRiskCode;
  severity: RiskSeverity;
  condition: NitrogenRiskCondition;
  summary: string;
  mitigation: string;
};

export type FormIntelligence = {
  nitrogenForm?: NitrogenForm;
  nitrogenRisks?: NitrogenRisk[];
  chelate?: {
    agent: ChelatingAgent;
    /** Approximate upper pH where the chelate remains dependable. */
    stableThroughPH: number;
  };
};

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

export type NutrientForm = FormIntelligence & {
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

export type ElementalAnalysis = {
  N?: number;
  P?: number;
  K?: number;
  Ca?: number;
  Mg?: number;
  S?: number;
  Fe?: number;
};

export type LabResultOverrides = Partial<ElementalAnalysis>;

export type NutrientIngredient = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  labelNPK: { N?: number; P?: number; K?: number };
  elemental: ElementalAnalysis;
  applicationGuide?: {
    /** Starter rate for the final diluted solution, not a concentrate stock. */
    typicalRateGPerL: number;
    maxRateGPerL: number;
    /** Approximate EC contribution in mS/cm for each g/L of product. */
    estimatedEcPerGPerL: number;
  };
  nutrientForms: NutrientForm[];
  bestUseCases: string[];
  badUseCases: string[];
  warnings: string[];
  sourceType: "user_entered" | "verified" | "extension_reference" | "manufacturer";
  confidence: SourceConfidence;
  /** Evidence classification is normalized for display and persisted tool runs. */
  evidence?: {
    classification: EvidenceClass;
    sourceName: string;
    reference?: string;
  };
  intentTags: NutrientIntent[];
  nutrientTags: NutrientKey[];
};

export type ReleaseCurveRow = NutrientForm & {
  adjustedReleaseDays: { min: number; max: number };
  fitLabel: string;
  activeNitrogenRisks: NitrogenRisk[];
};

export type IngredientRecommendation = {
  ingredient: NutrientIngredient;
  score: number;
  reasons: string[];
  fitLabel: string;
  releaseSummary: string;
  timing: ReleaseCurveRow[];
};

export type NutrientLoads = {
  N: number;
  P: number;
  K: number;
  Ca: number;
  Mg: number;
  S: number;
  Fe: number;
};

export type CompatibilityIssueCode =
  | "rate_ceiling"
  | "estimated_ec"
  | "concentrate_precipitation"
  | "potassium_calcium_imbalance"
  | "potassium_magnesium_imbalance"
  | "calcium_magnesium_imbalance"
  | "high_ec_inputs"
  | "alkaline_buffering"
  | "nitrogen_risk"
  | "late_stage_timing";

export type CompatibilityIssue = {
  code: CompatibilityIssueCode;
  severity: RiskSeverity;
  message: string;
  remediation: string;
  ingredientIds: string[];
};

export type CompatibilityAnalysis = {
  issues: CompatibilityIssue[];
  warnings: string[];
  nutrientLoadsGPerL: NutrientLoads | null;
  estimatedEcContribution: number | null;
  appliedLabOverrides: Record<string, LabResultOverrides>;
};

export type ReleaseWindowKey = "0_3d" | "3_14d" | "14_45d" | "45_120d" | "120d_plus";

export type ReleaseTimelineEntry = {
  ingredientId: string;
  ingredientName: string;
  nutrient: string;
  chemicalForm: string;
  releaseClass: ReleaseClass;
  adjustedReleaseDays: { min: number; max: number };
};

export type ReleaseTimelineWindow = {
  key: ReleaseWindowKey;
  label: string;
  startDay: number;
  endDay: number | null;
  entries: ReleaseTimelineEntry[];
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
  {
    key: "without_raising_ph",
    label: "No liming",
    hint: "Add nutrient without pushing pH up"
  },
  { key: "raise_ph", label: "Raise pH", hint: "Buffer or lift acidic media" },
  {
    key: "calcium_plus_magnesium",
    label: "Ca + Mg",
    hint: "Choose a source that adds both"
  },
  { key: "high_pH_iron", label: "High-pH iron", hint: "Stable iron above neutral pH" },
  { key: "nitrogen_support", label: "N support", hint: "Quick to slow nitrogen sources" },
  {
    key: "phosphorus_support",
    label: "P support",
    hint: "Phosphorus with release timing in mind"
  }
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
    applicationGuide: {
      typicalRateGPerL: 1,
      maxRateGPerL: 2,
      estimatedEcPerGPerL: 0.85
    },
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
        nitrogenForm: "nitrate",
        nitrogenRisks: [
          {
            code: "leaching",
            severity: "high",
            condition: "wet_media",
            summary: "Mobile nitrate can leach from saturated or over-irrigated media.",
            mitigation:
              "Use smaller split applications and correct drainage or irrigation first."
          }
        ],
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
    applicationGuide: {
      typicalRateGPerL: 0.5,
      maxRateGPerL: 1,
      estimatedEcPerGPerL: 0.9
    },
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
    badUseCases: [
      "chloride-sensitive crops",
      "broad soil building",
      "phosphate concentrates"
    ],
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
    applicationGuide: {
      typicalRateGPerL: 0.5,
      maxRateGPerL: 1,
      estimatedEcPerGPerL: 0.6
    },
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
        nitrogenForm: "organic_protein",
        nitrogenRisks: [
          {
            code: "slow_mineralization",
            severity: "medium",
            condition: "low_microbes",
            summary: "Low microbial activity can delay organic nitrogen release.",
            mitigation:
              "Use a faster nitrogen source when the crop cannot wait for biology."
          },
          {
            code: "slow_mineralization",
            severity: "medium",
            condition: "cool_media",
            summary: "Cool media can delay organic nitrogen mineralization.",
            mitigation:
              "Allow a longer release window or use a faster supplemental source."
          }
        ],
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
        nitrogenForm: "organic_protein",
        nitrogenRisks: [
          {
            code: "slow_mineralization",
            severity: "high",
            condition: "low_microbes",
            summary:
              "Low microbial activity can substantially delay feather-meal nitrogen.",
            mitigation:
              "Reserve it for pre-mix or use a faster source for current deficiencies."
          },
          {
            code: "slow_mineralization",
            severity: "medium",
            condition: "cool_media",
            summary:
              "Cool media can extend feather-meal release beyond the expected window.",
            mitigation:
              "Apply earlier or choose a source that does not require mineralization."
          },
          {
            code: "slow_mineralization",
            severity: "medium",
            condition: "dry_media",
            summary:
              "Dry media suppresses the biology needed to release feather-meal nitrogen.",
            mitigation:
              "Restore suitable root-zone moisture before relying on this source."
          }
        ],
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
    applicationGuide: {
      typicalRateGPerL: 0.5,
      maxRateGPerL: 1,
      estimatedEcPerGPerL: 0.4
    },
    nutrientForms: [
      {
        nutrient: "nitrogen",
        form: "urea",
        nitrogenForm: "urea",
        nitrogenRisks: [
          {
            code: "volatilization",
            severity: "high",
            condition: "high_ph",
            summary: "Urea has elevated ammonia-loss risk in alkaline media.",
            mitigation:
              "Incorporate or water it in promptly and avoid unverified surface rates."
          }
        ],
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
    applicationGuide: {
      typicalRateGPerL: 0.5,
      maxRateGPerL: 1.5,
      estimatedEcPerGPerL: 0.95
    },
    nutrientForms: [
      {
        nutrient: "nitrogen",
        form: "ammonium",
        nitrogenForm: "ammonium",
        nitrogenRisks: [
          {
            code: "acidification",
            severity: "medium",
            condition: "always",
            summary: "Repeated ammonium use can acidify the root zone over time.",
            mitigation: "Track root-zone pH and balance the complete nitrogen program."
          }
        ],
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
    bestUseCases: [
      "fast nitrogen support",
      "sulfur support",
      "acidifying saline programs"
    ],
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
    applicationGuide: {
      typicalRateGPerL: 0.5,
      maxRateGPerL: 1.5,
      estimatedEcPerGPerL: 0.65
    },
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
    id: "fe-edta",
    name: "Iron EDTA",
    category: "chelate",
    labelNPK: {},
    elemental: { Fe: 13 },
    nutrientForms: [
      {
        nutrient: "iron",
        form: "chelate",
        chemicalName: "iron EDTA",
        chelate: { agent: "EDTA", stableThroughPH: 6.5 },
        availabilityClass: "fast",
        estimatedReleaseDays: { min: 1, max: 14 },
        releaseMechanism: "chelated",
        pHEffect: "neutral",
        ecImpact: "low",
        mobility: "variable",
        notes: "Economical soluble iron for acidic to near-neutral root zones."
      }
    ],
    bestUseCases: ["iron correction below pH 6.5", "acidic media"],
    badUseCases: ["alkaline media", "high pH iron correction"],
    warnings: [
      "Iron availability falls quickly when EDTA is used above its stable pH range."
    ],
    sourceType: "extension_reference",
    confidence: "high",
    intentTags: ["fast_fix", "without_raising_ph"],
    nutrientTags: ["iron"]
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
        chelate: { agent: "DTPA", stableThroughPH: 7.5 },
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
        chelate: { agent: "EDDHA", stableThroughPH: 9 },
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
      return [
        "Immediate correction or rescue inputs",
        "Prioritize soluble or chelated sources"
      ];
    case "long_term_soil":
      return [
        "Background feeding and pre-mix inputs",
        "Prioritize biological or mineral-release sources"
      ];
    case "without_raising_ph":
      return [
        "Avoid carbonate liming materials",
        "Favor neutral or slightly acidifying sources"
      ];
    case "raise_ph":
      return [
        "Favor carbonate or buffering materials",
        "Do not use this for fast rescue"
      ];
    case "calcium_plus_magnesium":
      return [
        "Select a source that contributes both Ca and Mg",
        "Dolomitic lime is the common soil example"
      ];
    case "high_pH_iron":
      return [
        "Choose chelated iron with stronger high-pH stability",
        "EDDHA is the safest starter choice"
      ];
    case "nitrogen_support":
      return [
        "Fast N can come from salts; slow N from meals",
        "Release timing matters more than the label"
      ];
    case "phosphorus_support":
      return [
        "Phosphorus availability is often biology-dependent",
        "Check whether the need is immediate or soil-building"
      ];
    default:
      return [];
  }
}

export function getIngredientsForNutrient(nutrient: NutrientKey) {
  return ingredientLibrary.filter((ingredient) =>
    ingredient.nutrientTags.includes(nutrient)
  );
}

export function getActiveNitrogenRisks(
  form: NutrientForm,
  environment: NutrientEnvironment
): NitrogenRisk[] {
  return (form.nitrogenRisks || []).filter((risk) => {
    switch (risk.condition) {
      case "always":
        return true;
      case "wet_media":
        return environment.moisture === "wet";
      case "dry_media":
        return environment.moisture === "dry";
      case "low_microbes":
        return environment.microbialActivity === "low";
      case "cool_media":
        return environment.soilTempC != null && environment.soilTempC < 15;
      case "high_ph":
        return environment.pH != null && environment.pH >= 7.5;
    }
  });
}

export function estimateReleaseCurve(
  ingredient: NutrientIngredient,
  environment: NutrientEnvironment
): ReleaseCurveRow[] {
  return ingredient.nutrientForms.map((form) => {
    let factor = 1;

    if (form.releaseMechanism === "water_soluble") factor *= 1.55;
    if (
      form.releaseMechanism === "microbial_mineralization" ||
      form.releaseMechanism === "organic_matrix"
    ) {
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
    if (form.chelate && environment.pH != null) {
      if (environment.pH <= form.chelate.stableThroughPH) factor *= 1.15;
      else factor *= 0.65;
    }

    const adjustedMin = Math.max(0, Math.round(form.estimatedReleaseDays.min / factor));
    const adjustedMax = Math.max(
      adjustedMin,
      Math.round(form.estimatedReleaseDays.max / factor)
    );

    let fitLabel = form.availabilityClass;
    if (adjustedMin <= 1) fitLabel = "immediate";
    else if (adjustedMin <= 7) fitLabel = "fast";
    else if (adjustedMin <= 21) fitLabel = "medium";
    else if (adjustedMin <= 60) fitLabel = "slow";
    else fitLabel = "very_slow";

    return {
      ...form,
      adjustedReleaseDays: { min: adjustedMin, max: adjustedMax },
      fitLabel,
      activeNitrogenRisks: getActiveNitrogenRisks(form, environment)
    };
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

const RELEASE_WINDOWS: Omit<ReleaseTimelineWindow, "entries">[] = [
  { key: "0_3d", label: "0-3 days", startDay: 0, endDay: 3 },
  { key: "3_14d", label: "3-14 days", startDay: 3, endDay: 14 },
  { key: "14_45d", label: "14-45 days", startDay: 14, endDay: 45 },
  { key: "45_120d", label: "45-120 days", startDay: 45, endDay: 120 },
  { key: "120d_plus", label: "120+ days", startDay: 120, endDay: null }
];

/** Groups adjusted release ranges into every time band they overlap. */
export function buildReleaseTimeline(
  ingredients: NutrientIngredient[],
  environment: NutrientEnvironment
): ReleaseTimelineWindow[] {
  const entries = ingredients.flatMap((ingredient) =>
    estimateReleaseCurve(ingredient, environment).map((form) => ({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      nutrient: form.nutrient,
      chemicalForm: form.chemicalName,
      releaseClass: form.fitLabel as ReleaseClass,
      adjustedReleaseDays: form.adjustedReleaseDays
    }))
  );

  return RELEASE_WINDOWS.map((window) => ({
    ...window,
    entries: entries.filter((entry) => {
      const end = window.endDay ?? Number.POSITIVE_INFINITY;
      return (
        entry.adjustedReleaseDays.min <= end &&
        entry.adjustedReleaseDays.max >= window.startDay
      );
    })
  }));
}

export function getIngredientEvidence(
  ingredient: NutrientIngredient,
  referenceUrl?: string
): NonNullable<NutrientIngredient["evidence"]> {
  if (ingredient.evidence) {
    return {
      ...ingredient.evidence,
      reference: referenceUrl || ingredient.evidence.reference
    };
  }
  const classification: EvidenceClass =
    ingredient.sourceType === "verified"
      ? "verified_label"
      : ingredient.sourceType === "manufacturer"
        ? "manufacturer_source"
        : ingredient.sourceType === "extension_reference"
          ? "extension_backed_estimate"
          : "user_entered";
  return {
    classification,
    sourceName:
      classification === "extension_backed_estimate"
        ? "Extension reference"
        : classification.replaceAll("_", " "),
    reference: referenceUrl
  };
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
        if (
          timing.some((row) => row.pHEffect === "neutral" || row.pHEffect === "lowers_pH")
        )
          score += 18;
      }
      if (intent === "raise_ph") {
        if (
          timing.some(
            (row) => row.pHEffect === "raises_pH" || row.pHEffect === "buffers_pH"
          )
        )
          score += 18;
      }
      if (
        intent === "calcium_plus_magnesium" &&
        ingredient.elemental.Ca &&
        ingredient.elemental.Mg
      )
        score += 32;
      if (intent === "high_pH_iron") {
        const chelate = timing.find((row) => row.chelate)?.chelate;
        if (chelate && environment.pH != null) {
          if (environment.pH <= chelate.stableThroughPH) score += 30;
          else {
            score -= 30;
            reasons.push(
              `${chelate.agent} is not dependable above approximately pH ${chelate.stableThroughPH}.`
            );
          }
        }
      }
      if (environment.daysUntilNeed != null) {
        if (fastest <= environment.daysUntilNeed) score += 12;
        else score -= 8;
      }
      if (environment.pH != null && environment.pH > 7) {
        if (timing.some((row) => row.pHEffect === "raises_pH")) score -= 12;
        if (
          timing.some(
            (row) => row.nutrient === "iron" && row.releaseMechanism === "chelated"
          )
        )
          score += 8;
      }
      if (
        environment.microbialActivity === "low" &&
        timing.some((row) => row.releaseMechanism === "microbial_mineralization")
      ) {
        score -= 14;
        reasons.push("Low biological activity may slow microbe-released sources.");
      }
      if (
        environment.moisture === "dry" &&
        timing.some((row) => row.releaseMechanism === "microbial_mineralization")
      ) {
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

      const activeNitrogenRisks = timing.flatMap((row) => row.activeNitrogenRisks);
      for (const risk of activeNitrogenRisks) {
        score -= risk.severity === "high" ? 12 : risk.severity === "medium" ? 6 : 2;
        reasons.push(`${risk.summary} Mitigation: ${risk.mitigation}`);
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

export function analyzeCompatibility(
  ingredients: NutrientIngredient[],
  environment: NutrientEnvironment,
  ratesGPerL: Record<string, number | null> = {},
  labOverrides: Record<string, LabResultOverrides> = {}
): CompatibilityAnalysis {
  const issues: CompatibilityIssue[] = [];
  const addIssue = (issue: CompatibilityIssue) => {
    const existing = issues.find(
      (row) => row.code === issue.code && row.message === issue.message
    );
    if (existing) {
      existing.ingredientIds = Array.from(
        new Set([...existing.ingredientIds, ...issue.ingredientIds])
      );
    } else {
      issues.push({
        ...issue,
        ingredientIds: Array.from(new Set(issue.ingredientIds))
      });
    }
  };
  const ingredientIds = ingredients.map((ingredient) => ingredient.id);
  const hasRateInputs = ingredients.some(
    (ingredient) =>
      Object.prototype.hasOwnProperty.call(ratesGPerL, ingredient.id) &&
      ratesGPerL[ingredient.id] != null
  );
  const totals = ingredients.reduce(
    (acc, ingredient) => {
      const rate = ratesGPerL[ingredient.id];
      const multiplier = hasRateInputs ? (rate != null ? Math.max(0, rate) / 100 : 0) : 1;
      const override = labOverrides[ingredient.id] || {};
      const elemental = Object.fromEntries(
        Object.entries({ ...ingredient.elemental, ...override }).map(([key, value]) => [
          key,
          typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 100
            ? value
            : ingredient.elemental[key as keyof ElementalAnalysis]
        ])
      ) as ElementalAnalysis;
      return {
        N: acc.N + (elemental.N || 0) * multiplier,
        P: acc.P + (elemental.P || 0) * multiplier,
        K: acc.K + (elemental.K || 0) * multiplier,
        Ca: acc.Ca + (elemental.Ca || 0) * multiplier,
        Mg: acc.Mg + (elemental.Mg || 0) * multiplier,
        S: acc.S + (elemental.S || 0) * multiplier,
        Fe: acc.Fe + (elemental.Fe || 0) * multiplier
      };
    },
    { N: 0, P: 0, K: 0, Ca: 0, Mg: 0, S: 0, Fe: 0 } as NutrientLoads
  );

  const estimatedEcContribution = hasRateInputs
    ? ingredients.reduce((total, ingredient) => {
        const rate = ratesGPerL[ingredient.id];
        const coefficient = ingredient.applicationGuide?.estimatedEcPerGPerL;
        return total + (rate != null && coefficient != null ? rate * coefficient : 0);
      }, 0)
    : null;

  if (hasRateInputs) {
    for (const ingredient of ingredients) {
      const rate = ratesGPerL[ingredient.id];
      const guide = ingredient.applicationGuide;
      if (rate != null && guide && rate > guide.maxRateGPerL) {
        addIssue({
          code: "rate_ceiling",
          severity: "high",
          message: `${ingredient.name} is entered at ${rate} g/L, above this model's ${guide.maxRateGPerL} g/L screening ceiling.`,
          remediation: "Verify the product label and crop tolerance before application.",
          ingredientIds: [ingredient.id]
        });
      }
    }
    if (estimatedEcContribution != null && estimatedEcContribution >= 2.5) {
      addIssue({
        code: "estimated_ec",
        severity: "high",
        message: `Entered rates contribute approximately ${estimatedEcContribution.toFixed(2)} mS/cm EC before source water and other inputs.`,
        remediation: "Confirm the complete solution with a calibrated EC meter.",
        ingredientIds
      });
    }
  }

  const hasCalciumSalt = ingredients.some((ingredient) =>
    ingredient.nutrientForms.some(
      (form) => form.nutrient === "calcium" && form.releaseMechanism === "water_soluble"
    )
  );
  const hasPhosphate = ingredients.some((ingredient) =>
    ingredient.nutrientForms.some((form) => form.form.includes("phosphate"))
  );

  if (environment.isConcentrate && hasCalciumSalt && hasPhosphate) {
    addIssue({
      code: "concentrate_precipitation",
      severity: "high",
      message:
        "Calcium salts and phosphate sources can precipitate in concentrated stock solutions.",
      remediation: "Separate incompatible materials into A/B stock solutions.",
      ingredientIds
    });
  }
  if (totals.Ca > 0 && totals.K > totals.Ca * 2.5) {
    addIssue({
      code: "potassium_calcium_imbalance",
      severity: "medium",
      message:
        "High potassium relative to calcium may contribute to Ca/Mg uptake imbalance.",
      remediation: "Verify the complete feed ratio before increasing potassium.",
      ingredientIds
    });
  }
  if (totals.Mg > 0 && totals.K > totals.Mg * 3) {
    addIssue({
      code: "potassium_magnesium_imbalance",
      severity: "medium",
      message: "High potassium relative to magnesium may suppress Mg uptake.",
      remediation: "Verify the complete feed ratio before increasing potassium.",
      ingredientIds
    });
  }
  if (hasRateInputs && totals.Ca > 0 && totals.Mg > 0 && totals.Ca > totals.Mg * 8) {
    addIssue({
      code: "calcium_magnesium_imbalance",
      severity: "medium",
      message: "Entered rates are heavily calcium-weighted relative to magnesium.",
      remediation: "Verify the complete Ca:Mg target before application.",
      ingredientIds
    });
  }
  if (hasRateInputs && totals.Ca > 0 && totals.Mg > totals.Ca * 2) {
    addIssue({
      code: "calcium_magnesium_imbalance",
      severity: "medium",
      message: "Entered rates are heavily magnesium-weighted relative to calcium.",
      remediation: "Verify the complete Ca:Mg target before application.",
      ingredientIds
    });
  }
  const highEcForms = ingredients.flatMap((ingredient) =>
    ingredient.nutrientForms.filter((form) => form.ecImpact === "high")
  );
  if (highEcForms.length >= 2 || (highEcForms.length >= 1 && environment.isConcentrate)) {
    addIssue({
      code: "high_ec_inputs",
      severity: "high",
      message: "High-EC soluble inputs are combined here.",
      remediation: "Confirm final dilution and root-zone EC before application.",
      ingredientIds
    });
  }
  if (
    environment.pH != null &&
    environment.pH > 7 &&
    ingredients.some((ingredient) =>
      ingredient.nutrientForms.some(
        (form) => form.pHEffect === "raises_pH" || form.pHEffect === "buffers_pH"
      )
    )
  ) {
    addIssue({
      code: "alkaline_buffering",
      severity: "high",
      message:
        "Lime or buffering materials may worsen already high-pH media and reduce micronutrient availability.",
      remediation: "Avoid additional buffering until pH and alkalinity are confirmed.",
      ingredientIds
    });
  }
  for (const ingredient of ingredients) {
    for (const risk of estimateReleaseCurve(ingredient, environment).flatMap(
      (form) => form.activeNitrogenRisks
    )) {
      addIssue({
        code: "nitrogen_risk",
        severity: risk.severity,
        message: `Nitrogen risk (${risk.severity}): ${risk.summary}`,
        remediation: risk.mitigation,
        ingredientIds: [ingredient.id]
      });
    }
  }
  if (
    environment.stage === "late_flower" &&
    ingredients.some((ingredient) => ingredient.intentTags.includes("long_term_soil"))
  ) {
    addIssue({
      code: "late_stage_timing",
      severity: "medium",
      message:
        "Long-horizon soil-building inputs may not move fast enough for late flower correction.",
      remediation:
        "Use a faster source for the current run or reserve this input for the next cycle.",
      ingredientIds
    });
  }
  return {
    issues,
    warnings: issues.map((issue) => `${issue.message} ${issue.remediation}`),
    nutrientLoadsGPerL: hasRateInputs ? totals : null,
    estimatedEcContribution,
    appliedLabOverrides: Object.fromEntries(
      Object.entries(labOverrides).filter(
        ([, override]) => Object.keys(override).length > 0
      )
    )
  };
}

export function checkCompatibility(
  ingredients: NutrientIngredient[],
  environment: NutrientEnvironment,
  ratesGPerL: Record<string, number | null> = {},
  labOverrides: Record<string, LabResultOverrides> = {}
) {
  return analyzeCompatibility(ingredients, environment, ratesGPerL, labOverrides)
    .warnings;
}

export function compareIngredientsBySpeed(
  nutrient: NutrientKey,
  intent: NutrientIntent,
  environment: NutrientEnvironment
) {
  const ranked = recommendIngredients(nutrient, intent, environment);
  return {
    fast: ranked
      .filter((row) => row.fitLabel === "immediate" || row.fitLabel === "fast")
      .slice(0, 3),
    medium: ranked.filter((row) => row.fitLabel === "medium").slice(0, 3),
    slow: ranked
      .filter((row) => row.fitLabel === "slow" || row.fitLabel === "very_slow")
      .slice(0, 3)
  };
}

export function getIngredientById(id: string) {
  return ingredientLibrary.find((ingredient) => ingredient.id === id) || null;
}
