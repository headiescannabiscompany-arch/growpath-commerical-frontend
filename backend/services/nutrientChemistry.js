"use strict";

const CHEMISTRY_PRESETS = {
  water_soluble_nitrate: {
    label: "Water-soluble nitrate salt",
    form: "nitrate",
    chemicalName: "Nitrate salt",
    availabilityClass: "immediate",
    releaseDays: { min: 0, max: 2 },
    releaseMechanism: "water_soluble",
    pHEffect: "depends",
    ecImpact: "high",
    mobility: "mobile",
    solubility: "high",
    confidence: "medium"
  },
  water_soluble_ammonium: {
    label: "Water-soluble ammonium salt",
    form: "ammonium",
    chemicalName: "Ammonium salt",
    availabilityClass: "immediate",
    releaseDays: { min: 0, max: 2 },
    releaseMechanism: "water_soluble",
    pHEffect: "acidifying_tendency",
    ecImpact: "high",
    mobility: "moderately_mobile",
    solubility: "high",
    confidence: "medium"
  },
  urea: {
    label: "Urea nitrogen",
    form: "urea",
    chemicalName: "Urea",
    availabilityClass: "fast",
    releaseDays: { min: 2, max: 14 },
    releaseMechanism: "hydrolysis_then_nitrification",
    pHEffect: "depends",
    ecImpact: "medium",
    mobility: "mobile",
    solubility: "high",
    confidence: "medium"
  },
  soluble_phosphate: {
    label: "Water-soluble phosphate",
    form: "phosphate",
    chemicalName: "Soluble phosphate salt",
    availabilityClass: "immediate",
    releaseDays: { min: 0, max: 3 },
    releaseMechanism: "water_soluble",
    pHEffect: "depends",
    ecImpact: "high",
    mobility: "low",
    solubility: "high",
    confidence: "medium"
  },
  sulfate_salt: {
    label: "Sulfate mineral salt",
    form: "sulfate",
    chemicalName: "Sulfate salt",
    availabilityClass: "fast",
    releaseDays: { min: 0, max: 14 },
    releaseMechanism: "dissolution",
    pHEffect: "generally_not_liming",
    ecImpact: "medium",
    mobility: "moderately_mobile",
    solubility: "moderate",
    confidence: "medium"
  },
  gypsum: {
    label: "Gypsum",
    form: "calcium_sulfate",
    chemicalName: "Calcium sulfate",
    availabilityClass: "medium",
    releaseDays: { min: 7, max: 45 },
    releaseMechanism: "mineral_dissolution",
    pHEffect: "generally_not_liming",
    ecImpact: "low_to_medium",
    mobility: "moderately_mobile",
    solubility: "moderate",
    confidence: "medium",
    warnings: ["Do not model gypsum as a pH-down or liming product."]
  },
  carbonate_lime: {
    label: "Calcitic lime / carbonate",
    form: "calcium_carbonate",
    chemicalName: "Calcium carbonate",
    availabilityClass: "slow",
    releaseDays: { min: 30, max: 180 },
    releaseMechanism: "carbonate_dissolution",
    pHEffect: "raises_or_buffers_pH",
    ecImpact: "low",
    mobility: "low",
    solubility: "low",
    confidence: "medium"
  },
  dolomitic_lime: {
    label: "Dolomitic lime",
    form: "calcium_magnesium_carbonate",
    chemicalName: "Calcium magnesium carbonate",
    availabilityClass: "slow",
    releaseDays: { min: 30, max: 180 },
    releaseMechanism: "carbonate_dissolution",
    pHEffect: "raises_or_buffers_pH",
    ecImpact: "low",
    mobility: "low",
    solubility: "low",
    confidence: "medium"
  },
  organic_protein_meal: {
    label: "Protein meal / organic nitrogen",
    form: "organic_protein",
    chemicalName: "Organic protein nitrogen",
    availabilityClass: "slow",
    releaseDays: { min: 21, max: 120 },
    releaseMechanism: "microbial_mineralization",
    pHEffect: "depends",
    ecImpact: "low",
    mobility: "low_until_mineralized",
    solubility: "low",
    confidence: "low"
  },
  organic_meal: {
    label: "Mixed organic meal",
    form: "organic_and_mineral_bound",
    chemicalName: "Variable organic amendment",
    availabilityClass: "medium",
    releaseDays: { min: 14, max: 90 },
    releaseMechanism: "microbial_mineralization",
    pHEffect: "depends",
    ecImpact: "low",
    mobility: "low_until_mineralized",
    solubility: "low_to_moderate",
    confidence: "low"
  },
  bone_meal: {
    label: "Bone meal / calcium phosphate",
    form: "calcium_phosphate",
    chemicalName: "Bone-derived calcium phosphate",
    availabilityClass: "slow",
    releaseDays: { min: 30, max: 180 },
    releaseMechanism: "microbial_and_acid_dissolution",
    pHEffect: "depends",
    ecImpact: "low",
    mobility: "low",
    solubility: "low",
    confidence: "low",
    warnings: ["Not a fast calcium correction; repeated use can accumulate phosphorus."]
  },
  rock_mineral: {
    label: "Rock mineral / weathering source",
    form: "mineral_bound",
    chemicalName: "Variable mineral matrix",
    availabilityClass: "very_slow",
    releaseDays: { min: 90, max: 365 },
    releaseMechanism: "mineral_weathering",
    pHEffect: "depends",
    ecImpact: "low",
    mobility: "low",
    solubility: "very_low",
    confidence: "low"
  },
  chelated_micronutrient: {
    label: "Chelated micronutrient",
    form: "chelate",
    chemicalName: "User-specified chelate",
    availabilityClass: "immediate",
    releaseDays: { min: 0, max: 3 },
    releaseMechanism: "chelated",
    pHEffect: "neutral",
    ecImpact: "low",
    mobility: "depends_on_nutrient",
    solubility: "high",
    confidence: "medium"
  },
  unknown: {
    label: "Unknown / user-defined form",
    form: "unknown",
    chemicalName: "Unknown",
    availabilityClass: "unknown",
    releaseDays: { min: null, max: null },
    releaseMechanism: "unknown",
    pHEffect: "depends",
    ecImpact: "unknown",
    mobility: "unknown",
    solubility: "unknown",
    confidence: "low"
  }
};

function releaseMultiplier(preset, environment = {}) {
  let multiplier = 1;
  if (preset.releaseMechanism === "microbial_mineralization") {
    const temp = Number(environment.soilTempC);
    if (Number.isFinite(temp)) {
      if (temp < 10) multiplier *= 0.4;
      else if (temp < 16) multiplier *= 0.65;
      else if (temp >= 20 && temp <= 28) multiplier *= 1.1;
      else if (temp > 32) multiplier *= 0.75;
    }
    if (environment.moisture === "dry") multiplier *= 0.6;
    if (environment.moisture === "waterlogged") multiplier *= 0.65;
    if (environment.moisture === "even") multiplier *= 1.05;
    if (environment.livingSoil) multiplier *= 1.1;
    if (Number(environment.cookDays) >= 21) multiplier *= 1.1;
  }
  if (environment.particleSize === "fine") multiplier *= 1.1;
  if (environment.particleSize === "coarse") multiplier *= 0.8;
  return Math.max(0.25, Math.min(1.5, multiplier));
}

function estimateProductRelease(product, environment = {}) {
  const preset = CHEMISTRY_PRESETS[product.chemistryKey] || CHEMISTRY_PRESETS.unknown;
  const multiplier = releaseMultiplier(preset, environment);
  const releaseDays = preset.releaseDays.min == null
    ? { min: null, max: null }
    : {
        min: Math.max(0, Math.round(preset.releaseDays.min / multiplier)),
        max: Math.max(1, Math.round(preset.releaseDays.max / multiplier))
      };
  return {
    chemistryKey: product.chemistryKey || "unknown",
    label: preset.label,
    form: product.chemicalForm || preset.form,
    chemicalName: product.chemicalName || preset.chemicalName,
    availabilityClass: preset.availabilityClass,
    estimatedReleaseDays: releaseDays,
    releaseMechanism: preset.releaseMechanism,
    pHEffect: preset.pHEffect,
    ecImpact: preset.ecImpact,
    mobility: preset.mobility,
    solubility: preset.solubility,
    conditionMultiplier: Number(multiplier.toFixed(2)),
    confidence: product.chemistryConfidence || preset.confidence,
    sourceType: product.sourceType || "curated_default",
    warnings: preset.warnings || []
  };
}

function releaseBucket(release) {
  const min = release.estimatedReleaseDays.min;
  if (min == null) return "unknown";
  if (min <= 3) return "day_0_3";
  if (min <= 14) return "day_3_14";
  if (min <= 45) return "day_14_45";
  if (min <= 120) return "day_45_120";
  return "day_120_plus";
}

function buildReleaseTimeline(rows) {
  const timeline = {
    day_0_3: [], day_3_14: [], day_14_45: [], day_45_120: [], day_120_plus: [], unknown: []
  };
  rows.forEach((row) => timeline[releaseBucket(row.chemistry)].push({
    name: row.name,
    form: row.chemistry.form,
    mechanism: row.chemistry.releaseMechanism,
    estimatedReleaseDays: row.chemistry.estimatedReleaseDays,
    confidence: row.chemistry.confidence
  }));
  return timeline;
}

function compatibilityWarnings(input, rows, totals) {
  const warnings = [];
  const keys = rows.map((row) => row.chemistry.chemistryKey);
  const hasSolubleCalcium = rows.some((row) => /calcium/i.test(row.chemistry.chemicalName) && row.chemistry.solubility === "high");
  const hasSolublePhosphate = keys.includes("soluble_phosphate");
  if (input.isConcentrate && hasSolubleCalcium && hasSolublePhosphate) {
    warnings.push("Soluble calcium and phosphate can precipitate in concentrated stock. Use validated A/B stock separation and manufacturer directions.");
  }
  if (totals.Cappm > 0 && totals.Kppm > totals.Cappm * 2.5) {
    warnings.push("Potassium is high relative to calcium. Review possible K-driven Ca/Mg antagonism rather than adding more products automatically.");
  }
  if (Number(input.mediumPH) > 7 && keys.some((key) => ["carbonate_lime", "dolomitic_lime"].includes(key))) {
    warnings.push("Carbonate lime may worsen already-high media pH and micronutrient availability.");
  }
  return warnings;
}

function stageTimingWarnings(input, rows) {
  const daysUntilHarvest = Number(input.daysUntilHarvest);
  if (!Number.isFinite(daysUntilHarvest)) return [];
  return rows
    .filter((row) => row.chemistry.estimatedReleaseDays.min != null && row.chemistry.estimatedReleaseDays.min > daysUntilHarvest)
    .map((row) => `${row.name} may begin releasing after the current harvest window; consider it a next-cycle soil-building input.`);
}

module.exports = {
  CHEMISTRY_PRESETS,
  estimateProductRelease,
  buildReleaseTimeline,
  compatibilityWarnings,
  stageTimingWarnings
};
