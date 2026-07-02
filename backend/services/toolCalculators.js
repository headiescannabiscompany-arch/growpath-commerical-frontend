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

function classifyRange(value, range = {}) {
  if (value === null || value === undefined || value === "") return "missing";
  const n = Number(value);
  if (!Number.isFinite(n)) return "missing";
  const min = Number(range.min);
  const max = Number(range.max);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return "missing";
  if (n < min) return "low";
  if (n > max) return "high";
  return "in_range";
}

function normalizeEc(value, unit = "mS/cm") {
  if (value === null || value === undefined || value === "") return null;
  const n = number(value, "EC");
  const normalized = String(unit || "mS/cm").toLowerCase();
  if (normalized === "ppm500") return n / 500;
  if (normalized === "ppm700") return n / 700;
  return n;
}

function calculatePhEcCheck(input = {}) {
  const medium = String(input.medium || "soil");
  const stage = String(input.stage || "veg");
  const targetPHRange = input.targetPHRange || (medium === "coco" || medium === "hydro"
    ? { min: 5.7, max: 6.2 }
    : { min: 6.2, max: 6.8 });
  const targetECRange = input.targetECRange || (stage === "seedling"
    ? { min: 0.4, max: 1.0 }
    : stage === "flower" || stage === "late_flower"
      ? { min: 1.2, max: 2.2 }
      : { min: 0.8, max: 1.8 });
  const inputEC = normalizeEc(input.inputEC, input.ecUnit);
  const runoffEC = normalizeEc(input.runoffEC, input.ecUnit);
  const phStatus = classifyRange(input.inputPH, targetPHRange);
  const runoffPHStatus = classifyRange(input.runoffPH, targetPHRange);
  const ecStatus = classifyRange(inputEC, targetECRange);
  const runoffECStatus = classifyRange(runoffEC, targetECRange);
  const warnings = [];
  const recommendations = [];
  const possibleRisks = [];
  let driftDirection = "unknown";

  if (input.runoffPH !== undefined && input.inputPH !== undefined) {
    const drift = Number(input.runoffPH) - Number(input.inputPH);
    if (Number.isFinite(drift)) {
      driftDirection = drift > 0.2 ? "runoff_higher" : drift < -0.2 ? "runoff_lower" : "stable";
    }
  }
  if (runoffEC != null && inputEC != null && runoffEC > inputEC * 1.35) {
    warnings.push("Runoff EC is materially higher than input EC.");
    possibleRisks.push("Salt buildup or accumulated nutrients may be affecting uptake.");
    recommendations.push("Check dryback, runoff volume, feed strength, and recent feeding history before increasing nutrients.");
  }
  if (runoffECStatus === "high") {
    warnings.push("Runoff EC is above the selected target range.");
    possibleRisks.push("Root-zone EC may be too high for the selected stage or medium.");
  }
  if (runoffPHStatus === "low" || runoffPHStatus === "high") {
    warnings.push("Runoff pH is outside the selected target range.");
    possibleRisks.push("Root-zone pH drift may be affecting nutrient availability.");
    recommendations.push("Recheck meter calibration and compare input pH to runoff pH over multiple waterings.");
  }
  if (phStatus === "low" || phStatus === "high") {
    recommendations.push("Adjust input pH cautiously based on medium and product instructions.");
  }
  if (String(input.waterSource || "").toLowerCase() === "ro") {
    recommendations.push("RO water contributes little mineral buffering. Ca/Mg and alkalinity context matter.");
  }
  if (!warnings.length) {
    recommendations.push("Values are within the selected ranges. Keep logging trends instead of reacting to one reading.");
  }

  return {
    medium,
    stage,
    targetPHRange,
    targetECRange,
    normalizedEC: { inputEC, runoffEC, unit: "mS/cm" },
    phStatus,
    runoffPHStatus,
    ecStatus,
    runoffECStatus,
    driftDirection,
    possibleRisks: Array.from(new Set(possibleRisks)),
    warnings: Array.from(new Set(warnings)),
    recommendations: Array.from(new Set(recommendations)),
    retestTaskSuggestion: {
      title: "Retest pH / EC",
      dueInDays: warnings.length ? 1 : 3,
      priority: warnings.length ? "medium" : "low"
    },
    formulaExplanation:
      "This tool compares measured pH and EC values against selected target ranges and flags runoff drift or buildup. It does not calculate exact pH up/down dosing because product concentration and alkalinity are required."
  };
}

function gallons(value, unit = "gallons") {
  const n = number(value, "Soil volume");
  const normalized = String(unit || "gallons").toLowerCase();
  if (["cubic_feet", "cubic feet", "ft3"].includes(normalized)) return n * 7.48052;
  if (["liters", "l"].includes(normalized)) return n * 0.264172;
  return n;
}

function calculateTopdressPlan(input = {}) {
  const plantCount = Math.max(1, Number(input.plantCount || input.plantIds?.length || 1));
  const gallonsPerPlant = gallons(input.soilVolumePerPlant, input.soilVolumeUnit);
  const doseRate = number(input.doseRate, "Dose rate");
  const doseUnit = String(input.doseUnit || "tbsp_per_gallon");
  let amountPerPlant = doseRate * gallonsPerPlant;
  let amountUnit = doseUnit;
  if (doseUnit === "grams_total") {
    amountPerPlant = doseRate / plantCount;
    amountUnit = "grams";
  } else if (doseUnit === "cups_per_cubic_foot") {
    amountPerPlant = doseRate * (gallonsPerPlant / 7.48052);
    amountUnit = "cups";
  } else if (doseUnit === "grams_per_gallon") {
    amountUnit = "grams";
  } else if (doseUnit === "tbsp_per_gallon") {
    amountUnit = "tbsp";
  }
  const totalAmount = amountPerPlant * plantCount;
  const warnings = [];
  if (String(input.stage || "").toLowerCase() === "late_flower") {
    warnings.push("Late flower topdressing may release too slowly to affect this run. Decide whether this is current support or next-cycle soil building.");
  }
  if (input.lastTopdressDate && input.plannedApplyDate) {
    const days = (Date.parse(input.plannedApplyDate) - Date.parse(input.lastTopdressDate)) / 86400000;
    if (Number.isFinite(days) && days < 10) warnings.push("Topdress interval is short. Check the previous application before stacking more amendment.");
  }
  const plannedApplyDate = input.plannedApplyDate || new Date().toISOString();
  return {
    plantCount,
    gallonsPerPlant: Number(gallonsPerPlant.toFixed(2)),
    amountPerPlant: Number(amountPerPlant.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    amountUnit,
    plannedApplyDate,
    expectedReleaseWindow: input.expectedReleaseWindow || "Depends on product release speed, biology, moisture, and particle size.",
    warnings,
    recommendations: [
      input.waterInAfterApply === false
        ? "If the product label allows, lightly water in after application to start biological contact."
        : "Water in gently and avoid burying dry amendments against stems.",
      "Log the application and schedule a follow-up check rather than judging release from one day of response."
    ],
    taskToCreate: {
      title: `Topdress ${input.productName || "selected amendment"}`,
      dueDate: plannedApplyDate,
      priority: warnings.length ? "medium" : "low"
    },
    logSummary: `Topdress planned: ${amountPerPlant.toFixed(2)} ${amountUnit} per plant, ${totalAmount.toFixed(2)} ${amountUnit} total.`
  };
}

function gramsFromWeight(value, unit = "grams") {
  const n = number(value, "Weight");
  const normalized = String(unit || "grams").toLowerCase();
  if (["kg", "kilogram", "kilograms"].includes(normalized)) return n * 1000;
  if (["pound", "pounds", "lb", "lbs"].includes(normalized)) return n * 453.59237;
  if (["ounce", "ounces", "oz"].includes(normalized)) return n * 28.3495;
  return n;
}

function releaseBucket(row = {}) {
  const explicit = String(row.releaseClass || "").toLowerCase();
  if (["immediate", "fast", "medium", "slow", "very_slow"].includes(explicit)) return explicit;
  const days = Number(row.releaseWindowDays);
  if (!Number.isFinite(days)) return "unknown";
  if (days <= 3) return "immediate";
  if (days <= 14) return "fast";
  if (days <= 45) return "medium";
  if (days <= 120) return "slow";
  return "very_slow";
}

function calculateDryAmendmentMix(input = {}) {
  const ingredients = Array.isArray(input.ingredients) ? input.ingredients : [];
  if (!ingredients.length) throw new Error("At least one ingredient is required");
  const rows = ingredients.map((ingredient, index) => {
    const grams = gramsFromWeight(ingredient.amount, ingredient.amountUnit || input.batchWeightUnit || "grams");
    return {
      name: String(ingredient.name || `Ingredient ${index + 1}`),
      grams,
      labelN: number(ingredient.N ?? 0, "N"),
      labelP2O5: number(ingredient.P2O5 ?? ingredient.P ?? 0, "P2O5"),
      labelK2O: number(ingredient.K2O ?? ingredient.K ?? 0, "K2O"),
      Ca: number(ingredient.Ca ?? 0, "Ca"),
      Mg: number(ingredient.Mg ?? 0, "Mg"),
      S: number(ingredient.S ?? 0, "S"),
      releaseClass: releaseBucket(ingredient),
      sourceConfidence: sourceConfidenceFor(ingredient)
    };
  });
  const batchWeight = input.batchWeight
    ? gramsFromWeight(input.batchWeight, input.batchWeightUnit || "grams")
    : rows.reduce((sum, row) => sum + row.grams, 0);
  if (batchWeight <= 0) throw new Error("Batch weight must be greater than zero");
  const weighted = (key) => rows.reduce((sum, row) => sum + row.grams * (row[key] / 100), 0) / batchWeight * 100;
  const totalAnalysis = {
    N: Number(weighted("labelN").toFixed(2)),
    P2O5: Number(weighted("labelP2O5").toFixed(2)),
    K2O: Number(weighted("labelK2O").toFixed(2)),
    elementalP: Number((weighted("labelP2O5") * 0.4364).toFixed(2)),
    elementalK: Number((weighted("labelK2O") * 0.8301).toFixed(2)),
    Ca: Number(weighted("Ca").toFixed(2)),
    Mg: Number(weighted("Mg").toFixed(2)),
    S: Number(weighted("S").toFixed(2))
  };
  const nonZero = [totalAnalysis.N, totalAnalysis.P2O5, totalAnalysis.K2O].filter((v) => v > 0);
  const base = nonZero.length ? Math.min(...nonZero) : 1;
  const achievedRatio = {
    N: Number((totalAnalysis.N / base).toFixed(2)),
    P: Number((totalAnalysis.P2O5 / base).toFixed(2)),
    K: Number((totalAnalysis.K2O / base).toFixed(2))
  };
  const releaseTimeline = rows.reduce((acc, row) => {
    const key = row.releaseClass || "unknown";
    acc[key] = acc[key] || [];
    acc[key].push({ name: row.name, grams: Number(row.grams.toFixed(2)) });
    return acc;
  }, { immediate: [], fast: [], medium: [], slow: [], very_slow: [], unknown: [] });
  const warnings = [
    "Slow amendments may not correct urgent symptoms.",
    "Ingredient analysis may vary unless label/source is verified."
  ];
  if (totalAnalysis.P2O5 > totalAnalysis.N * 1.8 && totalAnalysis.P2O5 > 1) {
    warnings.push("High phosphorus blends can affect micronutrient balance.");
  }
  if (totalAnalysis.K2O > totalAnalysis.N * 2 && totalAnalysis.K2O > 1) {
    warnings.push("High potassium can compete with calcium/magnesium uptake.");
  }
  const dosePerGallonSoil = input.dosePerGallonSoil ? number(input.dosePerGallonSoil, "Dose per gallon soil") : null;
  return {
    recipeName: input.recipeName || "Dry amendment blend",
    targetRatio: input.targetRatio || null,
    achievedRatio,
    totalAnalysis,
    batchWeight,
    batchWeightUnit: "grams",
    ingredientWeights: rows.map((row) => ({
      name: row.name,
      grams: Number(row.grams.toFixed(2)),
      percentOfBatch: Number((row.grams / batchWeight * 100).toFixed(2)),
      releaseClass: row.releaseClass,
      sourceConfidence: row.sourceConfidence
    })),
    dosePerGallonSoil,
    dosePerCubicFoot: dosePerGallonSoil == null ? null : Number((dosePerGallonSoil * 7.48052).toFixed(2)),
    releaseTimeline,
    warnings: Array.from(new Set(warnings)),
    recommendations: ["Save this blend as a recipe, then use Topdress Planner or Soil Builder for actual application timing."],
    logSummary: `${input.recipeName || "Dry amendment blend"}: ${totalAnalysis.N}-${totalAnalysis.P2O5}-${totalAnalysis.K2O} guaranteed analysis estimate.`
  };
}

function calculateDryCureGuard(input = {}) {
  const tempF = number(input.dryRoomTemp ?? input.tempF ?? input.airTemp, "Dry room temperature");
  const tempC = celsius(tempF, input.tempUnit || "F");
  const rh = validRh(input.dryRoomRH ?? input.rh);
  const jarRH = input.jarRH == null || input.jarRH === "" ? null : number(input.jarRH, "Jar RH");
  const dewPointC = dewPoint(tempC, rh);
  const spread = tempC - dewPointC;
  const warnings = [];
  const recommendations = [];
  let moldRisk = "low";
  let overdryRisk = "low";
  if (rh > 65) {
    moldRisk = "medium";
    warnings.push("Dry room RH is elevated. Watch dense flowers and airflow.");
  }
  if (rh > 70) {
    moldRisk = "high";
    warnings.push("High RH can increase mold risk during drying.");
  }
  if (rh < 50) {
    overdryRisk = "medium";
    warnings.push("Low RH can dry the outside too quickly and reduce cure quality.");
  }
  if (tempF > 68) {
    recommendations.push("Temperature is above the common 60F target. Good results are still possible, but watch dry speed, aroma retention, RH, and airflow.");
  }
  if (String(input.mode || "drying") === "curing" && jarRH !== null) {
    if (jarRH > 68) {
      moldRisk = "high";
      recommendations.push("Jar RH is high. Open jars, inspect for mold, and allow moisture to drop.");
    } else if (jarRH >= 62 && jarRH <= 65) {
      recommendations.push("Jar RH is in a common curing zone. Continue monitoring.");
    } else if (jarRH < 55) {
      overdryRisk = "high";
      recommendations.push("Jar RH is low. Flower may be overdried or curing may slow.");
    }
  }
  return {
    mode: String(input.mode || "drying"),
    dewPointC: Number(dewPointC.toFixed(2)),
    dewPointF: Number((dewPointC * 9 / 5 + 32).toFixed(2)),
    dewPointSpreadC: Number(spread.toFixed(2)),
    dryStatus: String(input.mode || "drying") === "drying" ? "monitoring" : null,
    cureStatus: String(input.mode || "drying") === "curing" ? "monitoring" : null,
    moldRisk,
    overdryRisk,
    nextAction: moldRisk === "high" ? "Inspect and vent immediately" : "Continue monitoring",
    taskSuggestions: [
      {
        title: String(input.mode || "drying") === "curing" ? "Check jar RH" : "Check dry room RH/temp",
        dueInHours: moldRisk === "high" ? 6 : 12,
        priority: moldRisk === "high" ? "high" : "medium"
      }
    ],
    warnings,
    recommendations,
    realisticNotes:
      "60/60 is a common target, not the only path. Dry/cure results are not guaranteed; temperature, RH, airflow, flower density, dry speed, jar moisture, and handling all matter."
  };
}

function calculateSoilBuilder(input = {}) {
  const totalGallons = gallons(input.totalVolume, input.volumeUnit || "gallons");
  if (totalGallons <= 0) throw new Error("Total soil volume must be greater than zero");
  const basePercent = number(input.basePercent ?? 33, "Base percent");
  const compostPercent = number(input.compostPercent ?? 33, "Compost percent");
  const aerationPercent = number(input.aerationPercent ?? 34, "Aeration percent");
  const percentTotal = basePercent + compostPercent + aerationPercent;
  if (Math.abs(percentTotal - 100) > 0.5) throw new Error("Base, compost, and aeration percentages must total 100");
  const amendments = Array.isArray(input.amendments) ? input.amendments : [];
  const minerals = Array.isArray(input.minerals) ? input.minerals : [];
  const ingredientBreakdown = [
    { name: "Base", gallons: Number((totalGallons * basePercent / 100).toFixed(2)), percent: basePercent },
    { name: "Compost", gallons: Number((totalGallons * compostPercent / 100).toFixed(2)), percent: compostPercent },
    { name: "Aeration", gallons: Number((totalGallons * aerationPercent / 100).toFixed(2)), percent: aerationPercent }
  ];
  const doseRows = [...amendments, ...minerals].map((row) => {
    const rate = number(row.doseRate ?? 0, `${row.name || "Ingredient"} dose`);
    const unit = String(row.doseUnit || "cups_per_cubic_foot");
    const amount = unit === "grams_per_gallon" ? rate * totalGallons : rate * (totalGallons / 7.48052);
    return {
      name: String(row.name || "Ingredient"),
      amount: Number(amount.toFixed(2)),
      unit: unit === "grams_per_gallon" ? "grams" : "cups",
      releaseClass: releaseBucket(row)
    };
  });
  const warnings = [];
  if (compostPercent > 40) warnings.push("Compost is above 40%. Watch density, drainage, and nutrient strength.");
  if (amendments.length + minerals.length === 0) warnings.push("No amendments or minerals were entered; this is only a base soil volume plan.");
  return {
    mixName: input.mixName || "Soil mix",
    totalGallons: Number(totalGallons.toFixed(2)),
    totalCubicFeet: Number((totalGallons / 7.48052).toFixed(2)),
    ingredientBreakdown,
    cubicFeetBreakdown: ingredientBreakdown.map((row) => ({ ...row, cubicFeet: Number((row.gallons / 7.48052).toFixed(2)) })),
    gallonBreakdown: ingredientBreakdown,
    bagCountEstimate: input.bagSizeGallons ? Math.ceil(totalGallons / number(input.bagSizeGallons, "Bag size")) : null,
    amendmentDosePerGallon: doseRows,
    amendmentDosePerCubicFoot: doseRows,
    releaseTimeline: doseRows.reduce((acc, row) => {
      acc[row.releaseClass] = acc[row.releaseClass] || [];
      acc[row.releaseClass].push(row.name);
      return acc;
    }, {}),
    warnings,
    mixingInstructions: [
      "Blend base, compost, and aeration evenly before adding concentrated amendments.",
      "Pre-mix dry amendments separately to avoid hot spots.",
      "Moisten evenly and allow biological blends to cycle before transplanting when appropriate."
    ],
    recipe: { recipeType: "soil_mix", ingredients: [...ingredientBreakdown, ...doseRows] }
  };
}

function calculateNutrientSourceComparison(input = {}) {
  const nutrient = String(input.nutrient || "calcium").toLowerCase();
  const intent = String(input.intent || "fast_correction").toLowerCase();
  const library = {
    calcium: {
      fast: ["calcium nitrate", "calcium acetate/lactate", "calcium chloride, with chloride warning"],
      medium: ["gypsum"],
      slow: ["calcitic lime", "dolomitic lime", "oyster shell", "bone meal", "crab meal"],
      warnings: ["Lime and oyster shell are pH-buffering soil builders, not fast Ca corrections."]
    },
    nitrogen: {
      fast: ["nitrate nitrogen", "ammonium nitrate blends", "amino/soluble organic N where label supports it"],
      medium: ["alfalfa meal", "fish meal"],
      slow: ["feather meal", "blood meal in biologically active media"],
      warnings: ["High nitrogen in flower can work against finish quality depending on crop and stage."]
    },
    phosphorus: {
      fast: ["soluble phosphate products"],
      medium: ["soft rock phosphate where biology and pH support it"],
      slow: ["bone meal", "rock phosphate"],
      warnings: ["High phosphorus can affect micronutrient balance."]
    },
    potassium: {
      fast: ["potassium sulfate", "potassium silicate with mixing-order care"],
      medium: ["kelp meal", "langbeinite"],
      slow: ["greensand"],
      warnings: ["High potassium can compete with calcium and magnesium uptake."]
    },
    magnesium: {
      fast: ["magnesium sulfate"],
      medium: ["langbeinite"],
      slow: ["dolomitic lime"],
      warnings: ["Dolomitic lime is slow and also affects pH buffering."]
    }
  };
  const row = library[nutrient] || library.calcium;
  return {
    nutrient,
    intent,
    fastSources: row.fast,
    mediumSources: row.medium,
    slowSources: row.slow,
    bestChoiceByIntent: intent.includes("long") || intent.includes("soil") ? row.slow[0] : row.fast[0],
    pHEffectWarnings: row.warnings.filter((warning) => /lime|pH|buffer/i.test(warning)),
    secondaryNutrients: "Review label analysis; many sources bring secondary nutrients or salts.",
    badUseCases: row.warnings,
    recommendations: ["Choose source speed based on intent: fast correction versus long-term soil building.", "Confirm product label, medium pH, and crop stage before applying."]
  };
}

module.exports = {
  calculateVpd,
  calculatePpfdDli,
  calculateDewPointGuard,
  calculateWatering,
  calculateBudRotRisk,
  calculateNpkRecipe,
  calculatePhEcCheck,
  calculateTopdressPlan,
  calculateDryAmendmentMix,
  calculateDryCureGuard,
  calculateSoilBuilder,
  calculateNutrientSourceComparison
};
