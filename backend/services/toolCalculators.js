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
  const explicit = String(
    product.sourceConfidence || product.confidence || ""
  ).toLowerCase();
  if (["high", "medium", "low"].includes(explicit)) return explicit;
  const sourceType = String(product.sourceType || "").toLowerCase();
  if (sourceType === "lab_tested") return "high";
  if (sourceType === "manufacturer" || sourceType === "extension_reference")
    return "medium";
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
  const overall = rows.reduce(
    (lowest, row) =>
      rank[row.sourceConfidence] < rank[lowest] ? row.sourceConfidence : lowest,
    "high"
  );
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
    warnings.push(
      "Source water alkalinity is high. Confirm acid demand and finished pH before feeding."
    );
  }
  if (sourceEC != null && sourceEC > 0.5) {
    warnings.push(
      "Source water EC is elevated. Include baseline minerals when comparing measured EC."
    );
  }
  if (sourcePH != null && (sourcePH < 5.5 || sourcePH > 8.0)) {
    warnings.push(
      "Source water pH is outside a typical mixing starting range. Measure finished solution pH."
    );
  }
  return {
    totals,
    sourceEC,
    sourcePH,
    alkalinityPpm: alkalinity
  };
}

function buildMixingOrder(rows, input = {}) {
  const order = [
    "Start with source water and record baseline EC/pH before adding products."
  ];
  if (rows.some((row) => /silicate/i.test(row.chemistry.form || row.name))) {
    order.push(
      "Add silica/silicate products first, dilute fully, then add the rest of the recipe."
    );
  }
  const calciumRows = rows.filter((row) =>
    /calcium/i.test(row.chemistry.chemicalName || row.name)
  );
  const phosphateRows = rows.filter((row) =>
    /phosphate/i.test(row.chemistry.form || row.chemistry.chemicalName || row.name)
  );
  if (input.isConcentrate && calciumRows.length && phosphateRows.length) {
    order.push("Keep calcium and phosphate products in separate A/B stock concentrates.");
  }
  order.push(
    "Add base nutrients one at a time with agitation; wait for each product to dissolve."
  );
  order.push(
    "Add supplements and micros after base nutrients unless the manufacturer specifies otherwise."
  );
  order.push(
    "Measure and record finished EC and pH, then adjust only after the solution is fully mixed."
  );
  return order;
}

const RELEASE_WINDOWS = [
  "day_0_3",
  "day_3_14",
  "day_14_45",
  "day_45_120",
  "day_120_plus"
];

function availabilityFractions(row) {
  const className = row.chemistry.availabilityClass;
  if (className === "immediate") return { day_0_3: 1 };
  if (className === "fast") return { day_0_3: 0.65, day_3_14: 0.35 };
  if (className === "medium")
    return { day_0_3: 0.15, day_3_14: 0.45, day_14_45: 0.3, day_45_120: 0.1 };
  if (className === "slow")
    return { day_3_14: 0.1, day_14_45: 0.3, day_45_120: 0.4, day_120_plus: 0.2 };
  if (className === "very_slow")
    return { day_14_45: 0.1, day_45_120: 0.3, day_120_plus: 0.6 };
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
  lettuce: {
    general: { min: 0.45, max: 0.85 },
    seedling: { min: 0.35, max: 0.7 },
    leaf_development: { min: 0.45, max: 0.85 }
  },
  tomato: {
    general: { min: 0.8, max: 1.3 },
    seedling: { min: 0.5, max: 0.9 },
    veg: { min: 0.75, max: 1.15 },
    flowering: { min: 0.9, max: 1.3 },
    fruiting: { min: 0.9, max: 1.4 }
  },
  olive: {
    general: { min: 1.0, max: 1.8 },
    establishment: { min: 0.8, max: 1.4 },
    vegetative: { min: 1.0, max: 1.8 },
    fruiting: { min: 1.0, max: 1.8 }
  },
  blueberry: {
    general: { min: 0.7, max: 1.2 },
    vegetative: { min: 0.7, max: 1.1 },
    fruiting: { min: 0.8, max: 1.2 }
  },
  basil: {
    general: { min: 0.65, max: 1.05 },
    seedling: { min: 0.45, max: 0.8 },
    vegetative: { min: 0.65, max: 1.05 }
  },
  strawberry: {
    general: { min: 0.65, max: 1.1 },
    flowering: { min: 0.7, max: 1.1 },
    fruiting: { min: 0.7, max: 1.15 }
  },
  pepper: {
    general: { min: 0.75, max: 1.25 },
    seedling: { min: 0.5, max: 0.9 },
    flowering: { min: 0.85, max: 1.3 },
    fruiting: { min: 0.85, max: 1.35 }
  }
};

function cropKeyFromInput(input = {}) {
  const identity = input.cropIdentity || input.selectedPlantContext || {};
  const text = [
    input.cropKey,
    input.cropProfileKey,
    identity.cropKey,
    identity.commonName,
    identity.cropCommonName,
    identity.scientificName,
    input.cropCommonName,
    input.scientificName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  if (identity.ambiguous === true || identity.requiresUserConfirmation === true)
    return false;
  if (statuses.some((status) => status === "user_confirmed" || status === "reviewed"))
    return true;
  return Boolean(
    input.cropProfileId ||
    identity.cropProfileId ||
    input.selectedPlantContext?.cropProfileId
  );
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
    return {
      target: VPD_TARGETS[stage] || VPD_TARGETS.veg,
      targetSource: "stage_default",
      targetConfidence: "medium",
      cropKey: cropKey || ""
    };
  }
  return {
    target: cropTargets[stage] || cropTargets.general,
    targetSource: `starter_crop_profile:${cropKey}`,
    targetConfidence: "low",
    cropKey,
    requiresCropConfirmation: false
  };
}

function calculateVpd(input = {}) {
  const unit = input.tempUnit ?? input.unit ?? "F";
  const airTempC = celsius(input.airTemp ?? input.temp, unit);
  const rh = validRh(input.rh);
  const leafTempC =
    input.leafTemp == null
      ? airTempC + number(input.leafTempOffsetC ?? 0, "Leaf temperature offset")
      : celsius(input.leafTemp, unit);
  const stage = String(input.stage || "veg");
  const targetContext = vpdTargetForInput(input, stage);
  const target = targetContext.target;
  const vpdKpa =
    saturationVaporPressure(leafTempC) - saturationVaporPressure(airTempC) * (rh / 100);
  const status = vpdKpa < target.min ? "low" : vpdKpa > target.max ? "high" : "ideal";
  const warnings =
    targetContext.targetConfidence === "low"
      ? [
          "Crop-specific VPD target is a starter default pending source/license review. Confirm against crop profile, cultivar, and observed plant response."
        ]
      : [];
  if (targetContext.requiresCropConfirmation) {
    warnings.push(
      "Crop identity is not confirmed, so VPD used the generic stage target. Confirm species/crop profile before applying crop-specific defaults."
    );
  }
  return {
    vpdKpa: Number(vpdKpa.toFixed(2)),
    airTempC: Number(airTempC.toFixed(2)),
    leafTempC: Number(leafTempC.toFixed(2)),
    rh,
    stage,
    target,
    targetSource: targetContext.targetSource,
    targetConfidence: targetContext.targetConfidence,
    cropKey: targetContext.cropKey,
    requiresCropConfirmation: Boolean(targetContext.requiresCropConfirmation),
    status,
    warnings,
    formula:
      "VPD = saturation vapor pressure at leaf temperature - actual vapor pressure of air",
    recommendations: [
      status === "low"
        ? "VPD is below the selected target. Consider lowering RH or cautiously raising temperature."
        : status === "high"
          ? "VPD is above the selected target. Consider raising RH or lowering temperature."
          : "VPD is within the selected target."
    ]
  };
}

function calculatePpfdDli(input = {}) {
  const hours = number(input.photoperiodHours, "Photoperiod");
  const targetDli = number(input.targetDli, "Target DLI");
  if (hours <= 0 || targetDli <= 0)
    throw new Error("Photoperiod and target DLI must be greater than zero");
  const stage = String(input.stage || "veg").toLowerCase();
  const measuredPpfd =
    input.measuredPpfd == null || input.measuredPpfd === ""
      ? null
      : number(input.measuredPpfd, "Measured PPFD");
  const measuredDli =
    measuredPpfd == null ? null : (measuredPpfd * hours * 3600) / 1000000;
  const status =
    measuredDli == null
      ? "target_only"
      : measuredDli < targetDli * 0.9
        ? "low"
        : measuredDli > targetDli * 1.1
          ? "high"
          : "ideal";
  const requiredPpfd = Math.round((targetDli * 1000000) / (hours * 3600));
  const response = String(input.leafResponse || input.plantResponse || "").toLowerCase();
  const warnings = [];
  if (
    /seed|clone/.test(stage) &&
    (requiredPpfd > 300 || (measuredPpfd != null && measuredPpfd > 300))
  ) {
    warnings.push(
      "Seedlings/clones may be under too much light for stable rooting and early growth."
    );
  }
  if (/late|ripen|finish/.test(stage) && targetDli > 45) {
    warnings.push(
      "Very high DLI late flower can add heat/light pressure and reduce finish quality if plants are not tolerating it."
    );
  }
  if (/taco|bleach|curl|pray hard|canoe|light burn/.test(response)) {
    warnings.push(
      "Leaf posture or bleaching symptoms suggest light stress; compare against VPD, temperature, and root-zone status before increasing intensity."
    );
  }
  if (hours > 13 && /flower|late|ripen|finish/.test(stage)) {
    warnings.push(
      "Flowering photoperiod appears long; verify crop type, genetics, and light schedule."
    );
  }
  return {
    stage,
    photoperiodHours: hours,
    targetDli,
    requiredPpfd,
    measuredPpfd,
    measuredDli: measuredDli == null ? null : Number(measuredDli.toFixed(2)),
    status,
    warnings,
    formula: "DLI = PPFD x photoperiod seconds / 1,000,000",
    recommendations: [
      status === "low"
        ? "Measured DLI is below target."
        : status === "high"
          ? "Measured DLI is above target; watch for light stress."
          : status === "ideal"
            ? "Measured DLI is near target."
            : "Enter measured PPFD for a current-versus-target comparison.",
      "Ramp intensity gradually and verify leaf posture, temperature, VPD, and cultivar response."
    ],
    tasksToCreate: [
      {
        title: warnings.length ? "Check light stress response" : "Check canopy PPFD",
        priority: warnings.length ? "high" : "medium"
      }
    ]
  };
}

function calculateDewPointGuard(input = {}) {
  const airTempC = celsius(input.airTemp, input.tempUnit || "F");
  const rh = validRh(input.rh);
  const surfaceTempC =
    input.surfaceTemp == null
      ? airTempC - number(input.surfaceOffsetC ?? 2, "Surface offset")
      : celsius(input.surfaceTemp, input.tempUnit || "F");
  const dewPointC = dewPoint(airTempC, rh);
  const spread = surfaceTempC - dewPointC;
  const risk =
    spread <= 1 ? "extreme" : spread <= 2 ? "high" : spread <= 4 ? "medium" : "low";
  return {
    airTempC: Number(airTempC.toFixed(2)),
    rh,
    dewPointC: Number(dewPointC.toFixed(2)),
    surfaceTempC: Number(surfaceTempC.toFixed(2)),
    dewPointSpreadC: Number(spread.toFixed(2)),
    risk,
    recommendations: [
      risk === "high" || risk === "extreme"
        ? "Condensation risk is elevated. Improve airflow, reduce RH, and inspect dense canopy areas."
        : risk === "medium"
          ? "Monitor humidity and avoid prolonged wet windows."
          : "Current dew point risk is low."
    ]
  };
}

function calculateEnvironmentReview(input = {}) {
  const stage = String(input.stage || "unknown").toLowerCase();
  const tempDayC =
    input.tempDayC == null || input.tempDayC === ""
      ? null
      : celsius(input.tempDayC, input.tempUnit || "C");
  const tempNightC =
    input.tempNightC == null || input.tempNightC === ""
      ? null
      : celsius(input.tempNightC, input.tempUnit || "C");
  const rh =
    input.humidity == null || input.humidity === "" ? null : validRh(input.humidity);
  const vpd = input.vpd == null || input.vpd === "" ? null : number(input.vpd, "VPD");
  const ppfd =
    input.ppfd == null || input.ppfd === "" ? null : number(input.ppfd, "PPFD");
  const dli = input.dli == null || input.dli === "" ? null : number(input.dli, "DLI");
  const co2 = input.co2 == null || input.co2 === "" ? null : number(input.co2, "CO2");
  const lightHours =
    input.lightHours == null || input.lightHours === ""
      ? null
      : number(input.lightHours, "Light hours");
  const dewPointC = tempDayC != null && rh != null ? dewPoint(tempDayC, rh) : null;
  const dewPointSpreadC =
    dewPointC != null && tempDayC != null ? tempDayC - dewPointC : null;
  const warnings = [];
  const recommendations = [];
  let riskScore = 0;

  if (rh != null && rh >= 70 && /flower|late|ripen|finish/.test(stage)) {
    warnings.push("High humidity in flower increases mold and bud rot risk.");
    riskScore += 2;
  }
  if (
    dewPointSpreadC != null &&
    dewPointSpreadC <= 4.5 &&
    /flower|late|ripen|finish/.test(stage)
  ) {
    warnings.push("Dew point spread is tight; inspect dense canopy and flower surfaces.");
    riskScore += 2;
  }
  if (vpd != null && vpd < 0.7) {
    warnings.push(
      "Low VPD can reduce transpiration and contribute to calcium-transport symptoms."
    );
    riskScore += 1;
  }
  if (vpd != null && vpd > 1.6) {
    warnings.push("High VPD can increase dryback speed and irrigation demand.");
    riskScore += 1;
  }
  if (ppfd != null && /seed|clone/.test(stage) && ppfd > 300) {
    warnings.push(
      "Seedlings/clones may be under too much light for stable rooting and early growth."
    );
    riskScore += 2;
  }
  if (dli != null && /late|ripen|finish/.test(stage) && dli > 45) {
    warnings.push(
      "Very high DLI late flower can add heat/light pressure and reduce finish quality if plants are not tolerating it."
    );
    riskScore += 1;
  }
  if (tempDayC != null && tempNightC != null && Math.abs(tempDayC - tempNightC) > 8) {
    warnings.push(
      "Large day/night temperature swings can complicate VPD, color, uptake, and condensation risk."
    );
    riskScore += 1;
  }
  if (co2 != null && co2 > 1000 && ppfd != null && ppfd < 600) {
    warnings.push(
      "Elevated CO2 has limited value if light intensity is not also high enough."
    );
    riskScore += 1;
  }
  if (lightHours != null && /flower|late|ripen|finish/.test(stage) && lightHours > 13) {
    warnings.push(
      "Flowering photoperiod appears long; verify crop type, genetics, and light schedule."
    );
    riskScore += 2;
  }

  const riskLevel = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";
  recommendations.push(
    riskLevel === "high"
      ? "Stabilize environment before adding more feed, light, or dryback pressure."
      : "Trend readings with plant response before making large environmental changes."
  );
  recommendations.push(
    "Confirm sensor placement at canopy level and compare readings across the room."
  );
  return {
    stage,
    riskLevel,
    dewPointC: dewPointC == null ? null : Number(dewPointC.toFixed(1)),
    dewPointSpreadC: dewPointSpreadC == null ? null : Number(dewPointSpreadC.toFixed(1)),
    warnings: Array.from(new Set(warnings)),
    recommendations,
    tasksToCreate: [
      {
        title:
          riskLevel === "high"
            ? "Inspect environment risk zones"
            : "Recheck environment readings",
        priority: riskLevel === "high" ? "high" : "medium"
      }
    ],
    logSummary: `${stage} environment review: ${riskLevel} risk with ${warnings.length} warnings.`
  };
}

function calculateWatering(input = {}) {
  const potVolumeL = liters(input.potVolume, input.potUnit || "gal");
  if (potVolumeL <= 0) throw new Error("Pot volume must be greater than zero");
  const medium = String(input.medium || "soil").toLowerCase();
  const stage = String(input.stage || "veg").toLowerCase();
  const mediumFactor =
    { living_soil: 0.12, soil: 0.18, coco: 0.28, hydro: 0.35, peat: 0.2 }[medium] || 0.18;
  const stageFactor =
    { seedling: 0.4, veg: 0.8, flower: 1, late_flower: 0.85 }[stage] || 0.8;
  const vpd = input.vpdKpa == null ? null : number(input.vpdKpa, "VPD");
  const environmentFactor =
    vpd != null && vpd > 1.5 ? 1.15 : vpd != null && vpd < 0.8 ? 0.85 : 1;
  const targetDryback = number(
    input.drybackTargetPercent ?? input.targetDrybackPercent ?? 20,
    "Dryback target"
  );
  const actualDryback =
    input.actualDrybackPercent == null || input.actualDrybackPercent === ""
      ? null
      : number(input.actualDrybackPercent, "Actual dryback");
  const runoffTarget = number(
    input.runoffTargetPercent ?? input.runoffPct ?? 10,
    "Runoff target"
  );
  const actualRunoff =
    input.actualRunoffPercent == null || input.actualRunoffPercent === ""
      ? null
      : number(input.actualRunoffPercent, "Actual runoff");
  const recoveryTimeHours =
    input.recoveryTimeHours == null || input.recoveryTimeHours === ""
      ? null
      : number(input.recoveryTimeHours, "Recovery time");
  const leafResponse = String(
    input.leafResponse || input.plantResponse || ""
  ).toLowerCase();
  const suggestedLiters =
    potVolumeL *
    mediumFactor *
    stageFactor *
    environmentFactor *
    (1 + Math.max(0, runoffTarget) / 100);
  const warnings = [];
  const recommendations = [];
  const tasksToCreate = [];
  let pressureScore = 0;

  if (/seed|clone/.test(stage) && targetDryback > 12) {
    warnings.push("Fresh clones and seedlings should avoid hard drybacks.");
  }
  if (actualDryback != null && actualDryback > targetDryback + 8) {
    pressureScore += 2;
    warnings.push("Actual dryback exceeded the target by a meaningful margin.");
  } else if (actualDryback != null && actualDryback > targetDryback) {
    pressureScore += 1;
  }
  if (actualDryback != null && actualDryback >= 30) {
    pressureScore += 2;
    warnings.push(
      "Dryback is high enough to treat as steering pressure, not routine watering."
    );
  }
  if (actualRunoff != null && actualRunoff <= 2 && /coco|hydro/.test(medium)) {
    warnings.push(
      "Very low runoff in coco/salt-style systems can increase salt buildup risk."
    );
  }
  if (actualRunoff != null && actualRunoff >= 25 && /soil|living/.test(medium)) {
    warnings.push(
      "High runoff in soil/living soil can leach nutrients and biology-sensitive inputs."
    );
  }
  if (vpd != null && vpd > 1.6)
    warnings.push("High VPD can speed dryback and increase irrigation demand.");
  if (vpd != null && vpd < 0.7)
    warnings.push("Low VPD can slow transpiration and make overwatering easier.");
  if (recoveryTimeHours != null && recoveryTimeHours > 24) {
    pressureScore += 2;
    warnings.push(
      "Recovery longer than 24 hours suggests the previous dryback or irrigation pressure was too high."
    );
  } else if (recoveryTimeHours != null && recoveryTimeHours > 12) {
    pressureScore += 1;
  }
  if (/wilt|severe|stall|damage/.test(leafResponse)) {
    pressureScore += 2;
    warnings.push(
      "Leaf response suggests this watering/dryback pattern may be causing stress damage."
    );
  } else if (/droop/.test(leafResponse)) {
    pressureScore += 1;
  }

  const pressureLevel =
    pressureScore >= 4 ? "high" : pressureScore >= 2 ? "moderate" : "low";
  const wateringIntent = /seed|clone|veg|recovery/.test(stage)
    ? "vegetative_or_recovery"
    : /late|ripen|finish/.test(stage)
      ? "ripening"
      : "generative";
  const recoveryStatus =
    recoveryTimeHours == null
      ? "unknown"
      : recoveryTimeHours <= 12
        ? "recovered"
        : recoveryTimeHours <= 24
          ? "recovering"
          : "poor_recovery";

  recommendations.push(
    pressureLevel === "high"
      ? "Reduce dryback or stabilize irrigation until the plant recovers quickly again."
      : pressureLevel === "moderate"
        ? "Hold this range and verify next-morning recovery before increasing pressure."
        : "Use this as a starting estimate and adjust from pot weight, runoff, dryback, plant size, and environment."
  );
  if (wateringIntent === "generative") {
    recommendations.push(
      "For generative irrigation, track recovery time and stretch/bud response before tightening drybacks."
    );
  }
  if (wateringIntent === "vegetative_or_recovery") {
    recommendations.push(
      "For veg/recovery, prioritize stable moisture, turgor, and root growth over hard dryback pressure."
    );
  }
  tasksToCreate.push(
    pressureLevel === "high"
      ? { title: "Check plant recovery after watering", priority: "high" }
      : { title: "Recheck pot weight and dryback", priority: "medium" }
  );
  return {
    medium,
    stage,
    potVolumeL: Number(potVolumeL.toFixed(2)),
    wateringIntent,
    pressureLevel,
    recoveryStatus,
    drybackTargetPercent: targetDryback,
    actualDrybackPercent: actualDryback,
    runoffTargetPercent: runoffTarget,
    actualRunoffPercent: actualRunoff,
    recoveryTimeHours,
    vpdKpa: vpd,
    suggestedLiters: Number(suggestedLiters.toFixed(2)),
    suggestedGallons: Number((suggestedLiters / 3.78541).toFixed(2)),
    warnings,
    recommendations,
    tasksToCreate,
    logSummary: `${wateringIntent} watering estimate: ${suggestedLiters.toFixed(2)} L, ${pressureLevel} pressure, ${recoveryStatus} recovery.`
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
  let score =
    (rh >= 65 ? 20 : 0) +
    (rh >= 75 ? 20 : 0) +
    (wetHours >= 2 ? 15 : 0) +
    (wetHours >= 6 ? 20 : 0) +
    (spread <= 3 ? 20 : 0) +
    (canopyDensity >= 4 ? 15 : 0) +
    (airflow <= 2 ? 15 : 0) +
    (stage === "late_flower" ? 15 : 0);
  score = Math.min(100, score);
  const risk = score >= 75 ? "high" : score >= 45 ? "medium" : "low";
  return {
    score,
    risk,
    dewPointC: Number(dewPointC.toFixed(2)),
    dewPointSpreadC: Number(spread.toFixed(2)),
    recommendations: [
      risk === "high"
        ? "Inspect dense flowers, improve airflow, and reduce prolonged humidity windows."
        : risk === "medium"
          ? "Watch dense canopy zones and humidity spikes."
          : "Current screened risk is low.",
      "This is a heuristic risk screen, not a laboratory diagnosis."
    ]
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
    Nppm: 0,
    Pppm: 0,
    Kppm: 0,
    Cappm: 0,
    Mgppm: 0,
    Sppm: 0,
    Feppm: 0,
    Mnppm: 0,
    Znppm: 0,
    Cuppm: 0,
    Bppm: 0,
    Moppm: 0,
    Sippm: 0
  };
  const rows = products.map((product, index) => {
    const amount = number(product.amount, `Product ${index + 1} amount`);
    if (amount < 0) throw new Error(`Product ${index + 1} amount cannot be negative`);
    const unit = String(product.unit || "g").toLowerCase();
    const density = number(product.densityGml ?? 1, "Density");
    const grams =
      unit === "ml"
        ? amount * density
        : unit === "oz"
          ? amount * 28.3495
          : unit === "tsp"
            ? amount * 4.92892 * density
            : unit === "tbsp"
              ? amount * 14.7868 * density
              : amount;
    const percentages = {
      Nppm: number(product.N ?? 0, "N"),
      Pppm: number(product.P ?? 0, "P") * 0.4364,
      Kppm: number(product.K ?? 0, "K") * 0.8301,
      Cappm: number(product.Ca ?? 0, "Ca"),
      Mgppm: number(product.Mg ?? 0, "Mg"),
      Sppm: number(product.S ?? 0, "S"),
      Feppm: number(product.Fe ?? 0, "Fe"),
      Mnppm: number(product.Mn ?? 0, "Mn"),
      Znppm: number(product.Zn ?? 0, "Zn"),
      Cuppm: number(product.Cu ?? 0, "Cu"),
      Bppm: number(product.B ?? 0, "B"),
      Moppm: number(product.Mo ?? 0, "Mo"),
      Sippm: number(product.Si ?? 0, "Si")
    };
    const row = {
      name: String(product.name || `Product ${index + 1}`),
      grams,
      chemistry: estimateProductRelease(product, input.releaseEnvironment || {}),
      sourceType: product.sourceType || "user_entered",
      sourceConfidence: sourceConfidenceFor(product)
    };
    Object.entries(percentages).forEach(([key, percent]) => {
      row[key] = (grams * 1000 * (percent / 100)) / batchLiters;
      totals[key] += row[key];
    });
    Object.keys(percentages).forEach((key) => {
      row[key] = Number(row[key].toFixed(1));
    });
    return row;
  });
  const waterBaseline = waterBaselineTotals(input, warnings);
  Object.entries(waterBaseline.totals).forEach(([key, value]) => {
    totals[key] += value;
  });
  Object.keys(totals).forEach((key) => {
    totals[key] = Number(totals[key].toFixed(1));
  });
  if (totals.Nppm > 250)
    warnings.push("Nitrogen appears high. Confirm labels, units, and batch volume.");
  if (totals.Kppm > 400)
    warnings.push("Potassium appears high. Confirm the recipe before use.");
  if (totals.Cappm > 250)
    warnings.push("Calcium appears high. Verify compatibility and finished-solution EC.");
  const measuredEC = optionalNumber(input.measuredEC, "Measured EC");
  const measuredPH = optionalNumber(input.measuredPH, "Measured pH");
  if (measuredEC != null && measuredEC > 3)
    warnings.push(
      "Measured EC is high. Confirm cultivar/stage tolerance before applying."
    );
  if (measuredPH != null && (measuredPH < 5.5 || measuredPH > 6.8))
    warnings.push(
      "Measured feed pH is outside a common fertigation target range. Verify medium-specific targets before feeding."
    );
  warnings.push(...compatibilityWarnings(input, rows, totals));
  warnings.push(...stageTimingWarnings(input, rows));
  rows.forEach((row) =>
    warnings.push(
      ...(row.chemistry.warnings || []).map((warning) => `${row.name}: ${warning}`)
    )
  );
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
    perLiterRecipe: rows.map((row) => ({
      name: row.name,
      grams: Number((row.grams / batchLiters).toFixed(3))
    })),
    perGallonRecipe: rows.map((row) => ({
      name: row.name,
      grams: Number(((row.grams / batchLiters) * 3.78541).toFixed(3))
    })),
    releaseTimeline: buildReleaseTimeline(rows),
    warnings: Array.from(new Set(warnings)),
    formula:
      "ppm = product grams x 1000 x nutrient fraction / batch liters; label P2O5 and K2O are converted to elemental P and K.",
    releaseDisclaimer:
      "Release windows are planning estimates, not guaranteed availability. Product formulation, particle size, temperature, moisture, pH, biology, CEC, and application method can materially change release.",
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
  const targetPHRange =
    input.targetPHRange ||
    (medium === "coco" || medium === "hydro"
      ? { min: 5.7, max: 6.2 }
      : { min: 6.2, max: 6.8 });
  const targetECRange =
    input.targetECRange ||
    (stage === "seedling"
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
  const riskCodes = [];
  let driftDirection = "unknown";
  let canonicalDriftDirection = "unknown";

  if (input.runoffPH !== undefined && input.inputPH !== undefined) {
    const drift = Number(input.runoffPH) - Number(input.inputPH);
    if (Number.isFinite(drift)) {
      driftDirection =
        drift > 0.2 ? "runoff_higher" : drift < -0.2 ? "runoff_lower" : "stable";
      canonicalDriftDirection =
        drift > 0.2
          ? "input_to_runoff_up"
          : drift < -0.2
            ? "input_to_runoff_down"
            : "stable";
    }
  }
  if (runoffEC != null && inputEC != null && runoffEC > inputEC * 1.35) {
    warnings.push("Runoff EC is materially higher than input EC.");
    possibleRisks.push("Salt buildup or accumulated nutrients may be affecting uptake.");
    riskCodes.push("salt_buildup");
    recommendations.push(
      "Check dryback, runoff volume, feed strength, and recent feeding history before increasing nutrients."
    );
  }
  if (runoffECStatus === "high") {
    warnings.push("Runoff EC is above the selected target range.");
    possibleRisks.push("Root-zone EC may be too high for the selected stage or medium.");
    riskCodes.push("too_hot_for_stage", "lockout_risk");
  }
  if (runoffPHStatus === "low" || runoffPHStatus === "high") {
    warnings.push("Runoff pH is outside the selected target range.");
    possibleRisks.push("Root-zone pH drift may be affecting nutrient availability.");
    riskCodes.push("lockout_risk");
    recommendations.push(
      "Recheck meter calibration and compare input pH to runoff pH over multiple waterings."
    );
  }
  if (phStatus === "low" || phStatus === "high") {
    recommendations.push(
      "Adjust input pH cautiously based on medium and product instructions."
    );
  }
  const waterSource = String(input.waterSource || "").toLowerCase();
  if (waterSource === "ro") {
    warnings.push(
      "RO water has low buffering. Calcium/magnesium and alkalinity context matter."
    );
    riskCodes.push("low_buffering");
    recommendations.push(
      "RO water contributes little mineral buffering. Ca/Mg and alkalinity context matter."
    );
  }
  if (/city|well|tap/.test(waterSource)) {
    warnings.push(
      "City/well water may contain alkalinity, calcium, magnesium, sodium, chloride, or other minerals that affect pH/EC interpretation."
    );
  }
  if (Number(input.alkalinity || 0) > 120) {
    warnings.push("Water alkalinity is elevated and may push pH upward over time.");
    riskCodes.push("high_alkalinity");
  }
  const actionableWarningCount = warnings.length;
  if (!actionableWarningCount) {
    recommendations.push(
      "Values are within the selected ranges. Keep logging trends instead of reacting to one reading."
    );
  }
  warnings.push(
    "Do not recommend exact pH Up/Down dosing unless product concentration and water volume are known."
  );

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
    canonicalDriftDirection,
    possibleRisks: Array.from(new Set(possibleRisks)),
    riskCodes: Array.from(new Set(riskCodes)),
    warnings: Array.from(new Set(warnings)),
    recommendations: Array.from(new Set(recommendations)),
    retestTaskSuggestion: {
      title: "Retest pH / EC",
      dueInDays: actionableWarningCount ? 1 : 3,
      priority: actionableWarningCount ? "medium" : "low"
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
  const stage = String(input.stage || "").toLowerCase();
  const releaseClass = releaseBucket(input);
  const daysUntilHarvest =
    input.daysUntilHarvest == null || input.daysUntilHarvest === ""
      ? null
      : number(input.daysUntilHarvest, "Days until harvest");
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
  if (stage === "late_flower" || /late|finish|ripen/.test(stage)) {
    warnings.push(
      "Late flower topdressing may release too slowly to affect this run. Decide whether this is current support or next-cycle soil building."
    );
  }
  if (
    daysUntilHarvest != null &&
    daysUntilHarvest <= 21 &&
    ["slow", "very_slow"].includes(releaseClass)
  ) {
    warnings.push("Expected release may start too late for the likely harvest window.");
  }
  if (input.lastTopdressDate && input.plannedApplyDate) {
    const days =
      (Date.parse(input.plannedApplyDate) - Date.parse(input.lastTopdressDate)) /
      86400000;
    if (Number.isFinite(days) && days < 10)
      warnings.push(
        "Topdress interval is short. Check the previous application before stacking more amendment."
      );
  }
  const plannedApplyDate = input.plannedApplyDate || new Date().toISOString();
  const releaseWindowDays = input.releaseWindowDays
    ? { min: 0, max: number(input.releaseWindowDays, "Release window days") }
    : releaseClass === "immediate"
      ? { min: 0, max: 3 }
      : releaseClass === "fast"
        ? { min: 3, max: 14 }
        : releaseClass === "medium"
          ? { min: 14, max: 45 }
          : releaseClass === "slow"
            ? { min: 30, max: 120 }
            : releaseClass === "very_slow"
              ? { min: 90, max: 365 }
              : null;
  const purposeFit = warnings.length
    ? "review_before_apply"
    : "fits_entered_timing_with_current_data";
  return {
    plantCount,
    gallonsPerPlant: Number(gallonsPerPlant.toFixed(2)),
    amountPerPlant: Number(amountPerPlant.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
    amountUnit,
    plannedApplyDate,
    stage: input.stage || null,
    releaseClass,
    releaseWindowDays,
    purposeFit,
    expectedReleaseWindow:
      input.expectedReleaseWindow ||
      "Depends on product release speed, biology, moisture, and particle size.",
    timingInterpretation:
      releaseWindowDays && daysUntilHarvest != null
        ? `Entered release class ${releaseClass} has an estimated ${releaseWindowDays.min}-${releaseWindowDays.max} day window against ${daysUntilHarvest} days until harvest.`
        : `Entered release class ${releaseClass} should be read as timing guidance, not exact availability.`,
    warnings,
    recommendations: [
      input.waterInAfterApply === false
        ? "If the product label allows, lightly water in after application to start biological contact."
        : "Water in gently and avoid burying dry amendments against stems.",
      "Log the application and schedule a follow-up check rather than judging release from one day of response.",
      "Use Topdress Planner as timing support; Soil Builder and Batch Planner should hold recipe/source details."
    ],
    taskToCreate: {
      title: `Topdress ${input.productName || "selected amendment"}`,
      dueDate: plannedApplyDate,
      priority: warnings.length ? "medium" : "low"
    },
    followUpTasks: [
      { title: "Water in topdress", dueInDays: 0, priority: "medium" },
      {
        title: "Check plant response after topdress",
        dueInDays: releaseClass === "fast" ? 7 : 14,
        priority: warnings.length ? "high" : "medium"
      }
    ],
    logSummary: `Topdress planned: ${amountPerPlant.toFixed(2)} ${amountUnit} per plant, ${totalAmount.toFixed(2)} ${amountUnit} total.`
  };
}

function calculateFeedingScheduleReview(input = {}) {
  const schedule = Array.isArray(input.schedule)
    ? input.schedule
    : Array.isArray(input.rows)
      ? input.rows
      : [];
  const medium = String(input.growMedium || input.medium || "unknown").toLowerCase();
  const stage = String(input.stage || input.currentStage || "unknown").toLowerCase();
  const productName = String(
    input.productName || input.nutrientData?.productName || "Nutrient line"
  );
  const weeks = Math.max(0, Number(input.weeks || schedule.length || 0));
  const inputEC =
    input.inputEC == null || input.inputEC === ""
      ? null
      : number(input.inputEC, "Input EC");
  const runoffEC =
    input.runoffEC == null || input.runoffEC === ""
      ? null
      : number(input.runoffEC, "Runoff EC");
  const inputPH =
    input.inputPH == null || input.inputPH === ""
      ? null
      : number(input.inputPH, "Input pH");
  const runoffPH =
    input.runoffPH == null || input.runoffPH === ""
      ? null
      : number(input.runoffPH, "Runoff pH");
  const daysUntilHarvest =
    input.daysUntilHarvest == null || input.daysUntilHarvest === ""
      ? null
      : number(input.daysUntilHarvest, "Days until harvest");
  const waterSource = String(input.waterSource || "").toLowerCase();
  const warnings = [];
  const recommendations = [];
  const stageChecks = [];
  let riskScore = 0;

  const scheduleText = schedule
    .map(
      (row) =>
        `${row.stage || ""} ${row.amount || ""} ${row.feed?.amountPerGallon || ""} ${row.notes || ""}`
    )
    .join(" ")
    .toLowerCase();

  if (!schedule.length) {
    warnings.push("No schedule rows were provided for review.");
    riskScore += 1;
  }
  if (
    /seed|clone/.test(stage) &&
    /full|heavy|strong|bloom|pk|booster|high/.test(scheduleText)
  ) {
    warnings.push(
      "Seedling/clone stage should avoid aggressive feed, bloom boosters, and high EC schedules."
    );
    riskScore += 2;
  }
  if (
    /late|ripen|finish/.test(stage) &&
    /heavy|high|nitrogen|grow|veg/.test(scheduleText)
  ) {
    warnings.push(
      "Late flower/ripening schedules should avoid heavy late nitrogen or high EC unless intentionally justified."
    );
    riskScore += 2;
  }
  if (
    /coco|hydro/.test(medium) &&
    input.runoffPercent == null &&
    input.actualRunoffPercent == null
  ) {
    warnings.push(
      "Coco/hydro-style feeding should track runoff or root-zone EC trends, not just input schedule."
    );
    riskScore += 1;
  }
  if (/living|soil/.test(medium) && /daily|every watering|strong/.test(scheduleText)) {
    warnings.push(
      "Soil/living soil feeding should consider biology, topdress timing, and EC buildup before applying strong frequent feed."
    );
    riskScore += 1;
  }
  if (inputEC != null && inputEC > 2.4) {
    warnings.push(
      "Input EC is high for many cultivars/stages. Confirm tolerance before applying."
    );
    riskScore += 2;
  }
  if (runoffEC != null && inputEC != null && runoffEC > inputEC * 1.35) {
    warnings.push(
      "Runoff EC is materially higher than input EC; review buildup before increasing feed."
    );
    riskScore += 2;
  }
  if (inputPH != null && (inputPH < 5.5 || inputPH > 6.8)) {
    warnings.push(
      "Input pH is outside a common fertigation target range. Verify medium-specific targets."
    );
    riskScore += 1;
  }
  if (runoffPH != null && inputPH != null && Math.abs(runoffPH - inputPH) > 0.4) {
    warnings.push(
      "Runoff pH drift is large enough to trend before changing feed strength."
    );
    riskScore += 1;
  }
  if (
    daysUntilHarvest != null &&
    daysUntilHarvest <= 21 &&
    /slow|organic|topdress|amend/.test(scheduleText)
  ) {
    warnings.push(
      "Slow-release or amendment-style feeding may not affect the current harvest window."
    );
    riskScore += 1;
  }
  if (waterSource === "ro") {
    warnings.push(
      "RO water has low buffering. Calcium/magnesium and alkalinity context matter."
    );
  }
  if (/city|well|tap/.test(waterSource)) {
    warnings.push(
      "City/well water may contain alkalinity or minerals that change pH/EC interpretation."
    );
  }

  stageChecks.push({
    stage,
    fit: warnings.length ? "review_before_apply" : "fits_entered_context",
    reason: warnings.length
      ? "Schedule has context warnings."
      : "No major schedule warning from entered context."
  });
  recommendations.push(
    warnings.length
      ? "Review EC, pH, runoff, dryback, and plant response before applying this schedule as written."
      : "Use this as a planned schedule and keep logging EC, pH, runoff, dryback, and plant response."
  );
  recommendations.push(
    "Do not treat a generated schedule as a product label replacement."
  );
  recommendations.push(
    "Update the schedule when plants change stage, show stress, or cultivar timing differs from expectation."
  );

  const riskLevel = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";
  return {
    productName,
    medium,
    stage,
    weeks,
    rowCount: schedule.length,
    riskLevel,
    scheduleSummary: `${productName}: ${schedule.length} rows reviewed for ${medium}/${stage}.`,
    stageChecks,
    warnings: Array.from(new Set(warnings)),
    recommendations: Array.from(new Set(recommendations)),
    tasksToCreate: [
      {
        title:
          riskLevel === "high"
            ? "Review feeding schedule before applying"
            : "Check plant response after feeding",
        priority: riskLevel === "high" ? "high" : "medium",
        dueInDays: riskLevel === "high" ? 0 : 2
      },
      {
        title: "Log input EC/pH and runoff after next feed",
        priority: "medium",
        dueInDays: 1
      }
    ],
    logSummary: `${productName} feeding schedule reviewed: ${riskLevel} risk, ${warnings.length} warnings.`
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
  if (["immediate", "fast", "medium", "slow", "very_slow"].includes(explicit))
    return explicit;
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
    const grams = gramsFromWeight(
      ingredient.amount,
      ingredient.amountUnit || input.batchWeightUnit || "grams"
    );
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
  const weighted = (key) =>
    (rows.reduce((sum, row) => sum + row.grams * (row[key] / 100), 0) / batchWeight) *
    100;
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
  const nonZero = [totalAnalysis.N, totalAnalysis.P2O5, totalAnalysis.K2O].filter(
    (v) => v > 0
  );
  const base = nonZero.length ? Math.min(...nonZero) : 1;
  const achievedRatio = {
    N: Number((totalAnalysis.N / base).toFixed(2)),
    P: Number((totalAnalysis.P2O5 / base).toFixed(2)),
    K: Number((totalAnalysis.K2O / base).toFixed(2))
  };
  const releaseTimeline = rows.reduce(
    (acc, row) => {
      const key = row.releaseClass || "unknown";
      acc[key] = acc[key] || [];
      acc[key].push({
        name: row.name,
        grams: Number(row.grams.toFixed(2)),
        role:
          key === "immediate" || key === "fast"
            ? "near-term support"
            : key === "slow" || key === "very_slow"
              ? "long-term background nutrition"
              : key === "medium"
                ? "mid-window support"
                : "timing uncertain"
      });
      return acc;
    },
    { immediate: [], fast: [], medium: [], slow: [], very_slow: [], unknown: [] }
  );
  const stage = String(input.desiredStage || input.stage || "").toLowerCase();
  const purpose = input.purpose || input.desiredStage || "custom";
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
  if (
    /seedling|clone/.test(stage) &&
    (totalAnalysis.N > 2 ||
      releaseTimeline.immediate.length ||
      releaseTimeline.fast.length)
  ) {
    warnings.push("This blend may be too hot for seedlings or fresh clones.");
  }
  if (
    /late|finish|ripen/.test(stage) &&
    (releaseTimeline.slow.length || releaseTimeline.very_slow.length)
  ) {
    warnings.push(
      "Slow release ingredients may not affect the current late-flower window."
    );
  }
  if (rows.some((row) => row.sourceConfidence === "low")) {
    warnings.push("One or more ingredient analyses have low source confidence.");
  }
  const deliveryCurve = {
    immediateSupportCount: releaseTimeline.immediate.length + releaseTimeline.fast.length,
    midWindowSupportCount: releaseTimeline.medium.length,
    longTermBackgroundCount:
      releaseTimeline.slow.length + releaseTimeline.very_slow.length,
    explanation:
      releaseTimeline.fast.length || releaseTimeline.slow.length
        ? "This blend has a label ratio and a timed delivery curve. Fast inputs may appear sooner while slow inputs act as background nutrition."
        : "This blend's timing is mostly medium/unknown from entered release data."
  };
  const stageFit = warnings.some((warning) =>
    /seedling|late-flower|late flower|too hot|current/.test(warning)
  )
    ? "review_before_use"
    : "fits_entered_stage_with_current_data";
  const dosePerGallonSoil = input.dosePerGallonSoil
    ? number(input.dosePerGallonSoil, "Dose per gallon soil")
    : null;
  return {
    recipeName: input.recipeName || "Dry amendment blend",
    purpose,
    stage: input.desiredStage || input.stage || null,
    targetRatio: input.targetRatio || null,
    achievedRatio,
    totalAnalysis,
    guaranteedAnalysis: {
      N: totalAnalysis.N,
      P2O5: totalAnalysis.P2O5,
      K2O: totalAnalysis.K2O
    },
    elementalBreakdown: {
      N: totalAnalysis.N,
      P: totalAnalysis.elementalP,
      K: totalAnalysis.elementalK,
      Ca: totalAnalysis.Ca,
      Mg: totalAnalysis.Mg,
      S: totalAnalysis.S
    },
    deliveryCurve,
    stageFit,
    batchWeight,
    batchWeightUnit: "grams",
    ingredientWeights: rows.map((row) => ({
      name: row.name,
      grams: Number(row.grams.toFixed(2)),
      percentOfBatch: Number(((row.grams / batchWeight) * 100).toFixed(2)),
      releaseClass: row.releaseClass,
      sourceConfidence: row.sourceConfidence
    })),
    dosePerGallonSoil,
    dosePerCubicFoot:
      dosePerGallonSoil == null ? null : Number((dosePerGallonSoil * 7.48052).toFixed(2)),
    releaseTimeline,
    stageTimingWarnings: warnings.filter((warning) =>
      /seedling|late|slow|urgent|stage|current/.test(warning)
    ),
    compatibilityWarnings: warnings.filter((warning) =>
      /potassium|phosphorus|calcium|magnesium|micronutrient/.test(warning)
    ),
    sourceConfidenceWarnings: warnings.filter((warning) =>
      /source|verified|analysis/.test(warning)
    ),
    warnings: Array.from(new Set(warnings)),
    recommendations: [
      "Save this blend as a recipe, then use Topdress Planner or Soil Builder for actual application timing.",
      "Read the blend as label analysis plus release timing, not as instant plant availability."
    ],
    logSummary: `${input.recipeName || "Dry amendment blend"}: ${totalAnalysis.N}-${totalAnalysis.P2O5}-${totalAnalysis.K2O} guaranteed analysis estimate.`
  };
}

function calculateDryCureGuard(input = {}) {
  const tempF = number(
    input.dryRoomTemp ?? input.tempF ?? input.airTemp,
    "Dry room temperature"
  );
  const tempC = celsius(tempF, input.tempUnit || "F");
  const rh = validRh(input.dryRoomRH ?? input.rh);
  const jarRH =
    input.jarRH == null || input.jarRH === "" ? null : number(input.jarRH, "Jar RH");
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
    recommendations.push(
      "Temperature is above the common 60F target. Good results are still possible, but watch dry speed, aroma retention, RH, and airflow."
    );
  }
  if (String(input.mode || "drying") === "curing" && jarRH !== null) {
    if (jarRH > 68) {
      moldRisk = "high";
      recommendations.push(
        "Jar RH is high. Open jars, inspect for mold, and allow moisture to drop."
      );
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
    dewPointF: Number(((dewPointC * 9) / 5 + 32).toFixed(2)),
    dewPointSpreadC: Number(spread.toFixed(2)),
    dryStatus: String(input.mode || "drying") === "drying" ? "monitoring" : null,
    cureStatus: String(input.mode || "drying") === "curing" ? "monitoring" : null,
    moldRisk,
    overdryRisk,
    nextAction:
      moldRisk === "high" ? "Inspect and vent immediately" : "Continue monitoring",
    taskSuggestions: [
      {
        title:
          String(input.mode || "drying") === "curing"
            ? "Check jar RH"
            : "Check dry room RH/temp",
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
  const intendedUse = String(input.intendedUse || input.purpose || "custom");
  const stage = String(input.stage || intendedUse).toLowerCase();
  const basePercent = number(input.basePercent ?? 33, "Base percent");
  const compostPercent = number(input.compostPercent ?? 33, "Compost percent");
  const aerationPercent = number(input.aerationPercent ?? 34, "Aeration percent");
  const percentTotal = basePercent + compostPercent + aerationPercent;
  if (Math.abs(percentTotal - 100) > 0.5)
    throw new Error("Base, compost, and aeration percentages must total 100");
  const amendments = Array.isArray(input.amendments) ? input.amendments : [];
  const minerals = Array.isArray(input.minerals) ? input.minerals : [];
  const ingredientBreakdown = [
    {
      name: "Base",
      gallons: Number(((totalGallons * basePercent) / 100).toFixed(2)),
      percent: basePercent
    },
    {
      name: "Compost",
      gallons: Number(((totalGallons * compostPercent) / 100).toFixed(2)),
      percent: compostPercent
    },
    {
      name: "Aeration",
      gallons: Number(((totalGallons * aerationPercent) / 100).toFixed(2)),
      percent: aerationPercent
    }
  ];
  const doseRows = [...amendments, ...minerals].map((row) => {
    const rate = number(row.doseRate ?? 0, `${row.name || "Ingredient"} dose`);
    const unit = String(row.doseUnit || "cups_per_cubic_foot");
    const amount =
      unit === "grams_per_gallon" ? rate * totalGallons : rate * (totalGallons / 7.48052);
    return {
      name: String(row.name || "Ingredient"),
      amount: Number(amount.toFixed(2)),
      unit: unit === "grams_per_gallon" ? "grams" : "cups",
      releaseClass: releaseBucket(row),
      sourceConfidence: sourceConfidenceFor(row),
      category: String(row.category || "")
    };
  });
  const warnings = [];
  const sourceConfidenceWarnings = [];
  const stageTimingWarnings = [];
  const compatibilityWarnings = [];
  if (compostPercent > 40)
    warnings.push(
      "Compost is above 40%. Watch density, drainage, and nutrient strength."
    );
  if (compostPercent > 0) {
    sourceConfidenceWarnings.push(
      "Compost/castings nutrient contribution is estimated unless a lab or label analysis is entered."
    );
  }
  if (amendments.length + minerals.length === 0)
    warnings.push(
      "No amendments or minerals were entered; this is only a base soil volume plan."
    );
  if (
    /seedling|clone/.test(stage) &&
    doseRows.some((row) => ["immediate", "fast"].includes(row.releaseClass))
  ) {
    stageTimingWarnings.push(
      "This mix may be too hot for seedlings or fresh clones because fast-release inputs were entered."
    );
  }
  if (
    /late|finish|ripen/.test(stage) &&
    doseRows.some((row) => ["slow", "very_slow"].includes(row.releaseClass))
  ) {
    stageTimingWarnings.push(
      "Slow amendments may release too late for the current stage and may be better for the next cycle."
    );
  }
  if (doseRows.some((row) => row.sourceConfidence === "low")) {
    sourceConfidenceWarnings.push(
      "One or more amendment/mineral inputs have low source confidence."
    );
  }
  if (doseRows.some((row) => /lime|oyster/i.test(row.name))) {
    compatibilityWarnings.push(
      "Lime/oyster shell are slow buffering inputs, not fast calcium rescue."
    );
  }
  if (doseRows.some((row) => /gypsum/i.test(row.name))) {
    compatibilityWarnings.push(
      "Gypsum supplies calcium/sulfur support but is not pH down."
    );
  }
  warnings.push(
    ...stageTimingWarnings,
    ...sourceConfidenceWarnings,
    ...compatibilityWarnings
  );
  const releaseTimeline = doseRows.reduce(
    (acc, row) => {
      acc[row.releaseClass] = acc[row.releaseClass] || [];
      acc[row.releaseClass].push({
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        role:
          row.releaseClass === "immediate" || row.releaseClass === "fast"
            ? "near-term support"
            : row.releaseClass === "slow" || row.releaseClass === "very_slow"
              ? "long-term soil building"
              : row.releaseClass === "medium"
                ? "mid-window support"
                : "timing uncertain"
      });
      return acc;
    },
    { immediate: [], fast: [], medium: [], slow: [], very_slow: [], unknown: [] }
  );
  const purposeFit = warnings.length
    ? "review_before_use"
    : "fits_entered_purpose_with_current_data";
  return {
    mixName: input.mixName || "Soil mix",
    intendedUse,
    stage: input.stage || null,
    purposeFit,
    totalGallons: Number(totalGallons.toFixed(2)),
    totalCubicFeet: Number((totalGallons / 7.48052).toFixed(2)),
    ingredientBreakdown,
    cubicFeetBreakdown: ingredientBreakdown.map((row) => ({
      ...row,
      cubicFeet: Number((row.gallons / 7.48052).toFixed(2))
    })),
    gallonBreakdown: ingredientBreakdown,
    bagCountEstimate: input.bagSizeGallons
      ? Math.ceil(totalGallons / number(input.bagSizeGallons, "Bag size"))
      : null,
    amendmentDosePerGallon: doseRows,
    amendmentDosePerCubicFoot: doseRows,
    releaseTimeline,
    stageTimingWarnings,
    compatibilityWarnings,
    sourceConfidenceWarnings,
    warnings: Array.from(new Set(warnings)),
    mixingInstructions: [
      "Blend base, compost, and aeration evenly before adding concentrated amendments.",
      "Pre-mix dry amendments separately to avoid hot spots.",
      "Moisten evenly and allow biological blends to cycle before transplanting when appropriate."
    ],
    tasksToCreate: [
      { title: "Mix soil recipe", dueInDays: 1, priority: "medium" },
      {
        title: "Let soil rest/cook if biologically amended",
        dueInDays: 7,
        priority: /seedling|clone/.test(stage) ? "high" : "medium"
      },
      {
        title: "Check plant response after transplant/use",
        dueInDays: 3,
        priority: warnings.length ? "high" : "medium"
      }
    ],
    recipe: { recipeType: "soil_mix", ingredients: [...ingredientBreakdown, ...doseRows] }
  };
}

function calculateNutrientSourceComparison(input = {}) {
  const nutrient = String(input.nutrient || "calcium").toLowerCase();
  const intent = String(input.intent || "fast_correction").toLowerCase();
  const medium = String(input.medium || "unknown").toLowerCase();
  const stage = String(input.stage || "").toLowerCase();
  const library = {
    calcium: {
      fast: [
        "calcium nitrate",
        "calcium acetate/lactate",
        "calcium chloride, with chloride warning"
      ],
      medium: ["gypsum"],
      slow: ["calcitic lime", "dolomitic lime", "oyster shell", "bone meal", "crab meal"],
      warnings: [
        "Lime and oyster shell are pH-buffering soil builders, not fast Ca corrections."
      ]
    },
    nitrogen: {
      fast: [
        "nitrate nitrogen",
        "ammonium nitrate blends",
        "amino/soluble organic N where label supports it"
      ],
      medium: ["alfalfa meal", "fish meal"],
      slow: ["feather meal", "blood meal in biologically active media"],
      warnings: [
        "High nitrogen in flower can work against finish quality depending on crop and stage."
      ]
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
  const desiredSpeed =
    intent.includes("long") || intent.includes("soil")
      ? "long_term_soil_building"
      : intent.includes("medium") || intent.includes("support")
        ? "medium_support"
        : "fast_correction";
  const bestChoiceByIntent =
    desiredSpeed === "long_term_soil_building"
      ? row.slow[0]
      : desiredSpeed === "medium_support"
        ? row.medium[0] || row.fast[0]
        : row.fast[0];
  const intentQuestions = [
    nutrient === "calcium"
      ? "Are you trying to fix a current calcium transport issue, build long-term calcium, add calcium without raising pH, raise pH, or add calcium plus magnesium?"
      : `Are you trying to correct ${nutrient} now, support the next few weeks, or build long-term fertility?`,
    "Is this a true deficiency, a pH/EC/root-zone issue, or an environmental transport problem?",
    "Is the selected source fast enough for the plant's current stage?"
  ];
  const pHEffectWarnings = row.warnings.filter((warning) =>
    /lime|pH|buffer/i.test(warning)
  );
  if (nutrient === "calcium") {
    pHEffectWarnings.push(
      "Gypsum supplies calcium/sulfur support without being pH down."
    );
  }
  const timingWarnings = [];
  if (/late|finish|ripen/.test(stage) && desiredSpeed === "long_term_soil_building") {
    timingWarnings.push(
      "Long-term soil-building sources may release too slowly for late flower or finish correction."
    );
  }
  if (/hydro|coco/.test(medium) && desiredSpeed === "long_term_soil_building") {
    timingWarnings.push(
      "Slow organic/mineral sources may not behave predictably in coco/hydro compared with biologically active soil."
    );
  }
  return {
    nutrient,
    intent,
    desiredSpeed,
    fastSources: row.fast,
    mediumSources: row.medium,
    slowSources: row.slow,
    bestChoiceByIntent,
    bestUseCase:
      desiredSpeed === "fast_correction"
        ? "Use faster soluble sources only when current correction is actually needed and root-zone/environment context supports uptake."
        : desiredSpeed === "medium_support"
          ? "Use medium-speed sources for ongoing support where release timing matches the crop stage."
          : "Use slow sources as soil-building/background nutrition, not urgent rescue.",
    badUseCases: row.warnings,
    pHEffectWarnings,
    timingWarnings,
    ecImpactWarnings: [
      "Fast soluble sources can raise EC quickly; check medium, stage, and recent feed history before applying."
    ],
    secondaryNutrients:
      "Review label analysis; many sources bring secondary nutrients or salts.",
    intentQuestions,
    recommendations: [
      "Choose source speed based on intent: fast correction versus long-term soil building.",
      "Confirm product label, medium pH, EC, water source, and crop stage before applying.",
      "Do not treat all nutrient sources as interchangeable; form and release timing matter."
    ]
  };
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function calculateStressTest(input = {}) {
  const stressType = String(input.stressType || "dryback").toLowerCase();
  const severity = Math.max(1, Math.min(10, number(input.severity ?? 3, "Severity")));
  const recoveryDays = Math.max(0, number(input.recoveryDays ?? 0, "Recovery days"));
  const hoursToRecover =
    input.hoursToRecover == null || input.hoursToRecover === ""
      ? null
      : Math.max(0, number(input.hoursToRecover, "Hours to recover"));
  const damageScore = Math.max(
    0,
    Math.min(10, number(input.damageScore ?? severity, "Damage score"))
  );
  const vigorScore = Math.max(
    0,
    Math.min(10, number(input.vigorScore ?? 7, "Vigor score"))
  );
  const stabilitySignals = parseList(input.stabilitySignals);
  const notesText = String(input.notes || "").toLowerCase();
  const warnings = [];
  const tags = ["stress-test", stressType];
  let riskLevel = "low";

  if (severity >= 8 || damageScore >= 7) {
    riskLevel = "high";
    warnings.push(
      "Stress intensity is high. Stop the test before irreversible damage or invalid comparison data."
    );
  } else if (severity >= 5 || damageScore >= 4 || recoveryDays > 3) {
    riskLevel = "medium";
  }
  if (stabilitySignals.some((signal) => /intersex|herm|male flower/i.test(signal))) {
    warnings.push(
      "Intersex or instability signals should be recorded separately from ordinary stress response."
    );
    tags.push("stability-watch");
  }
  const stressResponseScore = Math.max(
    0,
    Math.min(10, 10 - damageScore + vigorScore / 5 - recoveryDays * 0.3)
  );
  const effectiveRecoveryDays =
    hoursToRecover == null ? recoveryDays : Math.max(recoveryDays, hoursToRecover / 24);
  const recoveryScore = Math.max(
    0,
    Math.min(10, 10 - effectiveRecoveryDays * 1.2 - damageScore * 0.35)
  );
  const stabilityScore = Math.max(
    0,
    Math.min(10, 10 - severity * 0.35 - (warnings.length ? 2 : 0))
  );
  const recoveryStatus =
    hoursToRecover == null
      ? recoveryDays <= 1
        ? "recovered"
        : recoveryDays <= 3
          ? "recovering"
          : "poor_recovery"
      : hoursToRecover <= 12
        ? "recovered"
        : hoursToRecover <= 48
          ? "recovering"
          : "poor_recovery";
  if (recoveryStatus === "poor_recovery") {
    tags.push("recovery_poor");
    warnings.push(
      "Recovery was slow. Treat this as stress response data, not useful steering."
    );
  } else if (recoveryStatus === "recovered" && damageScore <= 3) {
    tags.push("recovery_strong");
  }
  if (stressType.includes("dryback")) {
    tags.push(
      recoveryScore >= 7 && damageScore <= 3 ? "dryback_tolerant" : "dryback_sensitive"
    );
  }
  if (stressType.includes("light")) {
    tags.push(
      recoveryScore >= 7 && damageScore <= 3 ? "high_light_tolerant" : "light_sensitive"
    );
  }
  if (
    stressType.includes("ec") ||
    stressType.includes("feed") ||
    stressType.includes("nutrient")
  ) {
    tags.push(recoveryScore >= 7 && damageScore <= 3 ? "ec_tolerant" : "ec_sensitive");
  }
  if (stressType.includes("ph")) {
    tags.push("ph_sensitive");
  }
  if (/mold|rot/.test(notesText)) tags.push("mold_pressure_watch");
  if (/aroma drop|resin drop|quality drop/.test(notesText))
    tags.push("quality_loss_under_stress");
  const keeperImpact =
    riskLevel === "high"
      ? "negative_until_retested"
      : recoveryScore >= 7 && stabilityScore >= 7
        ? "supports_keeper_case"
        : "neutral_needs_more_data";
  const selectionSignals = {
    cropSteeringCandidate: recoveryScore >= 7 && stabilityScore >= 7 && damageScore <= 3,
    stressResistantKeeperCandidate:
      recoveryScore >= 7 && stabilityScore >= 7 && vigorScore >= 7,
    breedingWatch:
      stabilityScore >= 7 &&
      (tags.includes("dryback_tolerant") ||
        tags.includes("high_light_tolerant") ||
        tags.includes("ec_tolerant")),
    rejectOrRetest:
      riskLevel === "high" || stabilityScore < 5 || recoveryStatus === "poor_recovery"
  };

  return {
    stressType,
    stage: input.stage || null,
    riskLevel,
    stressResponseScore: Number(stressResponseScore.toFixed(2)),
    recoveryScore: Number(recoveryScore.toFixed(2)),
    damageScore,
    stabilityScore: Number(stabilityScore.toFixed(2)),
    vigorUnderStressScore: vigorScore,
    recoveryStatus,
    stressProfile: {
      severity,
      recoveryDays,
      hoursToRecover,
      damageScore,
      vigorScore,
      stabilitySignals
    },
    keeperImpact,
    selectionSignals,
    phenoImpact: selectionSignals.cropSteeringCandidate
      ? "improves_crop_steering_candidate"
      : selectionSignals.rejectOrRetest
        ? "retest_before_keeper_decision"
        : "neutral_needs_more_data",
    warnings,
    recommendations: [
      "Compare only against plants exposed to the same timing, medium, environment, and measurement method.",
      "Log photos and recovery notes before changing keeper or breeding decisions.",
      "Do not stack stressors unless the test protocol explicitly calls for it.",
      selectionSignals.cropSteeringCandidate
        ? "This plant may be a crop-steering candidate, but confirm across another event or run."
        : "Do not treat this stress event as a keeper advantage unless recovery and quality hold."
    ],
    taskSuggestion: {
      title: "Recheck stress recovery",
      dueInDays: riskLevel === "high" ? 1 : 2,
      priority: riskLevel === "high" ? "high" : "medium"
    },
    tasksToCreate: [
      {
        title: "Recheck stress recovery",
        dueInDays: riskLevel === "high" ? 1 : 2,
        priority: riskLevel === "high" ? "high" : "medium"
      },
      {
        title: "Photograph same plant after stress test",
        dueInDays: 1,
        priority: "medium"
      }
    ],
    tags: Array.from(new Set(tags))
  };
}

function calculateCloneRooting(input = {}) {
  const daysSinceCut = Math.max(0, number(input.daysSinceCut ?? 0, "Days since cut"));
  const humidity =
    input.humidity == null || input.humidity === ""
      ? null
      : number(input.humidity, "Humidity");
  const tempF =
    input.temperature == null || input.temperature === ""
      ? null
      : number(input.temperature, "Temperature");
  const rootZoneTemp =
    input.rootZoneTemp == null || input.rootZoneTemp === ""
      ? tempF
      : number(input.rootZoneTemp, "Root-zone temperature");
  const light =
    input.lightIntensity == null || input.lightIntensity === ""
      ? null
      : number(input.lightIntensity, "Light intensity");
  const cloneCount = Math.max(0, number(input.cloneCount ?? 0, "Clone count"));
  const rootedCount = Math.max(0, number(input.rootedCount ?? 0, "Rooted count"));
  const failedCount = Math.max(0, number(input.failedCount ?? 0, "Failed count"));
  const motherHealth = String(
    input.motherPlantHealth || input.motherHealth || "unknown"
  ).toLowerCase();
  const mediumStatus = String(
    input.mediumStatus || input.mediumMoisture || ""
  ).toLowerCase();
  const stemCondition = String(input.stemCondition || "").toLowerCase();
  const leafCondition = String(input.leafCondition || "").toLowerCase();
  const rootingStatus = String(input.rootingStatus || "").toLowerCase();
  const rootsVisible =
    /root/.test(rootingStatus) &&
    !/no |none|without|not visible|absent/.test(rootingStatus);
  const callusVisible = /callus/.test(rootingStatus);
  const likelyBottlenecks = [];
  const recommendations = [];
  const tags = [];
  const tasksToCreate = [];
  let riskLevel = "low";

  if (["stressed", "pest_concern", "nutrient_issue"].includes(motherHealth)) {
    likelyBottlenecks.push({
      issue: "Mother plant health may be limiting clone success",
      category: "mother_health",
      confidence: 0.7,
      evidence: [`Mother status: ${motherHealth}`],
      nextChecks: [
        "Review mother plant logs.",
        "Check pest/nutrient/root-zone issues.",
        "Compare against clones from healthier mothers."
      ],
      recommendations: [
        "Improve mother health before taking another batch.",
        "Record this in pheno/genetics notes."
      ]
    });
    tags.push("mother_health_issue");
  }
  if (humidity != null && humidity < 70) {
    likelyBottlenecks.push({
      issue: "Humidity may be too low for fresh clones",
      category: "environment",
      confidence: daysSinceCut <= 7 ? 0.75 : 0.6,
      evidence: [
        `RH ${humidity}%${daysSinceCut <= 7 ? " during early rooting window" : ""}`
      ],
      nextChecks: ["Check dome use.", "Check leaf wilt.", "Check venting schedule."],
      recommendations: [
        "Increase humidity or use a dome early.",
        "Vent gradually as clones stabilize."
      ]
    });
    recommendations.push(
      "Raise humidity or tighten dome management while watching for stagnant air."
    );
    tags.push("low_humidity");
    tasksToCreate.push({
      title: "Check clone humidity/dome",
      dueInHours: 6,
      priority: "medium"
    });
  }
  if (rootZoneTemp != null && rootZoneTemp < 70 && daysSinceCut >= 5) {
    likelyBottlenecks.push({
      issue: "Root zone may be too cool for fast rooting",
      category: "environment",
      confidence: 0.65,
      evidence: [`Root-zone temp ${rootZoneTemp}F`],
      nextChecks: [
        "Check tray temperature.",
        "Check room temperature swings.",
        "Compare rooting speed to warmer batches."
      ],
      recommendations: [
        "Keep clone media warm and stable.",
        "Avoid cold surfaces under clone trays."
      ]
    });
    tags.push("cold_root_zone");
  } else if (tempF != null && tempF > 82) {
    likelyBottlenecks.push({
      issue: "Clone area may be too warm",
      category: "environment",
      confidence: 0.55,
      evidence: [`Air temperature ${tempF}F`],
      nextChecks: ["Check dome temperature.", "Check leaf wilt and rot risk."],
      recommendations: [
        "Keep clone environment warm but stable; avoid hot stagnant domes."
      ]
    });
  }
  if (light != null && light > 250) {
    likelyBottlenecks.push({
      issue: "Light may be too strong for fresh clones",
      category: "light",
      confidence: daysSinceCut <= 7 ? 0.65 : 0.55,
      evidence: [`Light intensity ${light} PPFD`],
      nextChecks: [
        "Check leaf wilt or bleaching.",
        "Check distance from light.",
        "Compare to rooted clone tolerance."
      ],
      recommendations: [
        "Use gentler light until roots form.",
        "Increase light after rooting."
      ]
    });
    recommendations.push(
      "Reduce intensity until roots form and leaves regain normal turgor."
    );
    tags.push("light_stress");
  }
  if (
    /wet|soak|algae|mold|oxygen|standing/.test(mediumStatus) ||
    /mush|rot|black|slime/.test(stemCondition)
  ) {
    likelyBottlenecks.push({
      issue: "Medium may be too wet or oxygen-limited",
      category: "medium",
      confidence: 0.75,
      evidence: [
        /wet|soak|standing/.test(mediumStatus)
          ? "Medium too wet or standing water noted"
          : null,
        /algae|mold/.test(mediumStatus) ? "Algae/mold noted" : null,
        /mush|rot|black|slime/.test(stemCondition)
          ? "Stem rot/slime symptoms noted"
          : null
      ].filter(Boolean),
      nextChecks: [
        "Check plug saturation.",
        "Check standing water.",
        "Check airflow and cleanliness."
      ],
      recommendations: [
        "Keep medium moist, not soaked.",
        "Improve oxygen/drainage.",
        "Remove failed rotting cuts."
      ]
    });
    riskLevel = "high";
    tags.push("overwet_medium");
  }
  if (/dry|crispy/.test(mediumStatus) || /crispy/.test(leafCondition)) {
    likelyBottlenecks.push({
      issue: "Medium or air may be too dry",
      category: "medium",
      confidence: 0.7,
      evidence: [
        /dry/.test(mediumStatus) ? "Medium too dry" : null,
        /crispy/.test(leafCondition) ? "Crispy leaves" : null
      ].filter(Boolean),
      nextChecks: ["Check plug moisture.", "Check dome/RH.", "Check airflow."],
      recommendations: [
        "Rehydrate medium carefully.",
        "Avoid drying fresh cuttings before roots form."
      ]
    });
    tags.push("dry_medium");
  }
  if (/wilt|curl|yellow/.test(leafCondition)) {
    likelyBottlenecks.push({
      issue: "Leaf condition suggests transpiration or mother-plant stress",
      category: "plant_status",
      confidence: 0.55,
      evidence: [`Leaf condition: ${input.leafCondition}`],
      nextChecks: ["Check dome/RH.", "Check mother health.", "Check light intensity."],
      recommendations: ["Stabilize environment before changing multiple clone variables."]
    });
  }
  if (daysSinceCut >= 14 && !rootsVisible && !callusVisible) {
    likelyBottlenecks.push({
      issue: "Delayed rooting",
      category: "rooting_delay",
      confidence: 0.65,
      evidence: [`${daysSinceCut} days since cut with no roots/callus reported`],
      nextChecks: [
        "Check root-zone temperature.",
        "Check mother health.",
        "Check medium moisture.",
        "Compare this cultivar to other clone batches."
      ],
      recommendations: [
        "Mark as delayed rooting if repeated across batches.",
        "Create follow-up root check task."
      ]
    });
    riskLevel = riskLevel === "high" ? "high" : "medium";
    tags.push("delayed_rooting");
    tasksToCreate.push({
      title: "Recheck clone roots",
      dueInDays: 2,
      priority: "medium"
    });
  }
  if (!likelyBottlenecks.length) {
    recommendations.push(
      "Conditions look workable. Keep notes consistent and avoid changing too many variables at once."
    );
  }
  if (likelyBottlenecks.length >= 2 && riskLevel !== "high") riskLevel = "medium";
  const rootingProgress =
    rootsVisible || (cloneCount ? rootedCount / cloneCount >= 0.5 : rootedCount > 0)
      ? "rooted"
      : daysSinceCut <= 3
        ? "early"
        : daysSinceCut >= 14
          ? "delayed"
          : callusVisible
            ? "rooting_expected_soon"
            : "normal_wait";
  if (rootingProgress === "rooted") tags.push("rooted");
  if (cloneCount && rootedCount / cloneCount >= 0.8) tags.push("easy_to_clone");
  if (cloneCount && daysSinceCut >= 14 && rootedCount / cloneCount < 0.4)
    tags.push("hard_to_clone_watch");

  return {
    daysSinceCut,
    riskLevel,
    rootingProgress,
    likelyBottlenecks,
    nextChecks: [
      "Check dome humidity and leaf turgor.",
      "Inspect stem base for callus, rot, or drying.",
      "Compare mother-plant health and cut location against successful trays."
    ],
    recommendations,
    followUpTask: {
      title: "Check clone rooting tray",
      dueInDays: riskLevel === "high" ? 1 : 2,
      priority: riskLevel === "high" ? "high" : "medium"
    },
    tasksToCreate,
    clonePerformanceSummary: {
      cloneCount,
      rootedCount,
      failedCount,
      rootingPercent: cloneCount
        ? Number(((rootedCount / cloneCount) * 100).toFixed(2))
        : null,
      averageDaysToRoot: rootingProgress === "rooted" ? daysSinceCut : null,
      tags
    },
    tags,
    logSummary: likelyBottlenecks.length
      ? `Clone rooting bottlenecks: ${likelyBottlenecks.map((item) => item.issue).join("; ")}`
      : "Clone rooting conditions logged with no major bottlenecks."
  };
}

function calculateRunComparison(input = {}) {
  const runs = Array.isArray(input.runs) ? input.runs : [];
  if (runs.length < 2) throw new Error("At least two runs are required for comparison");
  const normalized = runs.map((run, index) => {
    const yieldAmount = Number(run.yieldAmount ?? run.yield ?? 0);
    const qualityScore = Number(run.qualityScore ?? 0);
    const issueCount = Number(run.issueCount ?? 0);
    const days = Number(run.days ?? run.totalDays ?? 0);
    const taskCompletionRate =
      run.taskCompletionRate == null ? null : Number(run.taskCompletionRate);
    const averageVpd = run.averageVpd == null ? null : Number(run.averageVpd);
    const averageDli = run.averageDli == null ? null : Number(run.averageDli);
    const dryDays = run.dryDays == null ? null : Number(run.dryDays);
    const score =
      yieldAmount * 0.4 +
      qualityScore * 8 -
      issueCount * 4 -
      Math.max(0, days - 120) * 0.2;
    return {
      id: String(run.id || run.growId || `run_${index + 1}`),
      name: String(run.name || run.cultivar || `Run ${index + 1}`),
      cultivar: run.cultivar || null,
      yieldAmount,
      qualityScore,
      issueCount,
      days,
      taskCompletionRate: Number.isFinite(taskCompletionRate) ? taskCompletionRate : null,
      averageVpd: Number.isFinite(averageVpd) ? averageVpd : null,
      averageDli: Number.isFinite(averageDli) ? averageDli : null,
      dryDays: Number.isFinite(dryDays) ? dryDays : null,
      score: Number(score.toFixed(2)),
      notes: String(run.notes || "")
    };
  });
  const ranked = [...normalized].sort((a, b) => b.score - a.score);
  const bestRun = ranked[0];
  const worstRun = ranked[ranked.length - 1];
  const differences = {
    yieldSpread: Number(
      (
        Math.max(...normalized.map((r) => r.yieldAmount)) -
        Math.min(...normalized.map((r) => r.yieldAmount))
      ).toFixed(2)
    ),
    qualitySpread: Number(
      (
        Math.max(...normalized.map((r) => r.qualityScore)) -
        Math.min(...normalized.map((r) => r.qualityScore))
      ).toFixed(2)
    ),
    issueSpread:
      Math.max(...normalized.map((r) => r.issueCount)) -
      Math.min(...normalized.map((r) => r.issueCount))
  };
  const missingData = [];
  const optionalFields = [
    ["taskCompletionRate", "task completion"],
    ["averageVpd", "environment/VPD"],
    ["averageDli", "light/DLI"],
    ["dryDays", "dry/cure timing"]
  ];
  optionalFields.forEach(([field, label]) => {
    const missingRuns = normalized
      .filter((run) => run[field] == null)
      .map((run) => run.name);
    if (missingRuns.length) {
      missingData.push({ field, label, missingRuns });
    }
  });
  const sameCultivar = normalized.every(
    (run) => run.cultivar && run.cultivar === normalized[0].cultivar
  );
  const keyDifferences = [
    {
      category: "yield",
      difference: `Yield spread is ${differences.yieldSpread}.`,
      likelyImpact:
        differences.yieldSpread > 0
          ? "Yield changed between selected runs."
          : "No yield spread entered.",
      confidence: "medium"
    },
    {
      category: "quality",
      difference: `Quality score spread is ${differences.qualitySpread}.`,
      likelyImpact:
        differences.qualitySpread > 0
          ? "Final product quality changed between runs."
          : "Quality scores are similar.",
      confidence: "medium"
    },
    {
      category: "issues",
      difference: `Issue count spread is ${differences.issueSpread}.`,
      likelyImpact:
        differences.issueSpread > 2
          ? "Issue pressure varied materially."
          : "Issue pressure was similar.",
      confidence: "medium"
    }
  ];
  const likelyDrivers = [];
  if (bestRun.yieldAmount > worstRun.yieldAmount) {
    likelyDrivers.push({
      driver: "Higher yield run",
      evidence: `${bestRun.name} yielded ${bestRun.yieldAmount} versus ${worstRun.yieldAmount}.`,
      possibleEffect:
        "May be associated with better environment, cultivar fit, veg timing, nutrition, or fewer issues.",
      confidence: "low_to_medium"
    });
  }
  if (bestRun.issueCount < worstRun.issueCount) {
    likelyDrivers.push({
      driver: "Lower issue pressure",
      evidence: `${bestRun.name} had ${bestRun.issueCount} issue(s) versus ${worstRun.issueCount}.`,
      possibleEffect: "Fewer problems may have supported yield or quality.",
      confidence: "medium"
    });
  }
  if (!sameCultivar) {
    likelyDrivers.push({
      driver: "Cultivar/pheno differences",
      evidence: "Runs do not all share the same cultivar field.",
      possibleEffect: "Genetic differences may explain some performance variation.",
      confidence: "medium"
    });
  }
  const structuredSummary = {
    growsCompared: normalized.map((run) => ({
      id: run.id,
      name: run.name,
      cultivar: run.cultivar
    })),
    summaryStats: {
      yieldDifference: differences.yieldSpread,
      qualityDifference: differences.qualitySpread,
      issueCountDifference: differences.issueSpread,
      confidence: missingData.length ? "limited_by_missing_data" : "medium"
    },
    keyDifferences,
    missingData,
    sameCultivar
  };
  return {
    comparedRuns: normalized,
    bestRun,
    worstRun,
    differences,
    structuredSummary,
    keyDifferences,
    likelyDrivers,
    improvements: [
      {
        area: "overall score",
        whatImproved: `${bestRun.name} ranks highest from entered yield, quality, issue, and timing data.`,
        evidence: `Score ${bestRun.score}`
      }
    ],
    regressions: [
      {
        area: "review run",
        whatGotWorse: `${worstRun.name} ranks lowest from entered summary data.`,
        evidence: `Score ${worstRun.score}`
      }
    ],
    missingData,
    patterns: [
      differences.issueSpread > 2
        ? "Issue pressure varied materially between runs."
        : "Issue pressure was similar across selected runs.",
      differences.yieldSpread > 0
        ? "Yield changed between runs; compare plant count, veg length, cultivar, environment, and feed history."
        : "Yield data did not show a spread."
    ],
    recommendationsForNextRun: [
      `Use ${bestRun.name} as the baseline notes package for the next run.`,
      "Compare logs, tool runs, diagnoses, environment, feed strength, dry/cure notes, and final quality before changing the plan."
    ],
    suggestedTasks: [
      {
        title: `Review ${bestRun.name} as next-run baseline`,
        dueInDays: 1,
        priority: "medium"
      },
      {
        title: "Fill missing run comparison data",
        dueInDays: 3,
        priority: missingData.length ? "high" : "medium"
      }
    ],
    uncertainty:
      "This comparison uses entered summary data. Full history comparison improves when yield, logs, tasks, diagnoses, tool runs, and dry/cure outcomes are linked."
  };
}

function calculateAutoGrowCalendar(input = {}) {
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  if (Number.isNaN(startDate.getTime()))
    throw new Error("Start date must be a valid date");
  const vegWeeks = Math.max(0, number(input.vegLengthWeeks ?? 4, "Veg length weeks"));
  const flowerDays = Math.max(
    1,
    number(input.expectedFlowerDays ?? input.flowerDays ?? 63, "Flower days")
  );
  const plantCount = Math.max(1, number(input.plantCount ?? 1, "Plant count"));
  const plants =
    Array.isArray(input.plants) && input.plants.length
      ? input.plants
      : Array.from({ length: plantCount }, (_, index) => ({
          plantId: `plant_${index + 1}`,
          cultivar: input.cultivar || `Plant ${index + 1}`,
          expectedFlowerDaysMin: flowerDays,
          expectedFlowerDaysMax: flowerDays
        }));
  const iso = (offsetDays) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const flipOffset = Math.round(vegWeeks * 7);
  const plantSpecificHarvestWindows = plants.map((plant, index) => {
    const minDays = Math.max(
      1,
      number(
        plant.expectedFlowerDaysMin ?? plant.expectedFlowerDays ?? flowerDays,
        "Expected flower days min"
      )
    );
    const maxDays = Math.max(
      minDays,
      number(
        plant.expectedFlowerDaysMax ?? plant.expectedFlowerDays ?? flowerDays,
        "Expected flower days max"
      )
    );
    return {
      plantId: plant.plantId || plant.id || `plant_${index + 1}`,
      cultivar: plant.cultivar || plant.name || `Plant ${index + 1}`,
      breederFlowerTimeText: plant.breederFlowerTimeText || null,
      start: iso(flipOffset + Math.max(1, minDays - 7)),
      end: iso(flipOffset + maxDays + 7),
      flowerDaysMin: minDays,
      flowerDaysMax: maxDays,
      confidence: "planning"
    };
  });
  const harvestStartOffset = Math.min(
    ...plantSpecificHarvestWindows.map((window) => {
      const d = new Date(window.start);
      return Math.round((d.getTime() - startDate.getTime()) / 86400000);
    })
  );
  const harvestEndOffset = Math.max(
    ...plantSpecificHarvestWindows.map((window) => {
      const d = new Date(window.end);
      return Math.round((d.getTime() - startDate.getTime()) / 86400000);
    })
  );
  const taskSchedule = [
    { title: "Confirm grow setup", dueDate: iso(0), stage: "start" },
    { title: "Seedling/clone check", dueDate: iso(3), stage: "start" },
    {
      title: "Veg health check",
      dueDate: iso(Math.max(3, Math.round(flipOffset / 2))),
      stage: "veg"
    },
    {
      title: "Training/topping window",
      dueDate: iso(Math.max(7, flipOffset - 14)),
      stage: "veg"
    },
    {
      title: "Pre-flip review",
      dueDate: iso(Math.max(1, flipOffset - 3)),
      stage: "transition"
    },
    { title: "Flip to flower", dueDate: iso(flipOffset), stage: "flower" },
    { title: "Flower day 1", dueDate: iso(flipOffset + 1), stage: "flower" },
    { title: "Stretch check", dueDate: iso(flipOffset + 14), stage: "early_flower" },
    {
      title: "Mid-flower inspection",
      dueDate: iso(flipOffset + Math.round(flowerDays / 2)),
      stage: "flower"
    },
    { title: "IPM inspection", dueDate: iso(flipOffset + 28), stage: "flower" },
    {
      title: "Harvest readiness check",
      dueDate: iso(harvestStartOffset),
      stage: "harvest"
    },
    {
      title: "Dry room setup",
      dueDate: iso(Math.max(0, harvestStartOffset - 3)),
      stage: "harvest"
    },
    {
      title: "Cure start planning",
      dueDate: iso(harvestEndOffset + 7),
      stage: "dry_cure"
    }
  ];
  return {
    plantCount,
    stageTimeline: {
      startDate: iso(0),
      flipDate: iso(flipOffset),
      expectedHarvestStart: iso(harvestStartOffset),
      expectedHarvestEnd: iso(harvestEndOffset)
    },
    calendarEvents: taskSchedule.map((task) => ({
      type: "GROW_TASK",
      title: task.title,
      start: task.dueDate,
      stage: task.stage
    })),
    taskSchedule,
    expectedHarvestWindows: [
      {
        start: iso(harvestStartOffset),
        end: iso(harvestEndOffset),
        confidence: "planning"
      }
    ],
    plantSpecificHarvestWindows,
    reminders: [
      "Calendar dates are planning anchors, not guarantees.",
      "Veg length is planned, not guaranteed. Larger plants, stress, training, or room constraints can change timing.",
      "Flower time is a range. Breeder timing is a reference, not a command.",
      "Update the schedule when plants change stage, show stress, or cultivar timing differs from expectation."
    ]
  };
}

function calculateTissueCulture(input = {}) {
  const vessels = Math.max(0, number(input.vessels ?? 0, "Vessels"));
  const contaminated = Math.max(
    0,
    number(input.contaminatedVessels ?? 0, "Contaminated vessels")
  );
  const rooted = Math.max(0, number(input.rootedVessels ?? 0, "Rooted vessels"));
  const acclimated = Math.max(
    0,
    number(input.acclimatedPlants ?? 0, "Acclimated plants")
  );
  const transfersDueDays = Math.max(
    0,
    number(input.transfersDueDays ?? 14, "Transfers due days")
  );
  const stage = String(input.stage || input.tcStage || "initiation").toLowerCase();
  const symptomsText = String(
    input.symptoms || input.diagnosisNotes || input.notes || ""
  ).toLowerCase();
  const browningVessels = Math.max(
    0,
    number(input.browningVessels ?? 0, "Browning vessels")
  );
  const stalledVessels = Math.max(
    0,
    number(input.stalledVessels ?? 0, "Stalled vessels")
  );
  const totalExplantsStarted = Math.max(
    vessels,
    number(input.totalExplantsStarted ?? vessels, "Total explants started")
  );
  const mediaCost = Math.max(0, number(input.mediaCost ?? 0, "Media cost"));
  const vesselSupplyCost = Math.max(
    0,
    number(input.vesselSupplyCost ?? input.vesselCost ?? 0, "Vessel supply cost")
  );
  const laborCost = Math.max(0, number(input.laborCost ?? 0, "Labor cost"));
  const totalProjectCost = mediaCost + vesselSupplyCost + laborCost;
  const contaminationRate = vessels ? contaminated / vessels : 0;
  const rootingRate = vessels ? rooted / vessels : 0;
  const acclimationRate = rooted ? acclimated / rooted : 0;
  const fungusVessels = Math.max(
    0,
    number(input.fungusVessels ?? input.fungalVessels ?? 0, "Fungus vessels")
  );
  const fungusRate = vessels ? fungusVessels / vessels : 0;
  const transferCycle = Math.max(
    0,
    number(input.transferCycle ?? input.transferCount ?? 0, "Transfer cycle")
  );
  const maxProductionTransfers = Math.max(
    1,
    number(input.maxProductionTransfers ?? 12, "Max production transfers")
  );
  const productionPhase = String(
    input.productionPhase || input.tcProductionPhase || "production"
  ).toLowerCase();
  const explantSize = String(input.explantSize || "standard").toLowerCase();
  const technicianOwner = String(input.technicianOwner || input.assignedTech || "");
  const motherBlockStartDate = input.motherBlockStartDate || input.initiationDate || null;
  const productionEndDate = input.productionEndDate || input.endDate || null;
  const mediaType = String(input.mediaType || input.mediaRecipe || "");
  const vesselType = String(input.vesselType || "glass jar");
  const warnings = [];
  const likelyFailureModes = [];
  const diagnosisTags = [];
  const explantType = String(input.explantType || input.explant || "node").toLowerCase();
  const cropType = String(input.cropType || "cannabis").toLowerCase();
  const cannabisPreset =
    cropType === "cannabis"
      ? {
          explantType,
          suggestedStartingPoints:
            explantType === "shoot_tip"
              ? [
                  "Use actively growing shoot tips from clean, pest-free stock.",
                  "Start with conservative sterilization timing and adjust by cultivar response.",
                  "Track browning, vitrification, and clean shoot recovery separately."
                ]
              : [
                  "Use node sections from clean, pest-free stock with visible meristem tissue.",
                  "Track sterilization timing, rinse count, media lot, and vessel ID for each batch.",
                  "Compare response by cultivar before changing hormone balance across all batches."
                ],
          warning:
            "Cannabis TC response varies by cultivar, explant condition, sterilization timing, media balance, and hormone level."
        }
      : null;
  if (contaminationRate > 0.15)
    warnings.push(
      "Contamination rate is elevated. Review sterilization, explant prep, media handling, and vessel sealing notes."
    );
  if (fungusRate > 0.045)
    warnings.push(
      "Fungus pressure is above the production danger band. Isolate affected vessels and review room/tool hygiene immediately."
    );
  else if (fungusRate > 0.02)
    warnings.push(
      "Fungus pressure is above a strong commercial target. Increase technician shelf walks and remove suspect vessels early."
    );
  if (contaminationRate > 0.1)
    warnings.push(
      "Overall contamination is above the commercial target band. Audit transfer technique, media lots, vessel handling, and room workflow."
    );
  if (transferCycle >= maxProductionTransfers)
    warnings.push(
      "This production line has reached the transfer-cycle limit. Refresh from mother block or retire the line before more multiplication."
    );
  else if (transferCycle >= Math.max(1, maxProductionTransfers - 2))
    warnings.push(
      "This production line is nearing its transfer-cycle limit. Plan a mother-block refresh before the next production turn."
    );
  if (
    productionPhase.includes("establishment") ||
    productionPhase.includes("acclimating")
  ) {
    warnings.push(
      "Establishment/acclimating cultures should be handled gently; early stress can carry into later production turns."
    );
  }
  if (vessels && rootingRate < 0.4)
    warnings.push(
      "Rooting rate is low for this batch. Compare media recipe, transfer timing, genetics, and vessel conditions."
    );
  if (contaminated || /fuzzy|mold|slime|cloudy|yeast|contam/.test(symptomsText)) {
    likelyFailureModes.push({
      issue: "Likely contamination",
      category: "sterility",
      confidence: contaminationRate > 0.15 ? 0.8 : 0.65,
      evidence: [
        contaminated ? `${contaminated} contaminated vessel(s)` : null,
        /fuzzy|mold/.test(symptomsText) ? "Fuzzy/mold symptoms noted" : null,
        /slime|cloudy|yeast/.test(symptomsText)
          ? "Bacterial/cloudy/yeast-like symptoms noted"
          : null,
        fungusVessels ? `${fungusVessels} fungus vessel(s)` : null,
        fungusRate > 0.045 ? "Fungus rate is above the rapid-spread danger band" : null
      ].filter(Boolean),
      counterEvidence: [
        contaminated && contaminated < vessels
          ? `${Math.max(0, vessels - contaminated)} vessel(s) are not marked contaminated`
          : null,
        !/fuzzy|mold|slime|cloudy|yeast|contam/.test(symptomsText)
          ? "No contamination symptom keywords were entered"
          : null
      ].filter(Boolean),
      nextChecks: [
        "Check whether contamination is isolated to one vessel or spread across the batch.",
        "Check how soon contamination appeared after transfer.",
        "Review explant cleaning, rinse count, tools, media sterilization, and vessel handling."
      ],
      taskSuggestions: [
        {
          title: "Isolate or cull contaminated TC vessels",
          dueInDays: 0,
          priority: "high"
        },
        {
          title: "Audit TC sterilization and media handling notes",
          dueInDays: 1,
          priority: "high"
        }
      ]
    });
    diagnosisTags.push("contamination", "sterility");
  }
  if (/endo|internal|vascular/.test(symptomsText)) {
    likelyFailureModes.push({
      issue: "Possible endophytic contamination",
      category: "source_material",
      confidence: 0.65,
      evidence: ["Internal/endophytic/vascular contamination notes entered"],
      counterEvidence: [
        "Confirm whether smaller explants or shoot tips from clean stock reduce recurrence."
      ],
      nextChecks: [
        "Compare larger nodal pieces against smaller shoot tips.",
        "Track whether contamination appears after apparently clean initiation.",
        "Escalate cleaning methods only after cutting smaller fails."
      ],
      taskSuggestions: [
        {
          title: "Compare TC explant size against contamination pattern",
          dueInDays: 1,
          priority: "high"
        }
      ]
    });
    diagnosisTags.push("endophytic_contamination", "source_material");
  }
  if (browningVessels || /brown|black|oxid/.test(symptomsText)) {
    likelyFailureModes.push({
      issue: "Possible browning or oxidation",
      category: "oxidation",
      confidence: browningVessels ? 0.7 : 0.6,
      evidence: [
        browningVessels ? `${browningVessels} browning vessel(s)` : null,
        /brown|black|oxid/.test(symptomsText)
          ? "Browning/blackening symptoms noted"
          : null
      ].filter(Boolean),
      counterEvidence: [
        browningVessels && browningVessels < vessels
          ? `${Math.max(0, vessels - browningVessels)} vessel(s) are not marked browning`
          : null,
        !/brown|black|oxid/.test(symptomsText)
          ? "No browning symptom keywords were entered"
          : null
      ].filter(Boolean),
      nextChecks: [
        "Check whether browning appeared immediately after sterilization.",
        "Review bleach/alcohol exposure time, media pH, and cultivar sensitivity.",
        "Consider charcoal or antioxidant strategy in the next trial if appropriate."
      ],
      taskSuggestions: [
        {
          title: "Review TC browning and oxidation pattern",
          dueInDays: 1,
          priority: "medium"
        },
        {
          title: "Compare antioxidant or charcoal notes before next TC batch",
          dueInDays: 7,
          priority: "medium"
        }
      ]
    });
    diagnosisTags.push("browning", "oxidation");
  }
  if (stalledVessels || /stall|no growth|slow/.test(symptomsText)) {
    likelyFailureModes.push({
      issue: "Possible stalled initiation or slow growth response",
      category: "growth_response",
      confidence: stalledVessels ? 0.65 : 0.55,
      evidence: [
        stalledVessels ? `${stalledVessels} stalled vessel(s)` : null,
        /stall|no growth|slow/.test(symptomsText)
          ? "Stalled/no-growth notes entered"
          : null
      ].filter(Boolean),
      counterEvidence: [
        rooted ? `${rooted} vessel(s) have rooted` : null,
        !/stall|no growth|slow/.test(symptomsText)
          ? "No stalled-growth symptom keywords were entered"
          : null
      ].filter(Boolean),
      nextChecks: [
        "Check days since transfer.",
        "Compare against vessels from the same batch.",
        "Review media strength, hormone balance, temperature, light, and explant maturity."
      ],
      taskSuggestions: [
        {
          title: "Compare stalled TC vessels against clean active vessels",
          dueInDays: 2,
          priority: "medium"
        },
        {
          title: "Review TC media strength and hormone notes",
          dueInDays: 3,
          priority: "medium"
        }
      ]
    });
    diagnosisTags.push("stalled_growth");
  }
  if (/callus/.test(symptomsText)) {
    likelyFailureModes.push({
      issue: "Possible hormone balance issue",
      category: "media_balance",
      confidence: 0.65,
      evidence: ["Callus instead of clean shoot growth noted"],
      counterEvidence: rooted
        ? [`${rooted} vessel(s) have rooted despite callus notes`]
        : [],
      nextChecks: [
        "Review cytokinin level.",
        "Review auxin/cytokinin balance.",
        "Compare against previous media recipes."
      ],
      taskSuggestions: [
        {
          title: "Review TC hormone balance before next transfer",
          dueInDays: 2,
          priority: "medium"
        }
      ]
    });
    diagnosisTags.push("callus", "media_balance");
  }
  if (/vitrification|watery|glassy|translucent/.test(symptomsText)) {
    likelyFailureModes.push({
      issue: "Possible vitrification",
      category: "media_environment",
      confidence: 0.7,
      evidence: ["Watery, glassy, or translucent growth noted"],
      counterEvidence: [
        "Confirm whether symptoms are limited to one media lot or vessel style."
      ],
      nextChecks: [
        "Review agar strength.",
        "Review vessel venting/gas exchange.",
        "Review hormone strength and humidity."
      ],
      taskSuggestions: [
        {
          title: "Check TC agar strength and vessel venting notes",
          dueInDays: 1,
          priority: "medium"
        }
      ]
    });
    diagnosisTags.push("vitrification");
  }
  if (
    /acclimation|wilt after transfer|dome/.test(symptomsText) ||
    (rooted && acclimated / rooted < 0.5)
  ) {
    likelyFailureModes.push({
      issue: "Possible acclimation failure",
      category: "hardening_off",
      confidence: rooted && acclimated / rooted < 0.5 ? 0.7 : 0.6,
      evidence: [
        rooted && acclimated / rooted < 0.5
          ? "Low acclimation survival from rooted vessels"
          : null,
        /acclimation|wilt after transfer|dome/.test(symptomsText)
          ? "Acclimation/dome/wilt notes entered"
          : null
      ].filter(Boolean),
      counterEvidence: [
        acclimated ? `${acclimated} plant(s) acclimated successfully` : null,
        !/acclimation|wilt after transfer|dome/.test(symptomsText)
          ? "No acclimation symptom keywords were entered"
          : null
      ].filter(Boolean),
      nextChecks: [
        "Confirm agar was rinsed from roots.",
        "Review humidity dome schedule.",
        "Check light level and medium moisture after transfer."
      ],
      taskSuggestions: [
        {
          title: "Review TC acclimation dome and vent schedule",
          dueInDays: 1,
          priority: "medium"
        },
        {
          title: "Count surviving acclimated TC plants",
          dueInDays: 3,
          priority: "medium"
        }
      ]
    });
    diagnosisTags.push("acclimation_failure");
  }
  const stageCalendar = [];
  if (stage.includes("initiation")) {
    stageCalendar.push(
      { title: "Check for early contamination", dueInDays: 3, priority: "medium" },
      { title: "Check for browning/oxidation", dueInDays: 7, priority: "medium" },
      { title: "Evaluate shoot growth", dueInDays: 21, priority: "medium" }
    );
  } else if (stage.includes("multiplication")) {
    stageCalendar.push(
      { title: "Evaluate shoots for transfer", dueInDays: 28, priority: "medium" },
      { title: "Subculture if ready", dueInDays: 42, priority: "medium" }
    );
  } else if (stage.includes("rooting")) {
    stageCalendar.push(
      { title: "Check root formation", dueInDays: 14, priority: "medium" },
      { title: "Prepare acclimation setup", dueInDays: 21, priority: "medium" }
    );
  } else if (stage.includes("acclimation")) {
    stageCalendar.push(
      { title: "Vent humidity dome briefly", dueInDays: 3, priority: "medium" },
      { title: "Increase venting", dueInDays: 7, priority: "medium" },
      { title: "Remove dome if stable", dueInDays: 14, priority: "medium" }
    );
  } else if (stage.includes("storage")) {
    stageCalendar.push(
      { title: "Check stored cultures", dueInDays: 30, priority: "medium" },
      { title: "Refresh storage culture if needed", dueInDays: 180, priority: "medium" }
    );
  }
  if (warnings.length) {
    stageCalendar.unshift({
      title: "Review TC batch issue notes",
      dueInDays: 0,
      priority: "high"
    });
  }
  if (productionPhase.includes("mother")) {
    stageCalendar.push({
      title: "Harvest apical material for production refresh",
      dueInDays: 28,
      priority: "medium",
      sourceStage: "mother_block_refresh"
    });
  }
  if (transferCycle >= Math.max(1, maxProductionTransfers - 2)) {
    stageCalendar.unshift({
      title: "Refresh production line from mother block",
      dueInDays: 0,
      priority: "high",
      sourceStage: "transfer_cycle_limit"
    });
  }
  if (productionPhase.includes("acclimation") || stage.includes("acclimation")) {
    stageCalendar.push({
      title: "Grade small/medium/large TC plants after acclimation",
      dueInDays: 14,
      priority: "medium",
      sourceStage: "acclimation_grading"
    });
  }
  const targetBands = {
    fungusTargetPercent: 2,
    fungusDangerPercent: 4.5,
    overallTargetPercent: 10,
    commercialReference:
      "Production notes from a large TC facility: keep fungus near or below 2%, treat about 4.5% as a rapid-spread danger band, and keep overall contamination under 10%."
  };
  const productionControls = {
    productionPhase,
    transferCycle,
    maxProductionTransfers,
    transfersRemaining: Math.max(0, maxProductionTransfers - transferCycle),
    motherBlockStartDate,
    productionEndDate,
    technicianOwner,
    mediaType,
    vesselType,
    explantType,
    explantSize,
    explantSizeTradeoff:
      "Larger explants usually grow faster but carry more contamination risk; smaller explants establish slower but can reduce internal/vascular contamination pressure.",
    multiplicationStrategy:
      "Prefer direct shoot multiplication and track transfer cycles; refresh production material from mother block before long chains of laterals accumulate."
  };
  const acclimationGuidance = {
    inVitroRootingStrategy:
      "Many commercial TC workflows prioritize shoot multiplication in vitro and handle rooting/acclimation as a separate production phase.",
    greenhouseTransition:
      "Remove media from plantlets before greenhouse transfer, maintain humidity so plants do not dry out, then gradually train photosynthesis, roots, and cuticle development.",
    grading:
      "Grade plantlets by size before acclimation/ship scheduling so small, medium, and large lots can be handled consistently."
  };
  return {
    projectName: input.projectName || "Tissue culture project",
    batchNumber: input.batchNumber || null,
    cropType,
    purpose: input.purpose || "preservation",
    stage,
    productionPhase,
    explantPreset: cannabisPreset,
    projectStatus:
      contaminationRate > 0.35 ||
      fungusRate > 0.045 ||
      transferCycle >= maxProductionTransfers
        ? "at_risk"
        : warnings.length
          ? "needs_attention"
          : "active",
    targetBands,
    productionControls,
    acclimationGuidance,
    batchSummary: {
      vessels,
      contaminatedVessels: contaminated,
      fungusVessels,
      rootedVessels: rooted,
      acclimatedPlants: acclimated,
      browningVessels,
      stalledVessels,
      mediaRecipe: input.mediaRecipe || "",
      sopVersion: input.SOPVersion || input.sopVersion || ""
    },
    vesselStatus: {
      cleanVessels: Math.max(
        0,
        vessels - contaminated - browningVessels - stalledVessels
      ),
      contaminatedVessels: contaminated,
      fungusVessels,
      browningVessels,
      stalledVessels,
      rootedVessels: rooted,
      acclimatedPlants: acclimated
    },
    contaminationRate: Number((contaminationRate * 100).toFixed(2)),
    fungusRate: Number((fungusRate * 100).toFixed(2)),
    rootingRate: Number((rootingRate * 100).toFixed(2)),
    acclimationRate: Number((acclimationRate * 100).toFixed(2)),
    successMetrics: {
      totalExplantsStarted,
      cleanExplants: Math.max(0, vessels - contaminated),
      contaminatedExplants: contaminated,
      fungusExplants: fungusVessels,
      oxidizedExplants: browningVessels,
      stalledExplants: stalledVessels,
      rootedShoots: rooted,
      acclimatedPlants: acclimated,
      contaminationRate: Number((contaminationRate * 100).toFixed(2)),
      fungusRate: Number((fungusRate * 100).toFixed(2)),
      rootingRate: Number((rootingRate * 100).toFixed(2)),
      acclimationRate: Number((acclimationRate * 100).toFixed(2))
    },
    costTracking: {
      mediaCost: Number(mediaCost.toFixed(2)),
      vesselSupplyCost: Number(vesselSupplyCost.toFixed(2)),
      laborCost: Number(laborCost.toFixed(2)),
      totalProjectCost: Number(totalProjectCost.toFixed(2)),
      costPerVessel: vessels ? Number((totalProjectCost / vessels).toFixed(2)) : null,
      costPerCleanVessel:
        vessels - contaminated > 0
          ? Number((totalProjectCost / (vessels - contaminated)).toFixed(2))
          : null,
      costPerAcclimatedPlant: acclimated
        ? Number((totalProjectCost / acclimated).toFixed(2))
        : null
    },
    diagnosisRecord: {
      likelyFailureModes,
      taskSuggestions: likelyFailureModes.flatMap((mode) => mode.taskSuggestions || []),
      tags: Array.from(new Set(diagnosisTags)),
      disclaimer:
        "Tissue culture diagnosis is pattern-based. Compare vessels and batches before changing the entire protocol."
    },
    nextTransferTasks: [
      {
        title: "Review TC vessels for transfer",
        dueInDays: transfersDueDays,
        priority: warnings.length ? "high" : "medium"
      }
    ],
    generatedCalendar: stageCalendar,
    storageReminders: [
      "Record vessel IDs, media lot, transfer date, contamination disposition, and acclimation outcome.",
      "For storage cultures, track storage temperature, light condition, last check date, next check date, and refresh due date."
    ],
    complianceRecord: {
      batchNumber: input.batchNumber || null,
      geneticsId: input.geneticsId || null,
      SOPVersion: input.SOPVersion || input.sopVersion || null,
      mediaRecipe: input.mediaRecipe || null,
      mediaType,
      vesselType,
      mediaCost,
      vesselSupplyCost,
      laborCost,
      stage,
      productionPhase,
      transferCycle,
      maxProductionTransfers,
      motherBlockStartDate,
      productionEndDate,
      technicianOwner: technicianOwner || null,
      vesselCount: vessels
    },
    warnings,
    recommendations: [
      "Keep TC notes as records, not guarantees. Confirm SOPs, media recipes, and contamination decisions with trained lab process.",
      "Create follow-up tasks for transfer, contamination review, rooting check, and acclimation.",
      "Do not treat one failed vessel as proof the cultivar or entire method failed; compare the whole batch pattern."
    ]
  };
}

function calculateLivingSoilBatch(input = {}) {
  const batchVolume = Math.max(0, number(input.batchVolume ?? 0, "Batch volume"));
  const bagSize = Math.max(0.01, number(input.bagSize ?? 1, "Bag size"));
  const ingredientCosts = Array.isArray(input.ingredientCosts)
    ? input.ingredientCosts
    : [];
  const explicitIngredients = Array.isArray(input.ingredients) ? input.ingredients : [];
  const ingredients = explicitIngredients.length ? explicitIngredients : ingredientCosts;
  const laborCost = Math.max(0, number(input.laborCost ?? 0, "Labor cost"));
  const packagingCost = Math.max(0, number(input.packagingCost ?? 0, "Packaging cost"));
  const shrinkagePercent = Math.max(
    0,
    number(input.shrinkagePercent ?? 0, "Shrinkage percent")
  );
  const ingredientTotal = ingredients.reduce((sum, row) => {
    return sum + Math.max(0, Number(row.cost ?? row.totalCost ?? 0));
  }, 0);
  const usableVolume = batchVolume * (1 - shrinkagePercent / 100);
  const bagCount = Math.floor(usableVolume / bagSize);
  const totalBatchCost = ingredientTotal + laborCost + packagingCost;
  const costPerBag = bagCount ? totalBatchCost / bagCount : 0;
  const marginPercent = Math.max(
    0,
    number(input.targetMarginPercent ?? 40, "Target margin percent")
  );
  const retailPriceSuggestion = costPerBag
    ? costPerBag / (1 - Math.min(90, marginPercent) / 100)
    : 0;
  const normalizedIngredients = ingredients.map((row, index) => {
    const amount = Number(row.quantity ?? row.amount ?? 0);
    const releaseClass = releaseBucket(row);
    const sourceConfidence = sourceConfidenceFor(row);
    return {
      name: String(row.name || `Ingredient ${index + 1}`),
      amount: Number.isFinite(amount) ? amount : 0,
      unit: String(row.unit || row.amountUnit || ""),
      cost: Number(row.cost ?? row.totalCost ?? 0),
      labelN: Number(row.N ?? row.labelN ?? row.labelNPK?.N ?? 0),
      labelP2O5: Number(row.P2O5 ?? row.P ?? row.labelP2O5 ?? row.labelNPK?.P2O5 ?? 0),
      labelK2O: Number(row.K2O ?? row.K ?? row.labelK2O ?? row.labelNPK?.K2O ?? 0),
      Ca: Number(row.Ca ?? row.elemental?.Ca ?? 0),
      Mg: Number(row.Mg ?? row.elemental?.Mg ?? 0),
      S: Number(row.S ?? row.elemental?.S ?? 0),
      releaseClass,
      sourceConfidence,
      category: String(row.category || "")
    };
  });
  const ingredientPullSheet = normalizedIngredients.map((row) => ({
    name: String(row.name || "Ingredient"),
    quantity: Number(row.amount ?? 0),
    unit: String(row.unit || ""),
    cost: Number(row.cost ?? row.totalCost ?? 0),
    releaseClass: row.releaseClass,
    sourceConfidence: row.sourceConfidence
  }));
  const amountTotal = normalizedIngredients.reduce(
    (sum, row) => sum + Math.max(0, row.amount),
    0
  );
  const weightedPercent = (key) => {
    const denominator = amountTotal || normalizedIngredients.length || 1;
    return (
      normalizedIngredients.reduce((sum, row) => {
        const weight = amountTotal ? Math.max(0, row.amount) : 1;
        return sum + weight * Number(row[key] || 0);
      }, 0) / denominator
    );
  };
  const guaranteedAnalysisEstimate = {
    N: Number(weightedPercent("labelN").toFixed(2)),
    P2O5: Number(weightedPercent("labelP2O5").toFixed(2)),
    K2O: Number(weightedPercent("labelK2O").toFixed(2))
  };
  const elementalEstimate = {
    N: guaranteedAnalysisEstimate.N,
    P: Number((guaranteedAnalysisEstimate.P2O5 * 0.44).toFixed(2)),
    K: Number((guaranteedAnalysisEstimate.K2O * 0.83).toFixed(2)),
    Ca: Number(weightedPercent("Ca").toFixed(2)),
    Mg: Number(weightedPercent("Mg").toFixed(2)),
    S: Number(weightedPercent("S").toFixed(2))
  };
  const releaseTimeline = normalizedIngredients.reduce(
    (acc, row) => {
      const key = row.releaseClass || "unknown";
      acc[key] = acc[key] || [];
      acc[key].push({
        name: row.name,
        amount: row.amount,
        unit: row.unit,
        role:
          key === "immediate" || key === "fast"
            ? "near-term support"
            : key === "slow" || key === "very_slow"
              ? "long-term soil building"
              : "timing uncertain"
      });
      return acc;
    },
    { immediate: [], fast: [], medium: [], slow: [], very_slow: [], unknown: [] }
  );
  const stage = String(input.stage || input.purpose || "").toLowerCase();
  const purpose = String(input.purpose || input.intendedUse || "production_batch");
  const warnings = [];
  if (bagCount <= 0)
    warnings.push("Batch volume and bag size do not produce any sellable bags.");
  if (
    /seedling|clone/.test(stage) &&
    (guaranteedAnalysisEstimate.N > 2 ||
      releaseTimeline.immediate.length ||
      releaseTimeline.fast.length)
  ) {
    warnings.push(
      "This batch may be too hot for seedlings or fresh clones. Reduce fast-release fertility or use a gentler starter mix."
    );
  }
  if (
    /late|finish|ripen/.test(stage) &&
    (releaseTimeline.slow.length || releaseTimeline.very_slow.length)
  ) {
    warnings.push(
      "Slow amendments may release too late for the current stage and may be better for the next cycle."
    );
  }
  if (
    normalizedIngredients.some((row) =>
      /compost|casting|vermicompost/i.test(`${row.name} ${row.category}`)
    )
  ) {
    warnings.push(
      "Compost/castings nutrient contribution is estimated and should not be treated as exact guaranteed analysis."
    );
  }
  if (normalizedIngredients.some((row) => row.sourceConfidence === "low")) {
    warnings.push("One or more ingredient values have low source confidence.");
  }
  if (
    guaranteedAnalysisEstimate.K2O > guaranteedAnalysisEstimate.N * 2 &&
    guaranteedAnalysisEstimate.K2O > 1
  ) {
    warnings.push("High potassium may compete with calcium/magnesium uptake.");
  }
  if (
    guaranteedAnalysisEstimate.P2O5 > guaranteedAnalysisEstimate.N * 1.8 &&
    guaranteedAnalysisEstimate.P2O5 > 1
  ) {
    warnings.push("High phosphorus may affect micronutrient balance.");
  }
  if (normalizedIngredients.some((row) => /lime|oyster/i.test(row.name))) {
    warnings.push(
      "Lime/oyster shell are slow buffering inputs, not fast calcium rescue."
    );
  }
  if (normalizedIngredients.some((row) => /gypsum/i.test(row.name))) {
    warnings.push("Gypsum supplies calcium/sulfur support but is not pH down.");
  }
  const purposeFit = warnings.length
    ? "review_before_use"
    : "fits_entered_purpose_with_current_data";
  const costEstimate = {
    ingredientCost: Number(ingredientTotal.toFixed(2)),
    laborCost: Number(laborCost.toFixed(2)),
    packagingCost: Number(packagingCost.toFixed(2)),
    totalCost: Number(totalBatchCost.toFixed(2)),
    costPerBatch: Number(totalBatchCost.toFixed(2)),
    costPerBag: Number(costPerBag.toFixed(2)),
    costPerGallon: batchVolume ? Number((totalBatchCost / batchVolume).toFixed(2)) : null,
    costPerCubicFoot: batchVolume
      ? Number((totalBatchCost / (batchVolume / 7.48052)).toFixed(2))
      : null
  };
  return {
    recipeId: input.recipeId || null,
    batchName: input.batchName || input.recipeId || "Soil & nutrient batch",
    purpose,
    stage: input.stage || null,
    purposeFit,
    batchSummary: `${purpose} batch: ${usableVolume.toFixed(2)} usable volume from ${batchVolume} total.`,
    batchVolume,
    bagSize,
    usableVolume: Number(usableVolume.toFixed(2)),
    bagCount,
    totalBatchCost: Number(totalBatchCost.toFixed(2)),
    costPerBag: Number(costPerBag.toFixed(2)),
    retailPriceSuggestion: Number(retailPriceSuggestion.toFixed(2)),
    marginEstimate: {
      targetMarginPercent: marginPercent,
      grossMarginPerBag: Number((retailPriceSuggestion - costPerBag).toFixed(2))
    },
    costEstimate,
    ingredientPullSheet,
    guaranteedAnalysisEstimate,
    elementalEstimate,
    releaseTimeline,
    compatibilityWarnings: warnings.filter((warning) =>
      /potassium|phosphorus|calcium|pH/i.test(warning)
    ),
    stageTimingWarnings: warnings.filter((warning) =>
      /seedling|clone|stage|late|slow/i.test(warning)
    ),
    sourceConfidenceWarnings: warnings.filter((warning) =>
      /source confidence|Compost|castings/i.test(warning)
    ),
    mixingSheet: [
      "Verify recipe version and ingredient lots before pulling material.",
      "Confirm purpose, stage, release timing, and source confidence before mixing.",
      "Record actual pulled amounts, shrinkage, batch number, bag count, and packaging lot.",
      "Create production tasks for pull, mix, moisture/cook check, bagging, and inventory update."
    ],
    mixingInstructions: [
      "Measure all base materials first.",
      "Pre-mix dry amendments separately for even distribution.",
      "Blend minerals and amendments evenly through the batch.",
      "Moisten gradually and rest/cook organic mixes when appropriate.",
      "Label the batch with recipe, version, purpose, and target use date."
    ],
    warnings: Array.from(new Set(warnings)),
    recommendations: [
      "Use this as a purpose-built mix record, not only a cost sheet.",
      "Compare plant response, pH/EC checks, topdress timing, and final results before reusing the formula.",
      "Save the batch to the grow timeline and create follow-up plant-response tasks."
    ],
    tasksToCreate: [
      { title: "Pull ingredients", dueInDays: 0, priority: "medium" },
      { title: "Mix batch", dueInDays: 1, priority: "medium" },
      {
        title: "Check plant response after use",
        dueInDays: 7,
        priority: warnings.length ? "high" : "medium"
      }
    ],
    taskSuggestion: {
      title: `Build soil batch${input.recipeId ? ` for ${input.recipeId}` : ""}`,
      dueInDays: 1,
      priority: "medium"
    },
    logSummary: `${purpose} batch planned with ${normalizedIngredients.length} inputs, ${bagCount} bags, and ${warnings.length} warning(s).`
  };
}

function calculateIpmScout(input = {}) {
  const stickyTrapCount = Math.max(
    0,
    number(input.stickyTrapCount ?? 0, "Sticky trap count")
  );
  const leafDamage = String(input.leafDamage || "").toLowerCase();
  const pestSeen = String(input.pestSeen || "").toLowerCase();
  const underside = String(input.undersideInspection || "").toLowerCase();
  const evidence = parseList(input.evidence || input.notes);
  const inputSnapshot = {
    growId: input.growId || null,
    plantId: input.plantId || null,
    stage: input.stage || null,
    pestSeen: input.pestSeen || "",
    leafDamage: input.leafDamage || "",
    undersideInspection: input.undersideInspection || "",
    stickyTrapCount,
    evidence,
    notes: input.notes || ""
  };
  let suspectedIssue = "monitoring";
  let suspectedOrganism = "unknown";
  let severity = stickyTrapCount > 20 ? "high" : stickyTrapCount > 5 ? "medium" : "low";
  if (/mite|web|stippling/.test(`${pestSeen} ${leafDamage} ${underside}`)) {
    suspectedIssue = "pest_pressure";
    suspectedOrganism = "mites possible";
  } else if (/thrip|silver|scrape/.test(`${pestSeen} ${leafDamage}`)) {
    suspectedIssue = "pest_pressure";
    suspectedOrganism = "thrips possible";
  } else if (/mold|mildew|spot|lesion/.test(leafDamage)) {
    suspectedIssue = "disease_or_leaf_spot";
  }
  if (suspectedIssue !== "monitoring" && severity === "low") severity = "medium";
  const confidence = evidence.length || stickyTrapCount ? "medium" : "low";
  const primaryAnswer = {
    source: "growpathai_ipm_scout",
    suspectedIssue,
    suspectedOrganism,
    confidence,
    severity,
    evidence,
    interpretation:
      suspectedIssue === "monitoring"
        ? "No strong pest or disease pattern was detected from the structured inputs. Continue scouting and document photos."
        : "Structured scout inputs suggest possible pest or disease pressure. Confirm identity before treatment decisions."
  };
  const gptVerificationPrompt = [
    "You are GrowPathAI's IPM verification assistant.",
    "Review the same IPM scout inputs and provide a second opinion.",
    "Do not recommend treatment until organism identity is verified with photos, magnification, trap counts, and inspection notes.",
    "Return suspected issue, suspected organism, confidence, severity, supporting evidence, counter-evidence, next inspection steps, and whether the GrowPathAI result agrees with your review.",
    `Scout input JSON: ${JSON.stringify(inputSnapshot)}`
  ].join("\n");
  const gptVerification = {
    provider: "gpt",
    status: "pending_gpt_review",
    secondaryAnswer: null,
    prompt: gptVerificationPrompt,
    inputSnapshot,
    requiredForTreatmentDecision: true,
    documentationTarget: "ToolRun.outputs.gptVerification"
  };
  const verificationDisplay = [
    {
      label: "GrowPathAI scout answer",
      status: "complete",
      answer: primaryAnswer
    },
    {
      label: "GPT verification answer",
      status: "pending_gpt_review",
      answer: null
    }
  ];
  const warnings = [
    "Verify IPM findings with magnification/photos and GPT second review before treatment decisions."
  ];
  return {
    suspectedIssue,
    suspectedOrganism,
    confidence,
    severity,
    evidence,
    primaryAnswer,
    gptVerification,
    aiVerification: gptVerification,
    verificationDisplay,
    documentation: {
      savedAs: "ToolRun",
      includeInputs: true,
      includeGrowPathAnswer: true,
      includeGptVerification: true,
      includeBothAnswers: true
    },
    warnings,
    nextInspectionSteps: [
      "Inspect leaf undersides and new growth with magnification.",
      "Check sticky traps by zone and date.",
      "Record photos before treatment decisions."
    ],
    nonChemicalRecommendations: [
      "Improve scouting frequency and isolate heavily affected material when appropriate.",
      "Confirm organism identity before choosing any treatment category."
    ],
    treatmentCategory: "inspection_and_cultural_controls_first",
    taskSuggestions: [
      {
        title: "Repeat IPM scout",
        dueInDays: severity === "high" ? 1 : 3,
        priority: severity === "high" ? "high" : "medium"
      }
    ]
  };
}

function calculateSpeciesCropIdentification(input = {}) {
  const commonName = String(input.commonName || input.crop || "unknown crop").trim();
  const cultivar = String(input.cultivar || input.strain || "").trim();
  const traits = parseList(input.traits || input.notes);
  const confirmed = String(input.userConfirmed || "").toLowerCase() === "true";
  return {
    likelyCrop: commonName,
    cultivarOrStrain: cultivar || null,
    confidence: confirmed ? "user_confirmed" : traits.length >= 3 ? "medium" : "low",
    confirmationRequired: !confirmed,
    cropProfileSuggestion: {
      commonName,
      cultivarOrStrain: cultivar || null,
      traits,
      source: confirmed ? "user_confirmed" : "user_entered"
    },
    warnings: confirmed
      ? []
      : ["Confirm crop identity before relying on crop-specific recommendations."],
    recommendations: [
      "Attach this identity to the plant or grow profile once confirmed.",
      "Use photos, breeder/source notes, leaf structure, growth habit, and flowering behavior as supporting evidence."
    ]
  };
}

function calculateGeneticsInventory(input = {}) {
  const cultivar = String(input.cultivar || "Unnamed cultivar");
  const stressNotes = parseList(input.stressNotes);
  const feedingResponse = String(input.feedingResponse || "unknown");
  const flowerTime = input.flowerTime ? number(input.flowerTime, "Flower time") : null;
  const parentage = String(input.parentage || "");
  const aromaFlavorNotes = parseList(input.aromaFlavorNotes);
  const observedTraits = {
    feedingResponse,
    stretch: input.stretch || input.stretchResponse || "unknown",
    flowerTime,
    rootingBehavior:
      input.rootingBehavior ||
      (stressNotes.some((note) => /roots fast|root fast/i.test(note))
        ? "roots_fast"
        : "unknown"),
    stressResponse: stressNotes,
    moldResistance: input.moldResistance || "unknown",
    pestResistance: input.pestResistance || "unknown",
    aromaFlavor: aromaFlavorNotes,
    finalProduct: input.finalProduct || ""
  };
  const tags = [];
  if (/heavy/i.test(feedingResponse)) tags.push("heavy_feeder");
  if (/light/i.test(feedingResponse)) tags.push("light_feeder");
  if (
    stressNotes.some((note) =>
      /heat tolerant|dryback tolerant|stress resistant/i.test(note)
    )
  )
    tags.push("stress_resistant");
  if (stressNotes.some((note) => /roots fast|root fast/i.test(note)))
    tags.push("roots_fast");
  if (stressNotes.some((note) => /roots slow|hard to clone/i.test(note)))
    tags.push("roots_slow");
  if (
    aromaFlavorNotes.some((note) => /gas|fuel|chem|funk|fruit|berry|citrus/i.test(note))
  )
    tags.push("notable_aroma");
  const parentageWarnings = [];
  if (parentage && parentage.includes("x") && !/[()]/.test(parentage)) {
    parentageWarnings.push(
      "Parentage has no grouping. A x B x C can be ambiguous; store structured parentage if order matters."
    );
  }
  if (parentage.includes("(") || parentage.includes(")")) {
    parentageWarnings.push(
      "Parentage grouping is present; preserve the exact text because (A x B) x C is not the same as A x (B x C)."
    );
  }
  const materialType =
    input.materialType || (input.seedType === "clone" ? "rooted_clone" : "seed");
  const preservationRecommendations = [
    materialType === "mother" || tags.includes("roots_slow")
      ? "Consider backup clone, tissue culture, or extra preservation notes for this genetic material."
      : "Link this record to clone, mother, pheno, and harvest records as data accumulates.",
    tags.includes("stress_resistant")
      ? "Stress resistance should be confirmed across repeated events before using it as breeding evidence."
      : "Record stress tests before making stress-resistance claims."
  ];
  return {
    cultivar,
    breeder: input.breeder || "",
    parentage,
    seedType: input.seedType || "",
    materialType,
    feedingResponse,
    stressNotes,
    flowerTime,
    growHistory: parseList(input.growHistory),
    aromaFlavorNotes,
    observedTraits,
    geneticsInventoryItem: {
      cultivar,
      breeder: input.breeder || "",
      source: input.source || input.breeder || "",
      seedType: input.seedType || "",
      parentage,
      generation: input.generation || "unknown",
      materialType,
      quantity: input.quantity ? number(input.quantity, "Quantity") : null,
      location: input.location || "",
      observedTraits,
      tags: Array.from(new Set(tags))
    },
    parentageWarnings,
    tags: Array.from(new Set(tags)),
    keeperSignals: [
      feedingResponse,
      flowerTime ? `${flowerTime} day flower estimate` : null,
      stressNotes.length ? `${stressNotes.length} stress notes` : null
    ].filter(Boolean),
    preservationRecommendations,
    recommendations: [
      "Link this genetics record to grows, plants, pheno scores, clone runs, and final product notes.",
      "Do not make keeper decisions from genetics notes alone; compare against actual run results.",
      ...preservationRecommendations
    ]
  };
}

function calculateHarvestReadiness(input = {}) {
  const flowerDay = number(input.flowerDay ?? 49, "Flower day");
  const breederFlowerTime = number(input.breederFlowerTime ?? 63, "Breeder flower time");
  const cloudyPercent = Math.max(0, number(input.cloudyPercent ?? 50, "Cloudy percent"));
  const amberPercent = Math.max(0, number(input.amberPercent ?? 5, "Amber percent"));
  const clearPercent = Math.max(
    0,
    number(input.clearPercent ?? 100 - cloudyPercent - amberPercent, "Clear percent")
  );
  const pistilStatus = String(input.pistilStatus || "unknown").toLowerCase();
  const budSwellStatus = String(
    input.budSwellStatus || input.calyxSwellStatus || "unknown"
  ).toLowerCase();
  const aromaStatus = String(
    input.aromaIntensity || input.aromaObservation || "unknown"
  ).toLowerCase();
  const sampleLocation = String(input.sampleLocation || "mixed").toLowerCase();
  const userGoal = String(
    input.userGoal || input.userEffectGoal || "balanced"
  ).toLowerCase();
  const remaining = breederFlowerTime - flowerDay;
  const structurallyFinished = /fully|finished|done|complete/.test(budSwellStatus);
  const structurallyDeveloping = /still|building|uneven|developing|not_done/.test(
    budSwellStatus
  );
  const pistilsDying = /dying|dark|brown|orange|reced|mostly_dead/.test(pistilStatus);
  const pistilsStillGrowing = /mostly_white|white|new_white|fresh/.test(pistilStatus);
  const aromaDropping = /fading|fade|declining|dropping|weaker|falling/.test(aromaStatus);
  let readinessStatus = "early";
  const warnings = [
    "Harvest readiness is decision support, not a guarantee. Confirm with photos, cultivar behavior, desired effect, and whole-plant maturity.",
    "Do not harvest from one sugar leaf photo; check multiple bud sites when possible."
  ];
  if (remaining <= 10 && cloudyPercent >= 50) readinessStatus = "checking_window";
  if (remaining <= 3 && cloudyPercent >= 60 && amberPercent >= 5)
    readinessStatus = "ready_soon";
  if (clearPercent > 25) readinessStatus = "not_ready";
  if (structurallyDeveloping && readinessStatus === "ready_soon") {
    readinessStatus = "checking_window";
    warnings.push(
      "Bud/calyx swell is not finished. Recheck before harvesting even if trichomes look close."
    );
  }
  if (pistilsStillGrowing) {
    warnings.push(
      "Mostly white or continuing new pistils usually means the plant may still be building or responding to stress."
    );
    if (readinessStatus === "ready_soon") readinessStatus = "checking_window";
  }
  if (sampleLocation === "sugar_leaf") {
    warnings.push(
      "Sugar leaf trichomes can mature differently than bud trichomes. Confirm on flower material."
    );
  }
  if (aromaDropping) {
    warnings.push(
      "Aroma is reported as dropping. Compare daily: waiting for more amber may trade away peak smell and flavor."
    );
  }
  const goalInterpretation = userGoal.includes("bright")
    ? "Bright effect goal: prefer mostly cloudy with low amber only when pistils, swell, and aroma agree."
    : userGoal.includes("heavy")
      ? "Heavier effect goal: more amber can fit, but avoid overripe or fading quality."
      : userGoal.includes("hash")
        ? "Hash goal: evaluate resin maturity, head quality, grease, aroma, and intended processing."
        : "Balanced goal: cloudy-dominant with some amber can fit if whole-plant maturity agrees.";
  const evidence = [
    {
      factor: "flower_day",
      observation: `Flower day ${flowerDay}`,
      interpretation:
        remaining > 10 ? "Earlier than breeder window." : "Near breeder reference window."
    },
    {
      factor: "trichomes",
      observation: `${cloudyPercent}% cloudy, ${amberPercent}% amber, ${clearPercent}% clear`,
      interpretation:
        clearPercent > 25
          ? "Clear dominant still suggests waiting."
          : "Trichome mix is entering a harvest check window."
    },
    {
      factor: "pistils",
      observation: pistilStatus,
      interpretation: /mostly_white|white|new_white/.test(pistilStatus)
        ? "Pistil signal suggests more building or possible stress/reflowering."
        : pistilsDying
          ? "Dying, darkening, or receding hairs support maturity, but do not decide harvest alone."
          : "Pistil signal does not block readiness from current input."
    },
    {
      factor: "bud_swell",
      observation: budSwellStatus,
      interpretation: structurallyDeveloping
        ? "Bud/calyx swell may not be finished."
        : structurallyFinished
          ? "Bud structure is reported finished developing; confirm across top and lower sites."
          : "Bud swell input does not establish whether structural development is finished."
    },
    {
      factor: "aroma",
      observation: aromaStatus,
      interpretation: /building/.test(aromaStatus)
        ? "Aroma may still be developing."
        : /strong|peak/.test(aromaStatus)
          ? "Aroma signal supports close monitoring."
          : aromaDropping
            ? "Aroma may be past peak; watch closely for continued smell loss."
            : "Aroma signal is limited or unknown."
    },
    { factor: "user_goal", observation: userGoal, interpretation: goalInterpretation }
  ];
  return {
    readinessStatus,
    estimatedWindow: {
      startDay: Math.max(flowerDay, breederFlowerTime - 7),
      targetDay: breederFlowerTime,
      endDay: breederFlowerTime + 14,
      confidence: warnings.length > 2 ? "medium" : "planning"
    },
    breederTimelineInterpretation: `Breeder day ${breederFlowerTime} is a reference, not a deadline. Begin close checks near day ${Math.max(
      1,
      breederFlowerTime - 7
    )}, compare peak smell and flavor at day ${breederFlowerTime}, and treat day ${
      breederFlowerTime + 14
    } as the late edge rather than an automatic harvest date.`,
    evidence,
    trichomeInterpretation:
      clearPercent > 25
        ? "Clear trichomes still suggest waiting."
        : "Trichome mix is entering a check window.",
    pistilInterpretation: evidence.find((row) => row.factor === "pistils")
      ?.interpretation,
    budSwellInterpretation: evidence.find((row) => row.factor === "bud_swell")
      ?.interpretation,
    aromaFlavorInterpretation: input.aromaIntensity
      ? aromaDropping
        ? `Aroma is ${input.aromaIntensity}; smell loss can mean the peak flavor window is passing even if amber continues increasing.`
        : `Aroma is ${input.aromaIntensity}; record it daily so a drop from peak is visible.`
      : "Aroma data not entered.",
    userGoalInterpretation: goalInterpretation,
    trichomeObservation: {
      clearPercent,
      cloudyPercent,
      amberPercent,
      sampleLocation
    },
    wholePlantMaturity: {
      pistilStatus,
      budSwellStatus,
      aromaStatus
    },
    suggestedNextCheckDate: new Date(
      Date.now() + (readinessStatus === "ready_soon" ? 1 : 3) * 86400000
    ).toISOString(),
    warnings: Array.from(new Set(warnings)),
    tasksToCreate: [
      {
        title: "Check trichomes again",
        dueInDays: readinessStatus === "ready_soon" ? 1 : 3,
        priority: readinessStatus === "ready_soon" ? "high" : "medium"
      },
      {
        title: "Photograph same bud sites",
        dueInDays: readinessStatus === "ready_soon" ? 1 : 3,
        priority: "medium"
      },
      {
        title: "Prepare dry room",
        dueInDays: readinessStatus === "ready_soon" ? 1 : 5,
        priority: readinessStatus === "ready_soon" ? "high" : "medium"
      }
    ],
    recommendations: [
      clearPercent > 25
        ? "Clear trichomes are still prominent; wait and recheck the same bud sites."
        : amberPercent >= 20
          ? "Amber is substantial; decide whether a heavier result is worth further loss of bright aroma and flavor."
          : "Cloudy-dominant trichomes indicate the main decision window; match timing to the desired effect.",
      structurallyDeveloping
        ? "Buds are still developing structurally. Wait for calyx swell to finish unless plant health forces an earlier harvest."
        : structurallyFinished
          ? "Buds are reported structurally finished; confirm lower sites before cutting the whole plant."
          : "Record whether buds/calyxes are still swelling or structurally finished.",
      pistilsDying
        ? "Dying and receding hairs support maturity; confirm with bud trichomes and structure."
        : "Watch whether fresh hairs stop appearing and existing hairs darken and recede.",
      aromaDropping
        ? "Smell is dropping: consider harvesting within the current window instead of waiting only for more amber."
        : "Track aroma daily and note the first decline from peak smell and flavor.",
      `Use breeder day ${breederFlowerTime} as the center reference; the displayed range runs from one week before it through two weeks after it.`
    ],
    recommendation:
      readinessStatus === "ready_soon"
        ? "Plant appears close. Recheck multiple bud sites and confirm pistils, bud swell, aroma, and target effect before harvest."
        : "Keep monitoring whole-plant maturity before harvest.",
    harvestTask: {
      title: "Recheck harvest readiness",
      dueInDays: readinessStatus === "ready_soon" ? 1 : 3,
      priority: readinessStatus === "ready_soon" ? "high" : "medium"
    }
  };
}

function calculatePersonalInventory(input = {}) {
  const quantity = Math.max(0, number(input.quantity ?? 0, "Quantity"));
  const reorderAt = Math.max(0, number(input.reorderAt ?? 0, "Reorder threshold"));
  const cost = Math.max(0, number(input.cost ?? 0, "Cost"));
  const lowStock = quantity <= reorderAt;
  return {
    name: input.name || "Inventory item",
    category: input.category || "grow_supply",
    quantity,
    unit: input.unit || "",
    cost,
    lowStockWarnings: lowStock
      ? [`${input.name || "Item"} is at or below reorder threshold.`]
      : [],
    recipeAvailability: input.recipeUseRate
      ? Math.floor(quantity / Math.max(1, number(input.recipeUseRate, "Recipe use rate")))
      : null,
    costPerUse: input.recipeUseRate
      ? Number((cost * number(input.recipeUseRate, "Recipe use rate")).toFixed(2))
      : null,
    reorderSuggestions: lowStock
      ? [{ title: `Reorder ${input.name || "item"}`, dueInDays: 1, priority: "medium" }]
      : []
  };
}

function calculateCropSteeringProject(input = {}) {
  const dryback = input.drybackPercent
    ? number(input.drybackPercent, "Dryback percent")
    : null;
  const runoffEC = input.runoffEC ? number(input.runoffEC, "Runoff EC") : null;
  const inputEC = input.inputEC ? number(input.inputEC, "Input EC") : null;
  const recoveryHours = input.recoveryHours
    ? number(input.recoveryHours, "Recovery hours")
    : null;
  const dli = input.dli ? number(input.dli, "DLI") : null;
  const vpd = input.vpd ? number(input.vpd, "VPD") : null;
  const responseText = String(input.plantResponse || input.response || "").toLowerCase();
  const stage = String(input.stage || "").toLowerCase();
  const goal = String(
    input.steeringIntent || input.steeringGoal || "balanced"
  ).toLowerCase();
  const warnings = [];
  let pressureScore = 0;
  if (dryback != null && dryback > 35)
    warnings.push(
      "Dryback is high. Watch stress response before pushing generative pressure further."
    );
  if (dryback != null && dryback >= 30) pressureScore += 2;
  else if (dryback != null && dryback >= 20) pressureScore += 1;
  if (runoffEC != null && inputEC != null && runoffEC > inputEC * 1.4) {
    pressureScore += 1;
    warnings.push("Runoff EC is materially higher than input EC.");
  }
  if (/wilt|severe|stall|damage|burn|herm|intersex/.test(responseText))
    pressureScore += 2;
  else if (/droop|stress|edge|curl|taco|claw/.test(responseText)) pressureScore += 1;
  if (recoveryHours != null && recoveryHours > 24) pressureScore += 2;
  else if (recoveryHours != null && recoveryHours > 12) pressureScore += 1;
  if (
    String(input.lightChange || "")
      .toLowerCase()
      .includes("large")
  ) {
    pressureScore += 1;
    warnings.push("Recent large light change may add stress pressure.");
  }
  if (/seedling|clone/.test(stage) && dryback != null && dryback > 15) {
    pressureScore += 1;
    warnings.push("Clone/seedling steering should avoid hard drybacks.");
  }
  if (/late|finish|ripen/.test(stage) && dryback != null && dryback > 30) {
    warnings.push(
      "Late flower drybacks should be cautious to preserve finish, aroma, and plant health."
    );
  }
  if (dli != null && dli > 45)
    warnings.push(
      "High DLI should be checked against leaf posture, bleaching, tacoing, and cultivar response."
    );
  if (vpd != null && vpd > 1.6)
    warnings.push(
      "High VPD increases transpiration and dryback pressure; watch calcium transport and wilt response."
    );

  const pressureLevel =
    pressureScore >= 5
      ? "excessive"
      : pressureScore >= 3
        ? "high"
        : pressureScore >= 1
          ? "moderate"
          : "low";
  const recoveryStatus =
    recoveryHours == null
      ? "unknown"
      : recoveryHours <= 12
        ? "recovered"
        : recoveryHours <= 24
          ? "recovering"
          : "poor_recovery";
  const plantResponse =
    /wilt|severe|stall|damage|burn|herm|intersex/.test(responseText) ||
    recoveryStatus === "poor_recovery"
      ? "negative"
      : recoveryStatus === "recovered" &&
          !/droop|stress|edge|curl|taco|claw/.test(responseText)
        ? "positive"
        : "uncertain";
  const steeringOutcome =
    plantResponse === "positive" && pressureLevel !== "excessive"
      ? "useful_or_tolerated"
      : plantResponse === "negative" || pressureLevel === "excessive"
        ? "exceeded_useful_steering"
        : "monitor_before_increasing_pressure";
  const phenoImpact =
    plantResponse === "positive"
      ? goal.includes("generative")
        ? "generative_steering_candidate"
        : "recovery_strong"
      : plantResponse === "negative"
        ? dryback != null && dryback >= 30
          ? "dryback_sensitive"
          : "recovery_poor"
        : "needs_more_observation";
  return {
    steeringIntent: input.steeringIntent || input.steeringGoal || "balanced",
    steeringGoal: input.steeringIntent || input.steeringGoal || "balanced",
    stage: input.stage || null,
    plantResponse,
    observedResponse: input.plantResponse || "not recorded",
    pressureLevel,
    recoveryStatus,
    steeringOutcome,
    phenoImpact,
    phase: input.phase || "P1",
    dryback: dryback == null ? null : { actualPercent: dryback },
    rootzone: {
      inputEC,
      runoffEC,
      inputPH: input.inputPH || null,
      runoffPH: input.runoffPH || null
    },
    environment: { dli, vpd },
    warnings: Array.from(new Set(warnings)),
    recommendations: [
      "Record consistent irrigation timing, shot size, dryback, runoff, DLI, VPD, and plant response.",
      plantResponse === "negative" || pressureLevel === "excessive"
        ? "Reduce pressure and move the plant back toward recovery steering before increasing dryback, EC, VPD, or light."
        : "Use control comparisons before deciding a steering approach improved the run."
    ],
    notesForPhenoScore: warnings.length
      ? "Stress response should be considered in pheno scoring."
      : "No major steering warnings entered.",
    tasksToCreate: [
      {
        title:
          plantResponse === "negative" || pressureLevel === "excessive"
            ? "Check plant recovery and reduce steering pressure"
            : "Log crop steering response",
        dueInDays: 1,
        priority: warnings.length ? "high" : "medium"
      }
    ],
    logSummary: `${goal} steering at ${pressureLevel} pressure with ${plantResponse} plant response.`
  };
}

function calculatePhenoHunt(input = {}) {
  const plants = Array.isArray(input.plants) ? input.plants : [];
  if (!plants.length) throw new Error("At least one pheno plant is required");
  const scoreNumber = (value, fallback = 0) => {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(10, parsed)) : fallback;
  };
  const makeTags = (plant, scores) => {
    const tags = [];
    const sexWeek = Number(
      plant.vegWeekSexObserved ?? plant.sexWeek ?? plant.sexWeekObserved
    );
    const recoveryHours = Number(plant.recoveryHours ?? plant.hoursToTurgorRecovery);
    const cloneRootingDays = Number(plant.cloneRootingDays ?? plant.daysToRoot);
    const stressNotes = String(plant.stressNotes || plant.notes || "").toLowerCase();
    if (Number.isFinite(sexWeek) && sexWeek > 0 && sexWeek <= 4) tags.push("early_sex");
    if (scores.vigor >= 8) tags.push("high_vigor");
    if (scores.aroma >= 8) tags.push("strong_aroma");
    if (scores.resin >= 8) tags.push("high_resin");
    if (scores.stress >= 8) tags.push("stress_resistant_candidate");
    if (Number.isFinite(recoveryHours) && recoveryHours <= 12)
      tags.push("recovery_strong");
    if (Number.isFinite(recoveryHours) && recoveryHours > 24) tags.push("recovery_poor");
    if (/dryback.*sensitive|wilt|poor recovery/.test(stressNotes))
      tags.push("dryback_sensitive");
    if (/herm|intersex/.test(stressNotes)) tags.push("stability_concern");
    if (
      Number.isFinite(cloneRootingDays) &&
      cloneRootingDays > 0 &&
      cloneRootingDays <= 10
    )
      tags.push("roots_fast");
    if (Number.isFinite(cloneRootingDays) && cloneRootingDays >= 18)
      tags.push("roots_slow");
    return tags;
  };
  const scored = plants
    .map((plant, index) => {
      const scores = {
        germination: scoreNumber(plant.germination ?? plant.seedlingVigor),
        vigor: scoreNumber(plant.vigor),
        morphology: scoreNumber(
          plant.morphology ?? plant.structure ?? plant.branchStructure ?? plant.vigor
        ),
        sexExpression: scoreNumber(plant.sexExpression ?? plant.sexExpressionSpeed),
        stemRub: scoreNumber(plant.stemRub ?? plant.stemRubIntensity ?? plant.aroma),
        aroma: scoreNumber(plant.aroma),
        flavor: scoreNumber(plant.flavor ?? plant.taste ?? plant.aroma),
        resin: scoreNumber(plant.resin),
        stress: scoreNumber(plant.stressResistance ?? plant.stress),
        stability: scoreNumber(
          plant.stability ??
            (/herm|intersex/i.test(String(plant.stressNotes || plant.notes || ""))
              ? 2
              : 8)
        ),
        yieldScore: scoreNumber(plant.yieldScore ?? plant.yield),
        clone: scoreNumber(plant.clonePerformance ?? plant.rootingScore ?? 6)
      };
      const sexWeek = Number(
        plant.vegWeekSexObserved ?? plant.sexWeek ?? plant.sexWeekObserved
      );
      const earlySexBonus =
        Number.isFinite(sexWeek) && sexWeek > 0 && sexWeek <= 4 ? 0.4 : 0;
      const flowerKeeperScore =
        scores.aroma * 0.2 +
        scores.flavor * 0.2 +
        ((scores.morphology + scores.resin) / 2) * 0.15 +
        scores.resin * 0.15 +
        ((scores.aroma + scores.flavor) / 2) * 0.15 +
        scores.morphology * 0.05 +
        scores.yieldScore * 0.05 +
        scores.stress * 0.05;
      const breedingParentScore =
        Math.max(scores.aroma, scores.resin, scores.stemRub) * 0.15 +
        ((scores.aroma + scores.resin + scores.stemRub) / 3) * 0.15 +
        scores.stress * 0.15 +
        scores.stability * 0.15 +
        scores.morphology * 0.1 +
        scores.resin * 0.1 +
        ((scores.aroma + scores.flavor) / 2) * 0.1 +
        scores.clone * 0.05 +
        scores.vigor * 0.05 +
        earlySexBonus;
      const stressKeeperScore =
        scores.stress * 0.35 +
        scores.stability * 0.15 +
        scores.vigor * 0.15 +
        scores.morphology * 0.1 +
        scores.resin * 0.1 +
        scores.clone * 0.05 +
        scores.yieldScore * 0.1;
      const commercialCloneScore =
        scores.vigor * 0.15 +
        scores.morphology * 0.1 +
        scores.clone * 0.2 +
        ((scores.aroma + scores.resin) / 2) * 0.15 +
        scores.yieldScore * 0.15 +
        scores.stress * 0.15 +
        scores.flavor * 0.1;
      const score = Math.max(
        flowerKeeperScore,
        breedingParentScore,
        stressKeeperScore,
        commercialCloneScore
      );
      const tags = makeTags(plant, scores);
      const hasStabilityBlock =
        tags.includes("stability_concern") || scores.stability <= 4;
      const keeperDecision = hasStabilityBlock
        ? "retest_or_reject_stability"
        : score >= 8
          ? "keeper_candidate"
          : score >= 6
            ? "retest"
            : "reject_or_watch";
      const keeperCategory =
        score === commercialCloneScore && commercialCloneScore >= 7
          ? "commercial_clone_candidate"
          : score === stressKeeperScore && stressKeeperScore >= 7
            ? "stress_resistant_keeper"
            : score === breedingParentScore && breedingParentScore >= 7
              ? "breeding_parent_candidate"
              : "flower_keeper_candidate";
      return {
        id: String(plant.id || `plant_${index + 1}`),
        label: String(plant.label || plant.name || `Plant ${index + 1}`),
        score: Number(score.toFixed(2)),
        keeperDecision,
        keeperCategory,
        weightedScores: {
          flowerKeeper: Number(flowerKeeperScore.toFixed(2)),
          breedingParent: Number(breedingParentScore.toFixed(2)),
          stressResistant: Number(stressKeeperScore.toFixed(2)),
          commercialClone: Number(commercialCloneScore.toFixed(2))
        },
        stageScores: scores,
        sexExpression: {
          sex: plant.sex || "unknown",
          vegWeekSexObserved: Number.isFinite(sexWeek) ? sexWeek : null,
          earlySexSignal: Number.isFinite(sexWeek) && sexWeek > 0 && sexWeek <= 4
        },
        stressResponse: {
          stressScore: scores.stress,
          recoveryHours: Number.isFinite(
            Number(plant.recoveryHours ?? plant.hoursToTurgorRecovery)
          )
            ? Number(plant.recoveryHours ?? plant.hoursToTurgorRecovery)
            : null,
          stabilityScore: scores.stability
        },
        clonePerformance: {
          cloneScore: scores.clone,
          daysToRoot: Number.isFinite(Number(plant.cloneRootingDays ?? plant.daysToRoot))
            ? Number(plant.cloneRootingDays ?? plant.daysToRoot)
            : null
        },
        tags,
        strengths: [
          scores.vigor >= 8 ? "strong vigor" : null,
          scores.aroma >= 8 ? "strong aroma" : null,
          scores.resin >= 8 ? "high resin" : null,
          scores.stress >= 8 ? "strong stress response" : null,
          Number.isFinite(sexWeek) && sexWeek > 0 && sexWeek <= 4
            ? "early sex expression"
            : null
        ].filter(Boolean),
        weaknesses: [
          hasStabilityBlock ? "stability/intersex concern" : null,
          scores.vigor <= 4 ? "weak vigor" : null,
          scores.clone > 0 && scores.clone <= 4 ? "clone performance concern" : null,
          scores.stress <= 4 ? "stress sensitivity" : null
        ].filter(Boolean),
        notes: plant.notes || ""
      };
    })
    .sort((a, b) => b.score - a.score);
  const rejectReasons = scored
    .filter(
      (plant) =>
        plant.keeperDecision === "reject_or_watch" ||
        plant.keeperDecision === "retest_or_reject_stability"
    )
    .map((plant) => ({
      plant: plant.label,
      reason: plant.weaknesses.length
        ? plant.weaknesses.join(", ")
        : "Score below current keeper threshold."
    }));
  return {
    projectName: input.projectName || "Pheno hunt",
    selectionMethod: "stage_weighted_pheno_hunt",
    comparisonMatrix: scored,
    weightedScores: scored,
    keeperRecommendations: scored.filter(
      (plant) => plant.keeperDecision === "keeper_candidate"
    ),
    retestRecommendations: scored.filter(
      (plant) =>
        plant.keeperDecision === "retest" ||
        plant.keeperDecision === "retest_or_reject_stability"
    ),
    rejectReasons,
    phenoTags: scored.reduce((acc, plant) => {
      acc[plant.label] = plant.tags;
      return acc;
    }, {}),
    keeperCategories: scored.reduce((acc, plant) => {
      acc[plant.label] = plant.keeperCategory;
      return acc;
    }, {}),
    breedingCandidateNotes:
      "Confirm with clone performance, stress testing, lab/smoke notes, and rerun evidence before final keeper decisions.",
    recommendations: [
      "Do not make the final keeper decision until flower, smoke/taste, clone performance, and stability notes are complete.",
      "Treat early sex expression as a hunt-efficiency signal, not an automatic keeper decision.",
      "Use stress response and recovery tags to separate flower keepers from commercial clone, breeding, and stress-resistant candidates."
    ],
    timelineEvents: [
      "pheno_hunt_scored",
      scored.some((plant) => plant.tags.includes("early_sex"))
        ? "early_sex_signal_logged"
        : null,
      scored.some((plant) => plant.tags.includes("stability_concern"))
        ? "stability_concern_logged"
        : null
    ].filter(Boolean),
    reports: [
      { title: `${input.projectName || "Pheno hunt"} summary`, plantCount: scored.length }
    ]
  };
}

module.exports = {
  calculateVpd,
  calculatePpfdDli,
  calculateDewPointGuard,
  calculateEnvironmentReview,
  calculateWatering,
  calculateBudRotRisk,
  calculateNpkRecipe,
  calculatePhEcCheck,
  calculateTopdressPlan,
  calculateFeedingScheduleReview,
  calculateDryAmendmentMix,
  calculateDryCureGuard,
  calculateSoilBuilder,
  calculateNutrientSourceComparison,
  calculateStressTest,
  calculateCloneRooting,
  calculateRunComparison,
  calculateAutoGrowCalendar,
  calculateTissueCulture,
  calculateLivingSoilBatch,
  calculateIpmScout,
  calculateSpeciesCropIdentification,
  calculateGeneticsInventory,
  calculateHarvestReadiness,
  calculatePersonalInventory,
  calculateCropSteeringProject,
  calculatePhenoHunt
};
