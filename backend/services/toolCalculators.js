"use strict";

const {
  estimateProductRelease,
  buildReleaseTimeline,
  compatibilityWarnings,
  stageTimingWarnings
} = require("./nutrientChemistry");

function number(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number`);
  return parsed;
}

function celsius(value, unit = "C") {
  const n = number(value, "Temperature");
  return String(unit).toUpperCase() === "F" ? ((n - 32) * 5) / 9 : n;
}

function liters(value, unit = "L") {
  const n = number(value, "Volume");
  const normalized = String(unit).toLowerCase();
  if (["gal", "gallon"].includes(normalized)) return n * 3.78541;
  if (normalized === "ml") return n / 1000;
  return n;
}

const TOTAL_KEYS_BY_ELEMENT = {
  N: "Nppm",
  P: "Pppm",
  K: "Kppm",
  Ca: "Cappm",
  Mg: "Mgppm",
  S: "Sppm",
  Fe: "Feppm",
  Mn: "Mnppm",
  Zn: "Znppm",
  Cu: "Cuppm",
  B: "Bppm",
  Mo: "Moppm",
  Si: "Sippm"
};

function optionalNumber(value, label) {
  if (value == null || value === "") return null;
  return number(value, label);
}

function sourceConfidenceFor(product) {
  const explicit = String(product.sourceConfidence || product.confidence || "").toLowerCase();
  if (["high", "medium", "low"].includes(explicit)) return explicit;
  const sourceType = String(product.sourceType || "").toLowerCase();
  if (sourceType === "lab_tested") return "high";
  if (sourceType === "manufacturer" || sourceType === "extension_reference") return "medium";
  return "low";
}

function summarizeSourceConfidence(rows) {
  const rank = { low: 0, medium: 1, high: 2 };
  if (!rows.length) return { overall: "low", counts: { high: 0, medium: 0, low: 0 } };
  const counts = rows.reduce(
    (acc, row) => {
      acc[row.sourceConfidence] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const overall = rows.reduce((lowest, row) =>
    rank[row.sourceConfidence] < rank[lowest] ? row.sourceConfidence : lowest
  , "high");
  return { overall, counts };
}

function waterBaselineTotals(input = {}, warnings = []) {
  const baseline = input.waterBaseline || {};
  const totals = {};
  Object.entries(TOTAL_KEYS_BY_ELEMENT).forEach(([element, key]) => {
    const value = optionalNumber(baseline[element] ?? baseline[key], `Water ${element}`);
    if (value != null) totals[key] = value;
  });
  const alkalinity = optionalNumber(baseline.alkalinityPpm, "Water alkalinity");
  const sourceEC = optionalNumber(baseline.sourceEC, "Source water EC");
  const sourcePH = optionalNumber(baseline.sourcePH, "Source water pH");
  if (alkalinity != null && alkalinity > 120) {
    warnings.push("Source water alkalinity is high. Confirm acid demand and finished pH before feeding.");
  }
  if (sourceEC != null && sourceEC > 0.5) {
    warnings.push("Source water EC is elevated. Include baseline minerals when comparing measured EC.");
  }
  if (sourcePH != null && (sourcePH < 5.5 || sourcePH > 8.0)) {
    warnings.push("Source water pH is outside a typical mixing starting range. Measure finished solution pH.");
  }
  return {
    totals,
    sourceEC,
    sourcePH,
    alkalinityPpm: alkalinity
  };
}

function buildMixingOrder(rows, input = {}) {
  const order = ["Start with source water and record baseline EC/pH before adding products."];
  if (rows.some((row) => /silicate/i.test(row.chemistry.form || row.name))) {
    order.push("Add silica/silicate products first, dilute fully, then add the rest of the recipe.");
  }
  const calciumRows = rows.filter((row) => /calcium/i.test(row.chemistry.chemicalName || row.name));
  const phosphateRows = rows.filter((row) => /phosphate/i.test(row.chemistry.form || row.chemistry.chemicalName || row.name));
  if (input.isConcentrate && calciumRows.length && phosphateRows.length) {
    order.push("Keep calcium and phosphate products in separate A/B stock concentrates.");
  }
  order.push("Add base nutrients one at a time with agitation; wait for each product to dissolve.");
  order.push("Add supplements and micros after base nutrients unless the manufacturer specifies otherwise.");
  order.push("Measure and record finished EC and pH, then adjust only after the solution is fully mixed.");
  return order;
}

const RELEASE_WINDOWS = ["day_0_3", "day_3_14", "day_14_45", "day_45_120", "day_120_plus"];

function availabilityFractions(row) {
  const className = row.chemistry.availabilityClass;
  if (className === "immediate") return { day_0_3: 1 };
  if (className === "fast") return { day_0_3: 0.65, day_3_14: 0.35 };
  if (className === "medium") return { day_0_3: 0.15, day_3_14: 0.45, day_14_45: 0.3, day_45_120: 0.1 };
  if (className === "slow") return { day_3_14: 0.1, day_14_45: 0.3, day_45_120: 0.4, day_120_plus: 0.2 };
  if (className === "very_slow") return { day_14_45: 0.1, day_45_120: 0.3, day_120_plus: 0.6 };
  return { unknown: 1 };
}

function buildAvailabilityEstimate(rows, waterBaseline) {
  const emptyTotals = () =>
    Object.fromEntries(Object.values(TOTAL_KEYS_BY_ELEMENT).map((key) => [key, 0]));
  const windows = Object.fromEntries(
    [...RELEASE_WINDOWS, "unknown"].map((window) => [window, emptyTotals()])
  );
  Object.entries(waterBaseline.totals || {}).forEach(([key, value]) => {
    windows.day_0_3[key] += value;
  });
  rows.forEach((row) => {
    const fractions = availabilityFractions(row);
    Object.entries(fractions).forEach(([window, fraction]) => {
      Object.values(TOTAL_KEYS_BY_ELEMENT).forEach((key) => {
        windows[window][key] += (row[key] || 0) * fraction;
      });
    });
  });
  Object.values(windows).forEach((totals) => {
    Object.keys(totals).forEach((key) => {
      totals[key] = Number(totals[key].toFixed(1));
    });
  });
  return {
    windows,
    disclaimer:
      "Availability by window is an estimate from nutrient form and release class. It is not lab-verified plant uptake and can change with biology, temperature, moisture, pH, particle size, and product formulation."
  };
}

function validRh(value) {
  const rh = number(value, "Relative humidity");
  if (rh <= 0 || rh > 100) throw new Error("Relative humidity must be between 1 and 100");
  return rh;
}

function saturationVaporPressure(tempC) {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

function dewPoint(tempC, rh) {
  const gamma = (17.27 * tempC) / (237.7 + tempC) + Math.log(rh / 100);
  return (237.7 * gamma) / (17.27 - gamma);
}

const VPD_TARGETS = {
  seedling: { min: 0.4, max: 0.8 },
  veg: { min: 0.8, max: 1.2 },
  flower: { min: 1.1, max: 1.5 },
  late_flower: { min: 1.2, max: 1.6 },
  dry_cure: { min: 0.4, max: 0.8 }
};

const CROP_VPD_TARGETS = {
  lettuce: { general: { min: 0.45, max: 0.85 }, seedling: { min: 0.35, max: 0.7 }, leaf_development: { min: 0.45, max: 0.85 } },
  tomato: { general: { min: 0.8, max: 1.3 }, seedling: { min: 0.5, max: 0.9 }, veg: { min: 0.75, max: 1.15 }, flowering: { min: 0.9, max: 1.3 }, fruiting: { min: 0.9, max: 1.4 } },
  olive: { general: { min: 1.0, max: 1.8 }, establishment: { min: 0.8, max: 1.4 }, vegetative: { min: 1.0, max: 1.8 }, fruiting: { min: 1.0, max: 1.8 } },
  blueberry: { general: { min: 0.7, max: 1.2 }, vegetative: { min: 0.7, max: 1.1 }, fruiting: { min: 0.8, max: 1.2 } },
  basil: { general: { min: 0.65, max: 1.05 }, seedling: { min: 0.45, max: 0.8 }, vegetative: { min: 0.65, max: 1.05 } },
  strawberry: { general: { min: 0.65, max: 1.1 }, flowering: { min: 0.7, max: 1.1 }, fruiting: { min: 0.7, max: 1.15 } },
  pepper: { general: { min: 0.75, max: 1.25 }, seedling: { min: 0.5, max: 0.9 }, flowering: { min: 0.85, max: 1.3 }, fruiting: { min: 0.85, max: 1.35 } }
};

function cropKeyFromInput(input = {}) {
  const identity = input.cropIdentity || input.selectedPlantContext || {};
  const text = [
    input.cropKey, input.cropProfileKey, identity.cropKey, identity.commonName,
    identity.cropCommonName, identity.scientificName, input.cropCommonName, input.scientificName
  ].filter(Boolean).join(" ").toLowerCase();
  if (/\blettuce|romaine|lactuca sativa\b/.test(text)) return "lettuce";
  if (/\btomato|solanum lycopersicum\b/.test(text)) return "tomato";
  if (/\bolive|olea europaea\b/.test(text)) return "olive";
  if (/\bblueberry|vaccinium\b/.test(text)) return "blueberry";
  if (/\bbasil|ocimum basilicum\b/.test(text)) return "basil";
  if (/\bstrawberry|fragaria\b/.test(text)) return "strawberry";
  if (/\bpepper|capsicum\b/.test(text)) return "pepper";
  if (/\bcannabis|hemp\b/.test(text)) return "cannabis";
  return "";
}

function cropIdentityConfirmed(input = {}) {
  const identity = input.cropIdentity || input.selectedPlantContext || {};
  const growthProfile =
    input.plantGrowthProfile || input.selectedPlantContext?.growthProfile || {};
  const statuses = [
    input.confirmationStatus,
    identity.confirmationStatus,
    growthProfile.confirmationStatus
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  if (identity.ambiguous === true || identity.requiresUserConfirmation === true) return false;
  if (statuses.some((status) => status === "user_confirmed" || status === "reviewed")) return true;
  return Boolean(input.cropProfileId || identity.cropProfileId || input.selectedPlantContext?.cropProfileId);
}

function vpdTargetForInput(input = {}, stage = "veg") {
  const cropKey = cropKeyFromInput(input);
  const cropTargets = CROP_VPD_TARGETS[cropKey];
  if (cropTargets && !cropIdentityConfirmed(input)) {
    return {
      target: VPD_TARGETS[stage] || VPD_TARGETS.veg,
      targetSource: "stage_default_unconfirmed_crop",
      targetConfidence: "medium",
      cropKey,
      requiresCropConfirmation: true
    };
  }
  if (!cropTargets) {
    return { target: VPD_TARGETS[stage] || VPD_TARGETS.veg, targetSource: "stage_default", targetConfidence: "medium", cropKey: cropKey || "" };
  }
  return { target: cropTargets[stage] || cropTargets.general, targetSource: `starter_crop_profile:${cropKey}`, targetConfidence: "low", cropKey, requiresCropConfirmation: false };
}

function calculateVpd(input = {}) {
  const unit = input.tempUnit ?? input.unit ?? "F";
  const airTempC = celsius(input.airTemp ?? input.temp, unit);
  const rh = validRh(input.rh);
  const leafTempC = input.leafTemp == null
    ? airTempC + number(input.leafTempOffsetC ?? 0, "Leaf temperature offset")
    : celsius(input.leafTemp, unit);
  const stage = String(input.stage || "veg");
  const targetContext = vpdTargetForInput(input, stage);
  const target = targetContext.target;
  const vpdKpa = saturationVaporPressure(leafTempC) - saturationVaporPressure(airTempC) * (rh / 100);
  const status = vpdKpa < target.min ? "low" : vpdKpa > target.max ? "high" : "ideal";
  const warnings = targetContext.targetConfidence === "low"
    ? ["Crop-specific VPD target is a starter default pending source/license review. Confirm against crop profile, cultivar, and observed plant response."]
    : [];
  if (targetContext.requiresCropConfirmation) {
    warnings.push("Crop identity is not confirmed, so VPD used the generic stage target. Confirm species/crop profile before applying crop-specific defaults.");
  }
  return {
    vpdKpa: Number(vpdKpa.toFixed(2)), airTempC: Number(airTempC.toFixed(2)),
    leafTempC: Number(leafTempC.toFixed(2)), rh, stage, target,
    targetSource: targetContext.targetSource, targetConfidence: targetContext.targetConfidence,
    cropKey: targetContext.cropKey, requiresCropConfirmation: Boolean(targetContext.requiresCropConfirmation), status, warnings,
    formula: "VPD = saturation vapor pressure at leaf temperature - actual vapor pressure of air",
    recommendations: [status === "low" ? "VPD is below the selected target. Consider lowering RH or cautiously raising temperature." : status === "high" ? "VPD is above the selected target. Consider raising RH or lowering temperature." : "VPD is within the selected target."]
  };
}

function calculatePpfdDli(input = {}) {
  const hours = number(input.photoperiodHours, "Photoperiod");
  const targetDli = number(input.targetDli, "Target DLI");
  if (hours <= 0 || targetDli <= 0) throw new Error("Photoperiod and target DLI must be greater than zero");
  const measuredPpfd = input.measuredPpfd == null || input.measuredPpfd === "" ? null : number(input.measuredPpfd, "Measured PPFD");
  const measuredDli = measuredPpfd == null ? null : measuredPpfd * hours * 3600 / 1000000;
  const status = measuredDli == null ? "target_only" : measuredDli < targetDli * 0.9 ? "low" : measuredDli > targetDli * 1.1 ? "high" : "ideal";
  return {
    stage: String(input.stage || "veg"), photoperiodHours: hours, targetDli,
    requiredPpfd: Math.round(targetDli * 1000000 / (hours * 3600)), measuredPpfd,
    measuredDli: measuredDli == null ? null : Number(measuredDli.toFixed(2)), status,
    formula: "DLI = PPFD x photoperiod seconds / 1,000,000",
    recommendations: [status === "low" ? "Measured DLI is below target." : status === "high" ? "Measured DLI is above target; watch for light stress." : status === "ideal" ? "Measured DLI is near target." : "Enter measured PPFD for a current-versus-target comparison."]
  };
}

function calculateDewPointGuard(input = {}) {
  const airTempC = celsius(input.airTemp, input.tempUnit || "F");
  const rh = validRh(input.rh);
  const surfaceTempC = input.surfaceTemp == null ? airTempC - number(input.surfaceOffsetC ?? 2, "Surface offset") : celsius(input.surfaceTemp, input.tempUnit || "F");
  const dewPointC = dewPoint(airTempC, rh);
  const spread = surfaceTempC - dewPointC;
  const risk = spread <= 1 ? "extreme" : spread <= 2 ? "high" : spread <= 4 ? "medium" : "low";
  return {
    airTempC: Number(airTempC.toFixed(2)), rh, dewPointC: Number(dewPointC.toFixed(2)),
    surfaceTempC: Number(surfaceTempC.toFixed(2)), dewPointSpreadC: Number(spread.toFixed(2)), risk,
    recommendations: [risk === "high" || risk === "extreme" ? "Condensation risk is elevated. Improve airflow, reduce RH, and inspect dense canopy areas." : risk === "medium" ? "Monitor humidity and avoid prolonged wet windows." : "Current dew point risk is low."]
  };
}

function calculateWatering(input = {}) {
  const potVolumeL = liters(input.potVolume, input.potUnit || "gal");
  if (potVolumeL <= 0) throw new Error("Pot volume must be greater than zero");
  const medium = String(input.medium || "soil");
  const stage = String(input.stage || "veg");
  const mediumFactor = { living_soil: 0.12, soil: 0.18, coco: 0.28, hydro: 0.35, peat: 0.2 }[medium] || 0.18;
  const stageFactor = { seedling: 0.4, veg: 0.8, flower: 1, late_flower: 0.85 }[stage] || 0.8;
  const vpd = input.vpdKpa == null ? null : number(input.vpdKpa, "VPD");
  const environmentFactor = vpd != null && vpd > 1.5 ? 1.15 : vpd != null && vpd < 0.8 ? 0.85 : 1;
  const suggestedLiters = potVolumeL * mediumFactor * stageFactor * environmentFactor;
  return {
    medium, stage, potVolumeL: Number(potVolumeL.toFixed(2)),
    drybackTargetPercent: number(input.drybackTargetPercent ?? 20, "Dryback target"),
    suggestedLiters: Number(suggestedLiters.toFixed(2)), suggestedGallons: Number((suggestedLiters / 3.78541).toFixed(2)),
    recommendations: ["Use this as a starting estimate and adjust from pot weight, runoff, dryback, plant size, and environment."]
  };
}

function calculateBudRotRisk(input = {}) {
  const airTempC = celsius(input.airTemp, input.tempUnit || "F");
  const rh = validRh(input.rh);
  const wetHours = number(input.wetHours ?? 0, "Wet hours");
  const canopyDensity = number(input.canopyDensity ?? 3, "Canopy density");
  const airflow = number(input.airflow ?? 3, "Airflow");
  const stage = String(input.stage || "flower");
  const dewPointC = dewPoint(airTempC, rh);
  const spread = airTempC - dewPointC;
  let score = (rh >= 65 ? 20 : 0) + (rh >= 75 ? 20 : 0) + (wetHours >= 2 ? 15 : 0) + (wetHours >= 6 ? 20 : 0) + (spread <= 3 ? 20 : 0) + (canopyDensity >= 4 ? 15 : 0) + (airflow <= 2 ? 15 : 0) + (stage === "late_flower" ? 15 : 0);
  score = Math.min(100, score);
  const risk = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  return {
    score, risk, dewPointC: Number(dewPointC.toFixed(2)), dewPointSpreadC: Number(spread.toFixed(2)),
    recommendations: [risk === "high" ? "Inspect dense flowers, improve airflow, and reduce prolonged humidity windows." : risk === "medium" ? "Watch dense canopy zones and humidity spikes." : "Current screened risk is low.", "This is a heuristic risk screen, not a laboratory diagnosis."]
  };
}

function calculateNpkRecipe(input = {}) {
  const batchLiters = liters(input.batchVolume, input.batchUnit || "gal");
  const products = Array.isArray(input.products) ? input.products : [];
  const warnings = [];
  if (batchLiters <= 0) throw new Error("Batch volume must be greater than zero");
  if (!products.length) throw new Error("At least one product row is required");
  if (products.length > 20) throw new Error("A maximum of 20 product rows is supported");
  const totals = {
    Nppm: 0, Pppm: 0, Kppm: 0, Cappm: 0, Mgppm: 0, Sppm: 0,
    Feppm: 0, Mnppm: 0, Znppm: 0, Cuppm: 0, Bppm: 0, Moppm: 0, Sippm: 0
  };
  const rows = products.map((product, index) => {
    const amount = number(product.amount, `Product ${index + 1} amount`);
    if (amount < 0) throw new Error(`Product ${index + 1} amount cannot be negative`);
    const unit = String(product.unit || "g").toLowerCase();
    const density = number(product.densityGml ?? 1, "Density");
    const grams = unit === "ml" ? amount * density
      : unit === "oz" ? amount * 28.3495
        : unit === "tsp" ? amount * 4.92892 * density
          : unit === "tbsp" ? amount * 14.7868 * density
            : amount;
    const percentages = {
      Nppm: number(product.N ?? 0, "N"),
      Pppm: number(product.P ?? 0, "P") * 0.4364,
      Kppm: number(product.K ?? 0, "K") * 0.8301,
      Cappm: number(product.Ca ?? 0, "Ca"), Mgppm: number(product.Mg ?? 0, "Mg"),
      Sppm: number(product.S ?? 0, "S"), Feppm: number(product.Fe ?? 0, "Fe"),
      Mnppm: number(product.Mn ?? 0, "Mn"), Znppm: number(product.Zn ?? 0, "Zn"),
      Cuppm: number(product.Cu ?? 0, "Cu"), Bppm: number(product.B ?? 0, "B"),
      Moppm: number(product.Mo ?? 0, "Mo"), Sippm: number(product.Si ?? 0, "Si")
    };
    const row = {
      name: String(product.name || `Product ${index + 1}`),
      grams,
      chemistry: estimateProductRelease(product, input.releaseEnvironment || {}),
      sourceType: product.sourceType || "user_entered",
      sourceConfidence: sourceConfidenceFor(product)
    };
    Object.entries(percentages).forEach(([key, percent]) => { row[key] = grams * 1000 * (percent / 100) / batchLiters; totals[key] += row[key]; });
    Object.keys(percentages).forEach((key) => { row[key] = Number(row[key].toFixed(1)); });
    return row;
  });
  const waterBaseline = waterBaselineTotals(input, warnings);
  Object.entries(waterBaseline.totals).forEach(([key, value]) => {
    totals[key] += value;
  });
  Object.keys(totals).forEach((key) => { totals[key] = Number(totals[key].toFixed(1)); });
  if (totals.Nppm > 250) warnings.push("Nitrogen appears high. Confirm labels, units, and batch volume.");
  if (totals.Kppm > 400) warnings.push("Potassium appears high. Confirm the recipe before use.");
  if (totals.Cappm > 250) warnings.push("Calcium appears high. Verify compatibility and finished-solution EC.");
  const measuredEC = optionalNumber(input.measuredEC, "Measured EC");
  const measuredPH = optionalNumber(input.measuredPH, "Measured pH");
  if (measuredEC != null && measuredEC > 3) warnings.push("Measured EC is high. Confirm cultivar/stage tolerance before applying.");
  if (measuredPH != null && (measuredPH < 5.5 || measuredPH > 6.8)) warnings.push("Measured feed pH is outside a common fertigation target range. Verify medium-specific targets before feeding.");
  warnings.push(...compatibilityWarnings(input, rows, totals));
  warnings.push(...stageTimingWarnings(input, rows));
  rows.forEach((row) => warnings.push(...(row.chemistry.warnings || []).map((warning) => `${row.name}: ${warning}`)));
  const sourceConfidence = summarizeSourceConfidence(rows);

  const nonZeroNpk = [totals.Nppm, totals.Pppm, totals.Kppm].filter((value) => value > 0);
  const ratioBase = nonZeroNpk.length ? Math.min(...nonZeroNpk) : 1;
  const npkRatio = {
    N: Number((totals.Nppm / ratioBase).toFixed(2)),
    P: Number((totals.Pppm / ratioBase).toFixed(2)),
    K: Number((totals.Kppm / ratioBase).toFixed(2))
  };
  return {
    batchLiters: Number(batchLiters.toFixed(2)),
    batchGallons: Number((batchLiters / 3.78541).toFixed(2)),
    productCount: products.length,
    rows,
    totals,
    npkRatio,
    waterBaseline,
    measured: { ec: measuredEC, ph: measuredPH },
    sourceConfidence,
    mixingOrder: buildMixingOrder(rows, input),
    availabilityEstimate: buildAvailabilityEstimate(rows, waterBaseline),
    perLiterRecipe: rows.map((row) => ({ name: row.name, grams: Number((row.grams / batchLiters).toFixed(3)) })),
    perGallonRecipe: rows.map((row) => ({ name: row.name, grams: Number((row.grams / batchLiters * 3.78541).toFixed(3)) })),
    releaseTimeline: buildReleaseTimeline(rows),
    warnings: Array.from(new Set(warnings)),
    formula: "ppm = product grams x 1000 x nutrient fraction / batch liters; label P2O5 and K2O are converted to elemental P and K.",
    releaseDisclaimer: "Release windows are planning estimates, not guaranteed availability. Product formulation, particle size, temperature, moisture, pH, biology, CEC, and application method can materially change release.",
    recommendations: [
      "Confirm product labels, nutrient forms, and units, then verify finished solution EC and pH with calibrated meters.",
      "Use soluble-feed ppm as recipe math; use release windows only for amendment timing and follow-up checks."
    ]
  };
}

module.exports = { calculateVpd, calculatePpfdDli, calculateDewPointGuard, calculateWatering, calculateBudRotRisk, calculateNpkRecipe };
