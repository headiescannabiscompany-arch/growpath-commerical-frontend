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
  if (!range || typeof range !== "object") return "target_missing";
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
  const medium = String(input.medium || "").trim();
  const stage = String(input.stage || "").trim();
  const normalizedStage = stage.toLowerCase().replace(/[\s-]+/g, "_");
  const normalizeRange = (value) => {
    if (!value || typeof value !== "object") return null;
    const min = Number(value.min);
    const max = Number(value.max);
    return Number.isFinite(min) && Number.isFinite(max) && min < max
      ? { min, max }
      : null;
  };
  const targetPHRange =
    normalizeRange(input.targetPHRange) ||
    (medium
      ? /coco|hydro|rockwool/i.test(medium)
        ? { min: 5.7, max: 6.2 }
        : { min: normalizedStage === "seedling" ? 6.2 : 6.1, max: 6.8 }
      : null);
  const targetECRange =
    normalizeRange(input.targetECRange) ||
    (normalizedStage === "seedling"
      ? { min: 0.4, max: 1.0 }
      : normalizedStage === "flower" || normalizedStage === "late_flower"
        ? { min: 1.2, max: 2.2 }
        : normalizedStage
          ? { min: 0.8, max: 1.8 }
          : null);
  const inputEC = normalizeEc(input.inputEC, input.ecUnit);
  const runoffEC = normalizeEc(input.runoffEC, input.ecUnit);
  const inputPH = optionalNumber(input.inputPH, "Input pH");
  const runoffPH = optionalNumber(input.runoffPH, "Runoff pH");
  const alkalinity = optionalNumber(input.alkalinity, "Alkalinity");
  const calcium = optionalNumber(input.calcium, "Calcium");
  const magnesium = optionalNumber(input.magnesium, "Magnesium");
  const sodium = optionalNumber(input.sodium, "Sodium");
  const chloride = optionalNumber(input.chloride, "Chloride");
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

  const missingInformation = [];
  if (!medium) missingInformation.push("medium");
  if (!stage) missingInformation.push("stage");
  if ((inputEC != null || runoffEC != null) && !String(input.ecUnit || "").trim())
    missingInformation.push("EC unit");
  if (inputPH == null && runoffPH == null) missingInformation.push("input or runoff pH");
  if (inputEC == null && runoffEC == null) missingInformation.push("input or runoff EC");

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
  if (runoffEC != null && inputEC != null && runoffEC < inputEC - 0.4) {
    warnings.push("Runoff EC is meaningfully lower than input EC.");
    possibleRisks.push(
      "Plant uptake, weak feed, low fertility, poor retention, or inconsistent measurement may explain the lower runoff EC."
    );
    riskCodes.push("low_fertility_or_high_uptake");
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
  if (canonicalDriftDirection === "input_to_runoff_up") {
    warnings.push(
      "pH is drifting upward. Alkalinity, carbonate buffering, lime-heavy media, water source, or uptake patterns may contribute."
    );
  }
  if (canonicalDriftDirection === "input_to_runoff_down") {
    warnings.push(
      "pH is drifting downward. Acidic media, buildup, root-zone activity, fertilizer effects, or organic breakdown may contribute."
    );
  }
  const waterSource = String(input.waterSource || "").toLowerCase();
  const isReverseOsmosisWater =
    /(?:^|[^a-z0-9])(?:ro|r\/o)(?:$|[^a-z0-9])|reverse[\s-]+osmosis/.test(waterSource);
  if (isReverseOsmosisWater) {
    warnings.push(
      "RO water has low buffering. Calcium/magnesium and alkalinity context matter."
    );
    riskCodes.push("low_buffering");
    recommendations.push(
      "RO water contributes little mineral buffering. Ca/Mg and alkalinity context matter."
    );
  }
  if (/\b(?:city|municipal|well|tap)\b/.test(waterSource)) {
    warnings.push(
      "City/well water may contain alkalinity, calcium, magnesium, sodium, chloride, or other minerals that affect pH/EC interpretation."
    );
  }
  if (alkalinity != null && alkalinity > 120) {
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

  const riskLevel =
    actionableWarningCount >= 2 ? "high" : actionableWarningCount ? "watch" : "low";
  const assessmentStatus =
    !medium ||
    !stage ||
    (inputPH == null && runoffPH == null && inputEC == null && runoffEC == null)
      ? "insufficient_data"
      : actionableWarningCount
        ? "range_warning"
        : "range_review";
  const tasksToCreate = [
    {
      title: "Retest pH / EC",
      dueInDays: actionableWarningCount ? 1 : 2,
      priority: actionableWarningCount ? "high" : "medium",
      sourceStage: "ph_ec_retest",
      description:
        "Repeat calibrated input and runoff readings using the same sampling method before changing feed strength or pH adjustment."
    },
    ...(actionableWarningCount
      ? [
          {
            title: "Inspect root-zone and plant response",
            dueInDays: 1,
            priority: "high",
            sourceStage: "ph_ec_root_zone_review",
            description:
              "Record moisture, irrigation volume, runoff amount, leaf posture, tip burn, color, new growth, and a same-plant photo."
          }
        ]
      : [])
  ];

  return {
    medium: medium || null,
    stage: stage || null,
    cropType: input.cropType || null,
    projectId: input.projectId || null,
    assessmentStatus,
    riskLevel,
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
    waterProfile: {
      source: waterSource || null,
      alkalinity,
      calcium,
      magnesium,
      sodium,
      chloride
    },
    recentInputs: {
      feedRecipeId: input.recentFeedRecipeId || null,
      topdressId: input.recentTopdressId || null
    },
    warnings: Array.from(new Set(warnings)),
    recommendations: Array.from(new Set(recommendations)),
    retestTaskSuggestion: {
      title: "Retest pH / EC",
      dueInDays: actionableWarningCount ? 1 : 3,
      priority: actionableWarningCount ? "high" : "medium"
    },
    tasksToCreate,
    missingInformation,
    limitations: [
      "Published or configured ranges are interpretation context, not proof of crop need or permission to dose an adjuster.",
      "Runoff values depend on substrate, irrigation volume, sampling timing, meter calibration, and collection method.",
      "No exact pH Up/Down dose is calculated because product concentration and water volume are not established here."
    ],
    methodIds: ["soil-nutrients", ...(input.projectId ? ["crop-steering"] : [])],
    sourceIds: [],
    logSummary: `pH/EC check for ${medium || "unrecorded medium"} ${stage || "unrecorded stage"}: input pH ${inputPH ?? "?"}, runoff pH ${runoffPH ?? "?"}, input EC ${inputEC ?? "?"}, runoff EC ${runoffEC ?? "?"}.`,
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
  const suppliedRuns = Array.isArray(input.runs) ? input.runs : [];
  const legacySelections = suppliedRuns.length
    ? []
    : parseList(input.grows)
        .map((grow, index) => {
          const name = String(
            typeof grow === "string" ? grow : grow?.name || grow?.label || ""
          ).trim();
          if (!name) return null;
          return {
            id: `legacy_selection_${index + 1}`,
            growId: `legacy_selection_${index + 1}`,
            name,
            missingFields: [
              "owned saved-history evidence was not loaded; reopen Run Comparison and select saved grows"
            ],
            evidenceInventory: {}
          };
        })
        .filter(Boolean);
  const runs = suppliedRuns.length ? suppliedRuns : legacySelections;
  const legacySelectionOnly = !suppliedRuns.length && legacySelections.length >= 2;
  if (runs.length < 2) throw new Error("At least two saved grows are required");
  if (runs.length > 5) throw new Error("A maximum of five saved grows can be compared");
  const valueOrNull = (value) => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const textOrNull = (value) => String(value || "").trim() || null;
  const normalized = runs.map((run, index) => ({
    ...run,
    id: String(run.id || run.growId || `run_${index + 1}`),
    growId: String(run.growId || run.id || `run_${index + 1}`),
    name: String(run.name || `Saved grow ${index + 1}`),
    crop: textOrNull(run.crop),
    cultivar: textOrNull(run.cultivar),
    yieldAmount: valueOrNull(run.yieldAmount),
    yieldUnit: textOrNull(run.yieldUnit),
    qualityScore: valueOrNull(run.qualityScore),
    qualityScale: textOrNull(run.qualityScale),
    issueCount: valueOrNull(run.issueCount),
    taskCompletionRate: valueOrNull(run.taskCompletionRate),
    averageVpd: valueOrNull(run.averageVpd),
    averageDli: valueOrNull(run.averageDli),
    dryDays: valueOrNull(run.dryDays),
    cycleDays: valueOrNull(run.cycleDays),
    missingFields: Array.isArray(run.missingFields)
      ? run.missingFields.map(String).filter(Boolean)
      : [],
    evidenceInventory:
      run.evidenceInventory && typeof run.evidenceInventory === "object"
        ? run.evidenceInventory
        : {}
  }));
  const referenceRun =
    normalized.find(
      (run) => run.id === String(input.referenceGrowId || input.growId || "")
    ) || normalized[0];
  const comparisonRuns = normalized.filter((run) => run.id !== referenceRun.id);
  const scope = [
    "whole_run",
    "vegetative",
    "flowering_fruiting",
    "harvest_final",
    "post_harvest"
  ].includes(String(input.scope || ""))
    ? String(input.scope)
    : "whole_run";
  const objective = [
    "balanced_review",
    "yield",
    "final_quality",
    "issue_reduction",
    "task_execution",
    "cycle_time"
  ].includes(String(input.objective || ""))
    ? String(input.objective)
    : "balanced_review";
  const metricDefinitions = [
    {
      key: "yieldAmount",
      label: "Recorded yield",
      unitKey: "yieldUnit",
      objective: "yield",
      direction: "max"
    },
    {
      key: "qualityScore",
      label: "Recorded final-quality score",
      unitKey: "qualityScale",
      objective: "final_quality",
      direction: "max"
    },
    {
      key: "issueCount",
      label: "Recorded diagnosis count",
      unit: "diagnoses",
      objective: "issue_reduction",
      direction: "min"
    },
    {
      key: "taskCompletionRate",
      label: "Task completion",
      unit: "%",
      objective: "task_execution",
      direction: "max"
    },
    {
      key: "averageVpd",
      label: "Average recorded VPD",
      unit: "kPa"
    },
    {
      key: "averageDli",
      label: "Average recorded DLI",
      unit: "mol/m2/day"
    },
    { key: "dryDays", label: "Recorded dry duration", unit: "days" },
    {
      key: "cycleDays",
      label: "Recorded run duration",
      unit: "days",
      objective: "cycle_time",
      direction: "min"
    }
  ];
  const keyDifferences = [];
  const missingData = normalized.flatMap((run) =>
    run.missingFields.map((field) => ({
      growId: run.growId,
      growName: run.name,
      field,
      reason: "No comparable saved evidence was found."
    }))
  );
  const comparedMetricKeys = new Set();
  comparisonRuns.forEach((run) => {
    metricDefinitions.forEach((metric) => {
      const referenceValue = referenceRun[metric.key];
      const comparisonValue = run[metric.key];
      if (referenceValue == null || comparisonValue == null) return;
      const referenceUnit = metric.unitKey ? referenceRun[metric.unitKey] : metric.unit;
      const comparisonUnit = metric.unitKey ? run[metric.unitKey] : metric.unit;
      if (!referenceUnit || !comparisonUnit || referenceUnit !== comparisonUnit) {
        missingData.push({
          growId: run.growId,
          growName: run.name,
          field: metric.label,
          reason: `Units or scoring scales do not match the reference run (${referenceUnit || "unknown"} vs ${comparisonUnit || "unknown"}).`
        });
        return;
      }
      const delta = Number((comparisonValue - referenceValue).toFixed(3));
      comparedMetricKeys.add(metric.key);
      keyDifferences.push({
        category: metric.key,
        label: metric.label,
        referenceGrowId: referenceRun.growId,
        referenceRun: referenceRun.name,
        referenceValue,
        comparisonGrowId: run.growId,
        comparisonRun: run.name,
        comparisonValue,
        delta,
        unit: referenceUnit,
        interpretation:
          delta === 0
            ? "The saved values are the same."
            : `${run.name} is ${Math.abs(delta)} ${referenceUnit} ${delta > 0 ? "higher" : "lower"} than the reference record.`,
        limitation: "This recorded difference does not establish what caused it."
      });
    });
  });
  const knownCultivars = normalized.map((run) => run.cultivar).filter(Boolean);
  const knownCrops = normalized.map((run) => run.crop).filter(Boolean);
  const sameCultivar =
    knownCultivars.length === normalized.length
      ? knownCultivars.every((value) => value === knownCultivars[0])
      : null;
  const sameCrop =
    knownCrops.length === normalized.length
      ? knownCrops.every((value) => value === knownCrops[0])
      : null;
  const associatedDrivers = [];
  comparisonRuns.forEach((run) => {
    if (referenceRun.crop && run.crop && referenceRun.crop !== run.crop) {
      associatedDrivers.push({
        driver: "Different crops",
        comparisonRun: run.name,
        evidence: `${referenceRun.name} records ${referenceRun.crop}; ${run.name} records ${run.crop}.`,
        possibleAssociation:
          "Crop biology can explain outcome differences and limits process conclusions.",
        alternatives: [
          "cultivar or phenotype",
          "plant count",
          "space",
          "record coverage"
        ],
        nextCheck:
          "Compare within the same crop before changing a repeatable grow method.",
        confidence: "high_for_difference_not_effect"
      });
    } else if (
      referenceRun.cultivar &&
      run.cultivar &&
      referenceRun.cultivar !== run.cultivar
    ) {
      associatedDrivers.push({
        driver: "Different cultivar or phenotype",
        comparisonRun: run.name,
        evidence: `${referenceRun.name} records ${referenceRun.cultivar}; ${run.name} records ${run.cultivar}.`,
        possibleAssociation:
          "Genetic or phenotype differences may be associated with yield, timing, issue and quality differences.",
        alternatives: [
          "environment",
          "irrigation",
          "nutrition",
          "plant count",
          "post-harvest handling"
        ],
        nextCheck: "Repeat the comparison with matched cultivar or clone-line evidence.",
        confidence: "moderate"
      });
    }
    const yieldDifference = keyDifferences.find(
      (item) => item.category === "yieldAmount" && item.comparisonGrowId === run.growId
    );
    const qualityDifference = keyDifferences.find(
      (item) => item.category === "qualityScore" && item.comparisonGrowId === run.growId
    );
    const environmentDifferences = keyDifferences.filter(
      (item) =>
        ["averageVpd", "averageDli"].includes(item.category) &&
        item.comparisonGrowId === run.growId &&
        item.delta !== 0
    );
    if ((yieldDifference || qualityDifference) && environmentDifferences.length) {
      associatedDrivers.push({
        driver: "Environment changed alongside an outcome",
        comparisonRun: run.name,
        evidence: environmentDifferences
          .map((item) => `${item.label} changed by ${item.delta} ${item.unit}`)
          .join("; "),
        possibleAssociation:
          "The recorded environment may be associated with the outcome difference, but the comparison cannot establish causation.",
        alternatives: [
          "cultivar or phenotype",
          "plant count",
          "nutrition",
          "irrigation",
          "issue pressure",
          "record coverage"
        ],
        nextCheck:
          "Compare equivalent stage windows and repeat one controlled change with the same cultivar and measurement method.",
        confidence: "low"
      });
    }
    const issueDifference = keyDifferences.find(
      (item) => item.category === "issueCount" && item.comparisonGrowId === run.growId
    );
    if (
      (yieldDifference || qualityDifference) &&
      issueDifference &&
      issueDifference.delta !== 0
    ) {
      associatedDrivers.push({
        driver: "Issue pressure changed alongside an outcome",
        comparisonRun: run.name,
        evidence: `${issueDifference.label} changed by ${issueDifference.delta} ${issueDifference.unit}.`,
        possibleAssociation:
          "Recorded issue pressure may be associated with yield or final quality.",
        alternatives: [
          "diagnosis logging frequency",
          "severity",
          "cultivar",
          "environment",
          "treatment timing"
        ],
        nextCheck:
          "Compare severity, duration, treatment and recovery records-not diagnosis count alone.",
        confidence: "low_to_moderate"
      });
    }
    const dryDifference = keyDifferences.find(
      (item) => item.category === "dryDays" && item.comparisonGrowId === run.growId
    );
    if (qualityDifference && dryDifference && dryDifference.delta !== 0) {
      associatedDrivers.push({
        driver: "Post-harvest duration changed alongside final quality",
        comparisonRun: run.name,
        evidence: `Dry duration changed by ${dryDifference.delta} days while the saved quality score changed by ${qualityDifference.delta} ${qualityDifference.unit}.`,
        possibleAssociation:
          "Post-harvest handling may be associated with the quality difference, but elapsed time alone does not describe drying conditions or completion.",
        alternatives: [
          "temperature/RH",
          "airflow",
          "material density",
          "harvest timing",
          "cultivar"
        ],
        nextCheck:
          "Compare measured dry/cure conditions, representative material checks and the same quality rubric.",
        confidence: "low"
      });
    }
  });
  const objectiveMetric = metricDefinitions.find(
    (metric) => metric.objective === objective
  );
  let objectiveLeader = null;
  if (objectiveMetric) {
    const eligible = normalized.filter((run) => run[objectiveMetric.key] != null);
    const unitValues = objectiveMetric.unitKey
      ? [...new Set(eligible.map((run) => run[objectiveMetric.unitKey]).filter(Boolean))]
      : [objectiveMetric.unit];
    if (eligible.length === normalized.length && unitValues.length === 1) {
      const sorted = [...eligible].sort((left, right) =>
        objectiveMetric.direction === "min"
          ? left[objectiveMetric.key] - right[objectiveMetric.key]
          : right[objectiveMetric.key] - left[objectiveMetric.key]
      );
      objectiveLeader = {
        growId: sorted[0].growId,
        name: sorted[0].name,
        objective,
        metric: objectiveMetric.label,
        recordedValue: sorted[0][objectiveMetric.key],
        unit: unitValues[0],
        label: `${objectiveMetric.direction === "min" ? "Lowest" : "Highest"} recorded ${objectiveMetric.label.toLowerCase()}`,
        limitation:
          "This is the selected objective only, not an overall best-run ranking."
      };
    }
  }
  const sharedMetricCount = comparedMetricKeys.size;
  const evidenceStatus = legacySelectionOnly
    ? "selection_only_requires_history"
    : sharedMetricCount
      ? missingData.length
        ? "limited_comparison"
        : "measured_comparison"
      : "insufficient_comparable_evidence";
  const confidence =
    sharedMetricCount >= 5 && sameCrop !== false
      ? "moderate"
      : sharedMetricCount >= 2
        ? "low_to_moderate"
        : "low";
  const limitations = [
    ...(legacySelectionOnly
      ? [
          "Only grow labels were supplied. No owned logs, tasks, diagnoses, ToolRuns, module records or telemetry were loaded for comparison."
        ]
      : []),
    "This is an observational comparison of saved records and cannot establish causation.",
    "Missing records remain unknown and are not converted to zero.",
    "One comparison cannot establish a universal cultivar, environment, nutrition, irrigation or post-harvest method.",
    ...(scope === "whole_run"
      ? [
          "Whole-run averages can hide stage-specific differences; use an equivalent stage scope when records support it."
        ]
      : []),
    ...(sameCrop === false
      ? ["Different crops materially limit process conclusions."]
      : []),
    ...(sameCultivar === false
      ? [
          "Different cultivars or phenotypes are competing explanations for recorded differences."
        ]
      : []),
    ...(missingData.length
      ? [
          "Confidence is limited by missing or non-comparable fields listed in the report."
        ]
      : [])
  ];
  const recommendations = [
    ...(legacySelectionOnly
      ? [
          "Open Run Comparison and select two to five saved grows so GrowPath can load owned history before reporting differences."
        ]
      : []),
    "Review the saved evidence inventory before adopting any next-run change.",
    "Repeat one controlled change at an equivalent stage and preserve the same measurement method.",
    "Record plant count, cultivar/line, yield with unit, final-quality rubric, issue severity, task completion, environment and dry/cure outcome for the next comparison.",
    ...(objectiveLeader
      ? [
          `Use ${objectiveLeader.name} only as the recorded ${objective.replaceAll("_", " ")} reference-not an overall best run.`
        ]
      : [
          "Choose an objective only after comparable outcome evidence exists for every selected run."
        ])
  ];
  const tasksToCreate = [
    {
      title: "Review run-comparison evidence gaps",
      description:
        "Fill the missing fields and confirm units, scales, cultivar/line and equivalent stage before changing the next run.",
      dueInDays: 1,
      priority: missingData.length ? "high" : "medium",
      sourceStage: "run_comparison_evidence_review"
    },
    {
      title: "Choose one controlled next-run change",
      description:
        "Turn one cautious association into a measured trial while keeping other important inputs stable.",
      dueInDays: 3,
      priority: "medium",
      sourceStage: "run_comparison_controlled_change"
    },
    {
      title: "Schedule equivalent-stage outcome review",
      description:
        "Use the same measurement method and final-quality rubric at the comparable stage in the next run.",
      dueInDays: 7,
      priority: "medium",
      sourceStage: "run_comparison_outcome_review"
    }
  ];
  const evidenceTotals = normalized.reduce((totals, run) => {
    Object.entries(run.evidenceInventory || {}).forEach(([key, value]) => {
      if (typeof value === "number") totals[key] = (totals[key] || 0) + value;
    });
    return totals;
  }, {});
  return {
    comparisonTitle:
      String(input.comparisonTitle || "").trim() ||
      `Run comparison: ${normalized.map((run) => run.name).join(" vs ")}`,
    evidenceStatus,
    providerLabel: "GrowPath saved-history comparison (deterministic, no AI credit)",
    aiCreditUse: { required: false, creditsUsed: 0, optionalExplanationAvailable: true },
    aiSummary: {
      status: "available_on_request",
      message:
        "Ask AI can explain this saved deterministic report using the same evidence, missing-data and causation limits."
    },
    scope,
    objective,
    referenceRun: {
      growId: referenceRun.growId,
      name: referenceRun.name,
      crop: referenceRun.crop,
      cultivar: referenceRun.cultivar
    },
    comparisonRuns: comparisonRuns.map((run) => ({
      growId: run.growId,
      name: run.name,
      crop: run.crop,
      cultivar: run.cultivar
    })),
    objectiveLeader,
    snapshots: normalized,
    evidenceTotals,
    structuredSummary: {
      growsCompared: normalized.map((run) => ({
        growId: run.growId,
        name: run.name,
        crop: run.crop,
        cultivar: run.cultivar
      })),
      sameCrop,
      sameCultivar,
      scope,
      objective,
      sharedMetricCount,
      confidence
    },
    keyDifferences,
    associatedDrivers,
    likelyDrivers: associatedDrivers,
    missingData,
    confidence,
    limitations,
    recommendations,
    recommendationsForNextRun: recommendations,
    tasksToCreate,
    nextRunTasks: tasksToCreate,
    methodIds: ["run-comparison"],
    sourceIds: legacySelectionOnly
      ? ["growpath-method"]
      : ["growpath-method", "user-observation"],
    evidenceUsed: legacySelectionOnly
      ? ["selected grow labels only; saved history was not loaded"]
      : [
          "owned saved grow records",
          "grow logs",
          "tasks",
          "ToolRuns and module records",
          "diagnoses",
          "non-synthetic telemetry when linked"
        ],
    warnings: limitations,
    summary: legacySelectionOnly
      ? "The selection was saved, but no comparison was performed. Reopen Run Comparison and select saved grows to load owned evidence."
      : evidenceStatus === "insufficient_comparable_evidence"
        ? "The selected grows were saved, but they do not yet share enough comparable evidence for a measured difference."
        : `${keyDifferences.length} recorded difference(s) were found across ${sharedMetricCount} comparable metric(s); associations are not proof of cause.`
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
  const clean = (value) => String(value == null ? "" : value).trim();
  const lower = (value) =>
    clean(value)
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  const uniqueValues = (values) =>
    values
      .map(clean)
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index);
  const requiredText = (value, label) => {
    const result = clean(value);
    if (!result) throw new TypeError(`${label} is required`);
    return result;
  };
  const wholeCount = (value, label, required = false) => {
    const parsed = optionalNumber(value, label);
    if (parsed == null) {
      if (required) throw new TypeError(`${label} is required`);
      return null;
    }
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new TypeError(`${label} must be a whole number of zero or greater`);
    }
    return parsed;
  };
  const nonNegativeNumber = (value, label) => {
    const parsed = optionalNumber(value, label);
    if (parsed != null && parsed < 0) {
      throw new TypeError(`${label} must be zero or greater`);
    }
    return parsed;
  };
  const choice = (value, label, choices, aliases = {}) => {
    const normalized = lower(value);
    const resolved = aliases[normalized] || normalized;
    if (!resolved) throw new TypeError(`${label} is required`);
    if (!choices.includes(resolved)) {
      throw new TypeError(`${label} must be one of: ${choices.join(", ")}`);
    }
    return resolved;
  };
  const percent = (part, total) => Number(((part / Math.max(total, 1)) * 100).toFixed(1));

  const projectName = requiredText(input.projectName, "Project name");
  const batchNumber = requiredText(input.batchNumber, "Batch number");
  const stage = choice(
    input.stage,
    "Tissue culture stage",
    [
      "stock_selection",
      "initiation",
      "multiplication",
      "rooting",
      "acclimation",
      "storage",
      "recovery"
    ],
    {
      stage_0: "stock_selection",
      stage_1: "initiation",
      stage_2: "multiplication",
      stage_3: "rooting",
      stage_4: "acclimation"
    }
  );
  const workflowLane = choice(
    input.workflowLane || input.productionPhase || input.preservationMode,
    "Workflow lane",
    ["mother_bank", "production", "cold_storage", "cryopreservation"]
  );
  const inspectionStatus = choice(input.inspectionStatus, "Direct inspection status", [
    "not_inspected",
    "inspected_no_visible_issue",
    "visible_issue_present",
    "mixed"
  ]);
  const observedAt = requiredText(
    input.observedAt || input.measuredAt,
    "Observation date/time"
  );
  const observationSource = requiredText(
    input.observationSource || input.measurementSource,
    "Observation source"
  );

  const vessels = wholeCount(input.vessels ?? input.vesselCount, "Total vessels", true);
  if (vessels < 1) throw new TypeError("Total vessels must be greater than zero");
  const contaminated = wholeCount(
    input.contaminatedVessels,
    "Contaminated vessels",
    true
  );
  const fungalLike = wholeCount(
    input.fungalLikeVessels ?? input.fungusVessels,
    "Fungal-like appearance vessels",
    true
  );
  const browning = wholeCount(input.browningVessels, "Browning vessels", true);
  const stalled = wholeCount(input.stalledVessels, "Stalled vessels", true);
  const rooted = wholeCount(input.rootedVessels, "Rooted vessels", true);
  [
    [contaminated, "Contaminated vessels"],
    [fungalLike, "Fungal-like appearance vessels"],
    [browning, "Browning vessels"],
    [stalled, "Stalled vessels"],
    [rooted, "Rooted vessels"]
  ].forEach(([count, label]) => {
    if (count > vessels) throw new TypeError(`${label} cannot exceed total vessels`);
  });
  if (fungalLike > contaminated) {
    throw new TypeError(
      "Fungal-like appearance vessels cannot exceed contaminated vessels"
    );
  }
  if (
    inspectionStatus === "not_inspected" &&
    [contaminated, fungalLike, browning, stalled, rooted].some((count) => count > 0)
  ) {
    throw new TypeError(
      "Direct inspection cannot be not_inspected when visible vessel counts are recorded"
    );
  }

  const transferCycle = wholeCount(input.transferCycle, "Transfer cycle");
  const maxProductionTransfers = wholeCount(
    input.maxProductionTransfers,
    "Maximum production transfers"
  );
  if (
    transferCycle != null &&
    maxProductionTransfers != null &&
    transferCycle > maxProductionTransfers
  ) {
    throw new TypeError(
      "Transfer cycle cannot exceed the recorded maximum production transfers"
    );
  }
  const transferDueDays = wholeCount(
    input.transfersDueDays ?? input.daysToNextTransfer,
    "Next transfer due days"
  );
  const acclimationEntered = wholeCount(
    input.acclimatedPlants ?? input.acclimationEntered,
    "Plants entering acclimation"
  );
  const acclimationSurvived = wholeCount(
    input.acclimationSurvived,
    "Acclimation survivors"
  );
  if (
    acclimationEntered != null &&
    acclimationSurvived != null &&
    acclimationSurvived > acclimationEntered
  ) {
    throw new TypeError(
      "Acclimation survivors cannot exceed plants entering acclimation"
    );
  }
  const initialProtocolUnits = wholeCount(
    input.initialProtocolUnits,
    "Initial protocol cohort units"
  );
  const survivingProtocolUnits = wholeCount(
    input.survivingProtocolUnits,
    "Surviving protocol cohort units"
  );
  const regrowingProtocolUnits = wholeCount(
    input.regrowingProtocolUnits,
    "Regrowing protocol cohort units"
  );
  if (
    initialProtocolUnits != null &&
    survivingProtocolUnits != null &&
    survivingProtocolUnits > initialProtocolUnits
  ) {
    throw new TypeError(
      "Surviving protocol cohort units cannot exceed initial protocol cohort units"
    );
  }
  if (
    survivingProtocolUnits != null &&
    regrowingProtocolUnits != null &&
    regrowingProtocolUnits > survivingProtocolUnits
  ) {
    throw new TypeError(
      "Regrowing protocol cohort units cannot exceed surviving protocol cohort units"
    );
  }

  const mediaCost = nonNegativeNumber(input.mediaCost, "Media cost");
  const vesselSupplyCost = nonNegativeNumber(
    input.vesselSupplyCost,
    "Vessel and supply cost"
  );
  const laborCost = nonNegativeNumber(input.laborCost, "Labor cost");
  const costValues = [mediaCost, vesselSupplyCost, laborCost];
  const hasCostEvidence = costValues.some((value) => value != null);
  const totalProjectCost = hasCostEvidence
    ? Number(costValues.reduce((sum, value) => sum + (value || 0), 0).toFixed(2))
    : null;
  const costSurvivorCount = survivingProtocolUnits ?? acclimationSurvived;
  const costPerSurvivingPlant =
    totalProjectCost != null && costSurvivorCount != null && costSurvivorCount > 0
      ? Number((totalProjectCost / costSurvivorCount).toFixed(2))
      : null;

  const vesselTraceability = (
    Array.isArray(input.vesselTraceability) ? input.vesselTraceability : []
  )
    .map((row) => ({
      vesselId: clean(row?.vesselId),
      rack: clean(row?.rack) || null,
      shelf: clean(row?.shelf) || null,
      status: clean(row?.status) || null,
      parentVesselId: clean(row?.parentVesselId) || null,
      notes: clean(row?.notes) || null
    }))
    .filter((row) => row.vesselId);
  const vesselIds = vesselTraceability.map((row) => row.vesselId);
  if (new Set(vesselIds).size !== vesselIds.length) {
    throw new TypeError("Vessel traceability IDs must be unique within the batch");
  }
  if (vesselTraceability.length > vessels) {
    throw new TypeError("Vessel traceability rows cannot exceed total vessels");
  }

  const SOPVersion = clean(input.SOPVersion || input.sopVersion) || null;
  const mediaRecipe = clean(input.mediaRecipe) || null;
  const mediaLotId = clean(input.mediaLotId) || null;
  const sterilizationRunId = clean(input.sterilizationRunId) || null;
  const sterilizationMethod = clean(input.sterilizationMethod) || null;
  const sterilizationOutcome = clean(input.sterilizationOutcome) || null;
  const technicianOwner = clean(input.technicianOwner) || null;
  const lastAction = clean(input.lastAction) || null;
  const lastActionBy = clean(input.lastActionBy) || null;
  const lastActionAt = clean(input.lastActionAt) || null;
  const geneticsId = clean(input.geneticsId) || null;
  const motherBankId = clean(input.motherBankId) || null;
  const sourceBatchId = clean(input.sourceBatchId) || null;
  const parentTransferId = clean(input.parentTransferId) || null;
  const visiblePatterns = clean(input.visiblePatterns || input.symptoms) || null;
  const contaminationDisposition = clean(input.contaminationDisposition) || null;
  const optionalChoice = (value, label, choices) => {
    const normalized = lower(value);
    if (!normalized) return "not_recorded";
    if (!choices.includes(normalized)) {
      throw new TypeError(`${label} must be one of: ${choices.join(", ")}`);
    }
    return normalized;
  };
  const pathogenTestStatus = optionalChoice(input.pathogenTestStatus, "Pathogen status", [
    "not_tested",
    "pending",
    "clear",
    "detected",
    "inconclusive"
  ]);
  const geneticStabilityStatus = optionalChoice(
    input.geneticStabilityStatus,
    "Genetic stability status",
    ["not_reviewed", "reviewed_no_observed_off_types", "concern", "lab_reviewed"]
  );
  const cryopreservationValidationStatus = optionalChoice(
    input.cryopreservationValidationStatus,
    "Cryopreservation validation status",
    ["not_applicable", "planned", "validated", "failed"]
  );

  const missingInformation = uniqueValues([
    geneticsId ? "" : "genetics or source-line ID",
    motherBankId || sourceBatchId ? "" : "mother-bank or source-batch link",
    SOPVersion ? "" : "SOP version",
    mediaRecipe ? "" : "media recipe",
    mediaLotId ? "" : "media preparation or lot ID",
    sterilizationRunId ? "" : "sterilization run ID",
    sterilizationMethod ? "" : "sterilization method",
    sterilizationOutcome ? "" : "sterilization control outcome",
    technicianOwner || lastActionBy ? "" : "technician custody",
    lastAction && lastActionAt ? "" : "last handling action and timestamp",
    vesselTraceability.length ? "" : "vessel IDs and rack/shelf traceability",
    pathogenTestStatus !== "not_recorded" ? "" : "pathogen/indexing status",
    geneticStabilityStatus !== "not_recorded"
      ? ""
      : "genetic stability or off-type review",
    transferCycle != null ? "" : "transfer cycle",
    transferDueDays != null ? "" : "next transfer review timing"
  ]);

  const likelyFailureModes = [];
  const addFailureMode = (key, severity, issue, evidence, nextChecks) => {
    likelyFailureModes.push({ key, severity, issue, evidence, nextChecks });
  };
  if (contaminated > 0) {
    addFailureMode(
      "visible-contamination-pattern",
      "high",
      "Visible contamination-like growth is present and requires isolation and disposition.",
      `${contaminated}/${vessels} vessels (${percent(contaminated, vessels)}%) were recorded as contaminated.`,
      [
        "Isolate affected vessels and map the pattern by vessel, rack, source explant, media lot, sterilization run, and handler.",
        "Use an appropriate laboratory method if organism identification is necessary; appearance alone is not identification."
      ]
    );
  }
  if (fungalLike > 0) {
    addFailureMode(
      "fungal-like-appearance",
      "high",
      "A fungal-like appearance was recorded, but no microorganism identity is established.",
      `${fungalLike}/${vessels} vessels showed the recorded visual pattern.`,
      [
        "Photograph representative vessels without opening them, record timing and distribution, and keep the label fungal-like until laboratory evidence supports more."
      ]
    );
  }
  if (browning > 0) {
    addFailureMode(
      "browning-or-oxidation",
      "medium",
      "Browning or oxidation is present in part of the batch.",
      `${browning}/${vessels} vessels (${percent(browning, vessels)}%) were recorded with browning.`,
      [
        "Compare explant source, handling time, transfer age, media lot, and vessel position before changing the whole protocol."
      ]
    );
  }
  if (stalled > 0) {
    addFailureMode(
      "stalled-growth",
      "medium",
      "Stalled growth is present and should be compared across genotype, explant, medium, and environment.",
      `${stalled}/${vessels} vessels (${percent(stalled, vessels)}%) were recorded as stalled.`,
      [
        "Compare the affected cohort with clean controls and the same protocol on prior transfers; do not assign one cause from appearance alone."
      ]
    );
  }
  if (/hyperhyd|vitrif/.test(lower(visiblePatterns))) {
    addFailureMode(
      "hyperhydricity-like-pattern",
      "medium",
      "A hyperhydricity-like visual pattern was recorded.",
      visiblePatterns,
      [
        "Review vessel ventilation, media formulation, handling, and genotype response together; confirm the pattern before revising the SOP."
      ]
    );
  }
  if (
    transferCycle != null &&
    maxProductionTransfers != null &&
    transferCycle >= Math.max(0, maxProductionTransfers - 2)
  ) {
    addFailureMode(
      "transfer-limit-near",
      "high",
      "The production line is near its owner-recorded transfer-cycle limit.",
      `Transfer cycle ${transferCycle}/${maxProductionTransfers} was recorded.`,
      [
        "Review the owner-approved refresh/retirement SOP and compare genetic stability, vigor, contamination, and recovery evidence before another multiplication cycle."
      ]
    );
  }

  const releaseBlockers = uniqueValues([
    contaminated > 0 ? "visible contamination requires isolation and disposition" : "",
    ["visible_issue_present", "mixed"].includes(inspectionStatus)
      ? "direct inspection recorded visible issues"
      : "",
    SOPVersion ? "" : "SOP version is missing",
    mediaLotId ? "" : "media lot is missing",
    sterilizationRunId && sterilizationOutcome
      ? ""
      : "sterilization run/control evidence is incomplete",
    vesselTraceability.length ? "" : "vessel traceability is missing",
    pathogenTestStatus === "clear"
      ? ""
      : "pathogen/indexing status is not recorded as clear",
    ["reviewed_no_observed_off_types", "lab_reviewed"].includes(geneticStabilityStatus)
      ? ""
      : "genetic stability/off-type review is incomplete",
    workflowLane === "cryopreservation" &&
    cryopreservationValidationStatus !== "validated"
      ? "cryopreservation process/recovery validation is not recorded"
      : ""
  ]);

  const suppliedImageAnalysis =
    input.imageAnalysis && typeof input.imageAnalysis === "object"
      ? input.imageAnalysis
      : {};
  const mediaEvidence = Array.isArray(input.mediaEvidence) ? input.mediaEvidence : [];
  const evidenceAssetIds = Array.isArray(input.evidenceAssetIds)
    ? input.evidenceAssetIds.map(String).filter(Boolean)
    : [];
  const photosAttached = mediaEvidence.filter((item) =>
    /photo|image/i.test(String(item?.type || item?.mimeType || item?.kind || ""))
  ).length;
  const videosAttached = mediaEvidence.filter((item) =>
    /video/i.test(String(item?.type || item?.mimeType || item?.kind || ""))
  ).length;
  const photosAnalyzed = Number(suppliedImageAnalysis.photosAnalyzed || 0);
  const imageRequested =
    suppliedImageAnalysis.requested === true ||
    evidenceAssetIds.length > 0 ||
    photosAttached > 0;
  const imagePerformed =
    imageRequested && suppliedImageAnalysis.performed === true && photosAnalyzed > 0;
  const mediaAnalysis = {
    requested: imageRequested,
    performed: imagePerformed,
    photosAttached: Math.max(photosAttached, evidenceAssetIds.length),
    photosAnalyzed: imagePerformed ? photosAnalyzed : 0,
    videosAttached,
    videosAnalyzed: 0,
    provider: imagePerformed ? clean(suppliedImageAnalysis.provider) || null : null,
    providerLabel: imagePerformed
      ? clean(suppliedImageAnalysis.providerLabel) || "AI tissue culture photo review"
      : null,
    confidence: imagePerformed
      ? lower(suppliedImageAnalysis.confidence) || "low"
      : "not_assessed",
    quality: imagePerformed
      ? lower(suppliedImageAnalysis.quality) || "limited"
      : "not_reviewed",
    evidenceUsed:
      imagePerformed && Array.isArray(suppliedImageAnalysis.evidenceUsed)
        ? suppliedImageAnalysis.evidenceUsed.map(String).filter(Boolean)
        : [],
    limitations: uniqueValues([
      ...(Array.isArray(suppliedImageAnalysis.limitations)
        ? suppliedImageAnalysis.limitations
        : []),
      imageRequested && !imagePerformed
        ? "Media is attached, but this saved result does not attest that photo pixels were analyzed."
        : "",
      videosAttached
        ? "Attached video is stored as evidence; direct video interpretation is not enabled."
        : "",
      "Media may document visible vessel and explant patterns but cannot identify a microorganism, prove pathogen freedom, supply counts, or verify hidden vessel contents."
    ]),
    status: imagePerformed
      ? "photo_pixels_analyzed"
      : imageRequested
        ? "media_attached_not_analyzed"
        : "no_media_submitted"
  };

  const measuredIncubationTempC = nonNegativeNumber(
    input.measuredIncubationTempC,
    "Measured incubation temperature"
  );
  const measuredPhotoperiodHours = nonNegativeNumber(
    input.measuredPhotoperiodHours,
    "Measured photoperiod"
  );
  if (measuredPhotoperiodHours != null && measuredPhotoperiodHours > 24) {
    throw new TypeError("Measured photoperiod must be no more than 24 hours");
  }
  const multiplicationRate = nonNegativeNumber(
    input.multiplicationRate,
    "Multiplication rate"
  );
  const contaminationRate = percent(contaminated, vessels);
  const fungusRate = percent(fungalLike, vessels);
  const rootingRate = percent(rooted, vessels);
  const acclimationRate =
    acclimationEntered != null && acclimationEntered > 0 && acclimationSurvived != null
      ? percent(acclimationSurvived, acclimationEntered)
      : null;
  const protocolSurvivalRate =
    initialProtocolUnits != null &&
    initialProtocolUnits > 0 &&
    survivingProtocolUnits != null
      ? percent(survivingProtocolUnits, initialProtocolUnits)
      : null;

  const generatedCalendar = [
    contaminated > 0
      ? {
          title: `Confirm isolation and disposition: ${batchNumber}`,
          dueInDays: 1,
          priority: "high",
          sourceStage: "contamination_disposition",
          description:
            "Recount isolated vessels and document location, media lot, sterilization run, handler, visible pattern, and final disposition without naming an organism from appearance."
        }
      : null,
    missingInformation.length
      ? {
          title: `Complete TC traceability: ${batchNumber}`,
          dueInDays: 1,
          priority: "high",
          sourceStage: "traceability_review",
          description: `Complete: ${missingInformation.join(", ")}.`
        }
      : null,
    transferDueDays != null
      ? {
          title: `Review transfer readiness: ${batchNumber}`,
          dueInDays: transferDueDays,
          priority: releaseBlockers.length ? "high" : "medium",
          sourceStage: "transfer_review",
          description:
            "Recount the cohort, review direct inspection, traceability, quality-control evidence, and the owner-approved SOP before transfer."
        }
      : null
  ].filter(Boolean);

  const storageReminders = [
    workflowLane === "cold_storage"
      ? "Ordinary cold storage is recorded. Track location, measured temperature, entry, retrieval, survival, regrowth, and contamination after recovery."
      : "",
    workflowLane === "cryopreservation"
      ? "Cryopreservation is a separate validated process; do not label ordinary refrigeration or cold storage as cryopreservation."
      : "",
    clean(input.plannedRetrievalDate)
      ? `Planned retrieval date: ${clean(input.plannedRetrievalDate)}.`
      : ""
  ].filter(Boolean);

  const recommendations = uniqueValues([
    ...likelyFailureModes.flatMap((item) => item.nextChecks || []),
    missingInformation.length
      ? `Complete traceability before release: ${missingInformation.join(", ")}.`
      : "",
    releaseBlockers.length
      ? "Keep the batch blocked from production/storage release until each listed blocker is reviewed and resolved by the responsible owner."
      : "Review the complete evidence packet and owner-approved SOP before release; this calculator does not release material automatically.",
    "Compare outcomes by genotype/source line, explant type, SOP version, media lot, transfer cycle, technician, vessel position, measured environment, and final surviving plants.",
    "Treat published media, temperature, light, hormone, and timing values as protocol-specific context-not universal targets."
  ]);

  const projectStatus = likelyFailureModes.some((item) => item.severity === "high")
    ? "needs_attention"
    : missingInformation.length
      ? "traceability_incomplete"
      : "reviewed";
  const assessmentStatus = missingInformation.length
    ? "partial_measured_batch_review"
    : "measured_batch_review";
  const warnings = uniqueValues([
    contaminated > 0
      ? "Visible contamination-like growth was recorded. Isolate and document affected vessels; appearance does not identify the organism."
      : "",
    releaseBlockers.length
      ? `Release review is blocked: ${releaseBlockers.join("; ")}.`
      : "",
    workflowLane === "cryopreservation" &&
    cryopreservationValidationStatus !== "validated"
      ? "Cryopreservation is not established by a cold temperature entry alone; validated freezing, storage, retrieval, and recovery evidence is required."
      : ""
  ]);

  return {
    methodIds: ["tissue-culture"],
    sourceIds: [
      "usda-ars-hemp-tissue-culture-protocol-2025",
      "frontiers-2021-drug-type-cannabis-tc"
    ],
    assessmentStatus,
    confidence: missingInformation.length ? "limited" : "moderate",
    projectName,
    projectStatus,
    workflowLane,
    stage,
    batchSummary: {
      batchNumber,
      totalVessels: vessels,
      observationDateTime: observedAt,
      observationSource,
      directInspection: inspectionStatus
    },
    batchNarrative: `${vessels} vessel${vessels === 1 ? "" : "s"} reviewed for ${batchNumber} at ${stage}; ${contaminated} recorded with visible contamination-like growth.`,
    vesselStatus: {
      total: vessels,
      contaminated,
      fungalLikeAppearance: fungalLike,
      browning,
      stalled,
      rooted,
      contaminationPercent: contaminationRate,
      fungalLikeAppearancePercent: fungusRate,
      browningPercent: percent(browning, vessels),
      stalledPercent: percent(stalled, vessels),
      rootedPercent: rootingRate
    },
    contaminationRate,
    fungusRate,
    multiplicationRate,
    rootingRate,
    acclimationRate,
    protocolSurvivalRate,
    productionControls: {
      transferCycle,
      maxProductionTransfers,
      transfersRemaining:
        transferCycle != null && maxProductionTransfers != null
          ? maxProductionTransfers - transferCycle
          : null,
      transferDueDays,
      explantSizeTradeoff:
        "Explant size, genotype, donor condition, contamination pressure, medium, and handling interact; this review does not assume one best explant size."
    },
    traceability: {
      geneticsId,
      motherBankId,
      sourceBatchId,
      parentTransferId,
      technicianOwner,
      lastAction,
      lastActionBy,
      lastActionAt,
      vesselRowsRecorded: vesselTraceability.length,
      vessels: vesselTraceability,
      missingInformation
    },
    SOPVersion,
    mediaRecipe: {
      name: mediaRecipe,
      mediaType: clean(input.mediaType) || null,
      mediaLotId,
      sterilizationRunId,
      sterilizationMethod,
      sterilizationOutcome
    },
    measuredEnvironment: {
      incubationRoomId: clean(input.incubationRoomId) || null,
      telemetrySourceIds: clean(input.telemetrySourceIds) || null,
      incubationTemperatureC: measuredIncubationTempC,
      photoperiodHours: measuredPhotoperiodHours,
      inventoryLocation: clean(input.inventoryLocation) || null,
      measuredAt: observedAt,
      source: observationSource
    },
    diagnosisRecord: {
      assessmentType: "visible_pattern_review_not_microorganism_identification",
      likelyFailureModes,
      counterEvidence: uniqueValues([
        contaminated === 0 ? "No vessels were counted as visibly contaminated." : "",
        fungalLike === 0 ? "No fungal-like appearance was counted." : "",
        browning === 0 ? "No browning was counted." : "",
        stalled === 0 ? "No stalled vessels were counted." : ""
      ]),
      visiblePatterns,
      limitations: [
        "Visible vessel patterns cannot identify bacteria, fungi, yeast, viruses, viroids, or other causal agents.",
        "One batch cannot establish a universal cultivar, media, hormone, temperature, light, or transfer protocol.",
        "Counts may overlap when one vessel has more than one recorded condition."
      ]
    },
    qualityControl: {
      pathogenTestStatus,
      pathogenReportId: clean(input.pathogenReportId) || null,
      geneticStabilityStatus,
      offTypeObservations: clean(input.offTypeObservations) || null,
      contaminationDisposition,
      cryopreservationValidationStatus
    },
    releaseReview: {
      status: releaseBlockers.length ? "blocked" : "eligible_for_owner_review",
      automaticRelease: false,
      blockers: releaseBlockers,
      note: "GrowPath records the evidence review but does not automatically release tissue-culture material."
    },
    acclimationTracking: {
      cohortId: clean(input.acclimationCohortId) || null,
      entered: acclimationEntered,
      survived: acclimationSurvived,
      survivalPercent: acclimationRate,
      outcomeNotes: clean(input.protocolOutcomeNotes) || null
    },
    protocolOutcome: {
      protocolId: clean(input.protocolId) || null,
      protocolVersion: clean(input.protocolVersion) || null,
      initialUnits: initialProtocolUnits,
      survivingUnits: survivingProtocolUnits,
      regrowingUnits: regrowingProtocolUnits,
      survivalPercent: protocolSurvivalRate
    },
    costTracking: {
      mediaCost,
      vesselSupplyCost,
      laborCost,
      totalProjectCost,
      costPerSurvivingPlant,
      missingCostInputs: uniqueValues([
        mediaCost == null ? "media cost" : "",
        vesselSupplyCost == null ? "vessel/supply cost" : "",
        laborCost == null ? "labor cost" : ""
      ])
    },
    costPerSurvivingPlant,
    preservation: {
      mode: workflowLane,
      coldStorageRoomId: clean(input.coldStorageRoomId) || null,
      coldStorageTemperatureC: nonNegativeNumber(
        input.coldStorageTempC,
        "Cold-storage temperature"
      ),
      entryDate: clean(input.coldStorageStartDate) || null,
      plannedRetrievalDate: clean(input.plannedRetrievalDate) || null,
      recoveryCheckDays: wholeCount(input.recoveryCheckDays, "Recovery check days"),
      notes: clean(input.storageNotes) || null
    },
    mediaAnalysis,
    evidenceUsed: uniqueValues([
      `Direct batch inspection: ${inspectionStatus}.`,
      `Vessel counts: ${vessels} total, ${contaminated} contaminated, ${fungalLike} fungal-like appearance, ${browning} browning, ${stalled} stalled, ${rooted} rooted.`,
      `Observed ${observedAt}; source: ${observationSource}.`,
      ...mediaAnalysis.evidenceUsed
    ]),
    missingInformation,
    nextTransferTasks: [
      {
        title:
          transferDueDays == null
            ? `Set transfer review date: ${batchNumber}`
            : `Review transfer readiness: ${batchNumber}`,
        dueInDays: transferDueDays,
        dueDate: transferDueDays == null ? null : daysFromNow(transferDueDays),
        priority: releaseBlockers.length ? "high" : "medium"
      }
    ],
    generatedCalendar,
    storageReminders,
    targetBands: {
      evidenceBoundary:
        "Use the owner-approved SOP and measured batch outcomes. Published study conditions are protocol/genotype context, not universal production targets."
    },
    warnings,
    recommendations,
    limitations: [
      "This is a record and decision-support workflow, not a validated laboratory SOP, pathogen test, genetic-fidelity test, or release authorization.",
      "Cold storage and cryopreservation are separate workflows with different validation and recovery evidence."
    ]
  };
}

function calculateLivingSoilBatch(input = {}) {
  const requiredPositive = (value, label) => {
    if (value == null || value === "") throw new TypeError(`${label} is required`);
    const parsed = number(value, label);
    if (parsed <= 0) throw new TypeError(`${label} must be greater than zero`);
    return parsed;
  };
  const optionalNonNegative = (value, label) => {
    if (value == null || value === "") return null;
    const parsed = number(value, label);
    if (parsed < 0) throw new TypeError(`${label} cannot be negative`);
    return parsed;
  };
  const money = (value) => (value == null ? null : Number(value.toFixed(2)));
  const unique = (values) => Array.from(new Set(values.filter(Boolean)));
  const batchVolume = requiredPositive(input.batchVolume, "Batch volume");
  const bagSize = requiredPositive(input.bagSize, "Bag size");
  const ingredientCosts = Array.isArray(input.ingredientCosts)
    ? input.ingredientCosts
    : [];
  const explicitIngredients = Array.isArray(input.ingredients) ? input.ingredients : [];
  const ingredients = explicitIngredients.length ? explicitIngredients : ingredientCosts;
  if (!ingredients.length) throw new TypeError("At least one ingredient is required");
  const laborCost = optionalNonNegative(input.laborCost, "Labor cost");
  const packagingCost = optionalNonNegative(input.packagingCost, "Packaging cost");
  const shrinkagePercent = optionalNonNegative(
    input.shrinkagePercent,
    "Shrinkage percent"
  );
  if (shrinkagePercent != null && shrinkagePercent >= 100) {
    throw new TypeError("Shrinkage percent must be less than 100");
  }
  const marginPercent = optionalNonNegative(
    input.targetMarginPercent,
    "Target margin percent"
  );
  if (marginPercent != null && marginPercent >= 100) {
    throw new TypeError("Target margin percent must be less than 100");
  }
  const normalizedIngredients = ingredients.map((row, index) => {
    const name = String(row.name || "").trim();
    if (!name) throw new TypeError(`Ingredient ${index + 1} name is required`);
    const amount = optionalNonNegative(row.quantity ?? row.amount, `${name} quantity`);
    const releaseClass = releaseBucket(row);
    const explicitConfidence = String(
      row.sourceConfidence || row.confidence || ""
    ).toLowerCase();
    const sourceConfidence = ["high", "medium", "low"].includes(explicitConfidence)
      ? explicitConfidence
      : "unknown";
    return {
      name,
      amount,
      unit: String(row.unit || row.amountUnit || "").trim(),
      cost: optionalNonNegative(row.cost ?? row.totalCost, `${name} cost`),
      labelN: optionalNonNegative(row.N ?? row.labelN ?? row.labelNPK?.N, `${name} N`),
      labelP2O5: optionalNonNegative(
        row.P2O5 ?? row.P ?? row.labelP2O5 ?? row.labelNPK?.P2O5,
        `${name} P2O5`
      ),
      labelK2O: optionalNonNegative(
        row.K2O ?? row.K ?? row.labelK2O ?? row.labelNPK?.K2O,
        `${name} K2O`
      ),
      Ca: optionalNonNegative(row.Ca ?? row.elemental?.Ca, `${name} Ca`),
      Mg: optionalNonNegative(row.Mg ?? row.elemental?.Mg, `${name} Mg`),
      S: optionalNonNegative(row.S ?? row.elemental?.S, `${name} S`),
      releaseClass,
      sourceConfidence,
      category: String(row.category || ""),
      inventoryItemId: row.inventoryItemId || null,
      lotId: row.lotId || null,
      availableQuantity: optionalNonNegative(
        row.availableQuantity ?? row.inventoryQuantity,
        `${name} available quantity`
      ),
      availableUnit: String(row.availableUnit || row.inventoryUnit || "").trim()
    };
  });
  const ingredientPullSheet = normalizedIngredients.map((row) => ({
    name: row.name,
    quantity: row.amount,
    unit: row.unit || null,
    cost: row.cost,
    releaseClass: row.releaseClass,
    sourceConfidence: row.sourceConfidence,
    inventoryItemId: row.inventoryItemId,
    lotId: row.lotId,
    availableQuantity: row.availableQuantity,
    availableUnit: row.availableUnit || null
  }));
  const analysisUnits = unique(
    normalizedIngredients.map((row) => row.unit.toLowerCase())
  );
  const analysisComplete = normalizedIngredients.every(
    (row) =>
      row.amount != null &&
      row.amount > 0 &&
      row.unit &&
      row.labelN != null &&
      row.labelP2O5 != null &&
      row.labelK2O != null
  );
  const analysisCompatible = analysisComplete && analysisUnits.length === 1;
  const amountTotal = analysisCompatible
    ? normalizedIngredients.reduce((sum, row) => sum + row.amount, 0)
    : null;
  const weightedPercent = (key) => {
    if (!amountTotal) return null;
    return (
      normalizedIngredients.reduce((sum, row) => sum + row.amount * row[key], 0) /
      amountTotal
    );
  };
  const guaranteedAnalysisEstimate = {
    status: analysisCompatible
      ? "calculated_from_compatible_label_units"
      : "not_calculated",
    N: analysisCompatible ? Number(weightedPercent("labelN").toFixed(2)) : null,
    P2O5: analysisCompatible ? Number(weightedPercent("labelP2O5").toFixed(2)) : null,
    K2O: analysisCompatible ? Number(weightedPercent("labelK2O").toFixed(2)) : null,
    basisUnit: analysisCompatible ? analysisUnits[0] : null
  };
  const elementalEstimate = {
    N: guaranteedAnalysisEstimate.N,
    P:
      guaranteedAnalysisEstimate.P2O5 == null
        ? null
        : Number((guaranteedAnalysisEstimate.P2O5 * 0.4364).toFixed(2)),
    K:
      guaranteedAnalysisEstimate.K2O == null
        ? null
        : Number((guaranteedAnalysisEstimate.K2O * 0.8301).toFixed(2)),
    Ca:
      analysisCompatible && normalizedIngredients.every((row) => row.Ca != null)
        ? Number(weightedPercent("Ca").toFixed(2))
        : null,
    Mg:
      analysisCompatible && normalizedIngredients.every((row) => row.Mg != null)
        ? Number(weightedPercent("Mg").toFixed(2))
        : null,
    S:
      analysisCompatible && normalizedIngredients.every((row) => row.S != null)
        ? Number(weightedPercent("S").toFixed(2))
        : null
  };
  const releaseTimeline = normalizedIngredients.reduce(
    (acc, row) => {
      const key = row.releaseClass || "unknown";
      acc[key] = acc[key] || [];
      acc[key].push({
        name: row.name,
        amount: row.amount,
        unit: row.unit || null,
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
  const missingInformation = [];
  normalizedIngredients.forEach((row) => {
    if (row.amount == null || !row.unit)
      missingInformation.push(
        `${row.name}: quantity and unit are required for the pull sheet.`
      );
    if (row.cost == null) missingInformation.push(`${row.name}: cost is unknown.`);
    if (row.labelN == null || row.labelP2O5 == null || row.labelK2O == null)
      missingInformation.push(`${row.name}: complete label N-P2O5-K2O is missing.`);
    if (row.sourceConfidence === "unknown")
      missingInformation.push(`${row.name}: source confidence is unknown.`);
  });
  if (laborCost == null) missingInformation.push("Labor cost is unknown.");
  if (packagingCost == null) missingInformation.push("Packaging cost is unknown.");
  if (shrinkagePercent == null) missingInformation.push("Shrinkage is unknown.");
  if (!analysisCompatible) {
    warnings.push(
      analysisComplete
        ? "Guaranteed analysis was not calculated because ingredient quantities use incompatible units. Convert them to one mass or volume unit first."
        : "Guaranteed analysis remains unknown until every ingredient has a quantity, compatible unit, and complete label N-P2O5-K2O."
    );
  }
  const usableVolume =
    shrinkagePercent == null ? null : batchVolume * (1 - shrinkagePercent / 100);
  const bagCount = usableVolume == null ? null : Math.floor(usableVolume / bagSize);
  const leftoverVolume =
    usableVolume == null || bagCount == null ? null : usableVolume - bagCount * bagSize;
  if (bagCount === 0)
    warnings.push("Batch volume and bag size do not produce any sellable bags.");
  if (
    /seedling|clone/.test(stage) &&
    ((guaranteedAnalysisEstimate.N != null && guaranteedAnalysisEstimate.N > 2) ||
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
    guaranteedAnalysisEstimate.K2O != null &&
    guaranteedAnalysisEstimate.N != null &&
    guaranteedAnalysisEstimate.K2O > guaranteedAnalysisEstimate.N * 2 &&
    guaranteedAnalysisEstimate.K2O > 1
  ) {
    warnings.push("High potassium may compete with calcium/magnesium uptake.");
  }
  if (
    guaranteedAnalysisEstimate.P2O5 != null &&
    guaranteedAnalysisEstimate.N != null &&
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
  const measuredFinishedEc = optionalNonNegative(
    input.measuredFinishedEc,
    "Measured finished EC"
  );
  const maximumAcceptableEc = optionalNonNegative(
    input.maximumAcceptableEc,
    "Maximum acceptable EC"
  );
  if (
    input.saltRiskObserved === true ||
    (measuredFinishedEc != null &&
      maximumAcceptableEc != null &&
      measuredFinishedEc > maximumAcceptableEc)
  ) {
    warnings.push(
      "Measured or observed EC/salt risk exceeds the user-entered acceptance limit; hold the batch for review."
    );
  }
  const inventoryReview = normalizedIngredients.map((row) => {
    const comparable =
      row.amount != null &&
      row.availableQuantity != null &&
      row.unit &&
      row.availableUnit &&
      row.unit.toLowerCase() === row.availableUnit.toLowerCase();
    return {
      name: row.name,
      inventoryItemId: row.inventoryItemId,
      lotId: row.lotId,
      requiredQuantity: row.amount,
      requiredUnit: row.unit || null,
      availableQuantity: row.availableQuantity,
      availableUnit: row.availableUnit || null,
      status: comparable
        ? row.availableQuantity < row.amount
          ? "shortage"
          : "available"
        : row.availableQuantity == null
          ? "availability_unknown"
          : "unit_mismatch"
    };
  });
  if (inventoryReview.some((row) => row.status === "shortage")) {
    warnings.push("Inventory is short for one or more ingredient pulls.");
  }
  if (inventoryReview.some((row) => row.status === "unit_mismatch")) {
    warnings.push(
      "Inventory units do not match the recipe units for one or more ingredients."
    );
  }
  const ingredientKnownCost = normalizedIngredients.reduce(
    (sum, row) => sum + (row.cost == null ? 0 : row.cost),
    0
  );
  const costsComplete =
    normalizedIngredients.every((row) => row.cost != null) &&
    laborCost != null &&
    packagingCost != null;
  const knownCostSubtotal = ingredientKnownCost + (laborCost || 0) + (packagingCost || 0);
  const totalBatchCost = costsComplete ? knownCostSubtotal : null;
  const costPerBag =
    totalBatchCost != null && bagCount != null && bagCount > 0
      ? totalBatchCost / bagCount
      : null;
  const retailPriceSuggestion =
    costPerBag != null && marginPercent != null
      ? costPerBag / (1 - marginPercent / 100)
      : null;
  const purposeFit = warnings.length
    ? "review_before_use"
    : "fits_entered_purpose_with_current_data";
  const costEstimate = {
    status: costsComplete ? "complete" : "partial_missing_costs",
    ingredientCost: normalizedIngredients.every((row) => row.cost != null)
      ? money(ingredientKnownCost)
      : null,
    knownCostSubtotal: money(knownCostSubtotal),
    laborCost: money(laborCost),
    packagingCost: money(packagingCost),
    totalCost: money(totalBatchCost),
    costPerBatch: money(totalBatchCost),
    costPerBag: money(costPerBag),
    costPerGallon: totalBatchCost == null ? null : money(totalBatchCost / batchVolume),
    costPerCubicFoot:
      totalBatchCost == null ? null : money(totalBatchCost / (batchVolume / 7.48052))
  };
  return {
    recipeId: input.recipeId || null,
    batchName: input.batchName || input.recipeId || "Soil & nutrient batch",
    purpose,
    stage: input.stage || null,
    purposeFit,
    batchSummary:
      usableVolume == null
        ? `${purpose} batch: ${batchVolume} total volume; saleable yield is unknown until shrinkage is entered.`
        : `${purpose} batch: ${usableVolume.toFixed(2)} usable volume from ${batchVolume} total.`,
    batchVolume,
    bagSize,
    shrinkagePercent,
    usableVolume: usableVolume == null ? null : Number(usableVolume.toFixed(2)),
    bagCount,
    leftoverVolume: leftoverVolume == null ? null : Number(leftoverVolume.toFixed(2)),
    totalBatchCost: money(totalBatchCost),
    costPerBag: money(costPerBag),
    retailPriceSuggestion: money(retailPriceSuggestion),
    marginEstimate: {
      targetMarginPercent: marginPercent,
      grossMarginPerBag:
        retailPriceSuggestion == null || costPerBag == null
          ? null
          : money(retailPriceSuggestion - costPerBag)
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
    inventoryReview,
    inventoryShortages: inventoryReview.filter((row) => row.status === "shortage"),
    inventoryCommitStatus: "not_applied",
    packagingPlan: {
      bagSize,
      bagCount,
      leftoverVolume: leftoverVolume == null ? null : Number(leftoverVolume.toFixed(2)),
      status: bagCount == null ? "awaiting_shrinkage" : "calculated"
    },
    mixingSheet: [
      "Verify recipe version and ingredient lots before pulling material.",
      "Confirm purpose, stage, release timing, and source confidence before mixing.",
      "Record actual pulled amounts, shrinkage, batch number, bag count, and packaging lot.",
      "Create reviewed production tasks for pull, mix, moisture/cook check, bagging, inventory update, cleanup, and staging."
    ],
    mixingInstructions: [
      "Measure all base materials first.",
      "Pre-mix dry amendments separately for even distribution.",
      "Blend minerals and amendments evenly through the batch.",
      "Moisten gradually and rest/cook organic mixes when appropriate.",
      "Label the batch with recipe, version, purpose, and target use date."
    ],
    warnings: unique(warnings),
    missingInformation: unique(missingInformation),
    evidenceStatus:
      analysisCompatible && costsComplete
        ? "calculated_from_user_entered_evidence"
        : "partial_user_evidence",
    methodIds: ["soil-and-nutrient-method", "commercial-workflow-method"],
    sourceIds: ["growpath-method", "user-observation"],
    providerLabel: "GrowPath deterministic batch calculator",
    aiCreditsUsed: 0,
    limitations: [
      "Guaranteed analysis is an estimate from user-entered label values and compatible quantity units, not a laboratory result or registration claim.",
      "Inventory is reviewed only; this calculation never decrements stock or assigns lots automatically.",
      "Compost, castings, biological activity, density, compatibility, plant uptake, and crop response remain uncertain without direct evidence."
    ],
    recommendations: [
      "Use this as a purpose-built mix record, not only a cost sheet.",
      "Compare plant response, pH/EC checks, topdress timing, and final results before reusing the formula.",
      "Save the batch to the grow timeline and create follow-up plant-response tasks."
    ],
    tasksToCreate: [
      {
        title: "Pull ingredients and verify lots",
        dueInDays: 0,
        priority: inventoryReview.some((row) => row.status === "shortage")
          ? "high"
          : "medium"
      },
      {
        title: "Mix production batch and record actuals",
        dueInDays: 1,
        priority: "medium"
      },
      {
        title: "Bag, label, and complete batch QA",
        dueInDays: 2,
        priority: warnings.length ? "high" : "medium"
      },
      { title: "Review and update inventory actuals", dueInDays: 2, priority: "medium" },
      { title: "Clean the production area", dueInDays: 2, priority: "medium" },
      {
        title: "Stage or hold the finished batch",
        dueInDays: 3,
        priority: warnings.length ? "high" : "medium"
      },
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
    logSummary: `${purpose} batch planned with ${normalizedIngredients.length} inputs, ${bagCount == null ? "unknown" : bagCount} bags, and ${warnings.length} warning(s).`
  };
}

function calculateIpmScout(input = {}) {
  const clean = (value) => String(value || "").trim();
  const lower = (value) => clean(value).toLowerCase();
  const optionalCount = (value, label) => {
    if (value === undefined || value === null || clean(value) === "") return null;
    const parsed = number(value, label);
    if (parsed < 0 || !Number.isInteger(parsed)) {
      throw new TypeError(`${label} must be a whole number of zero or greater`);
    }
    return parsed;
  };
  const unique = (values) => Array.from(new Set(values.filter(Boolean)));
  const stringArray = (value) =>
    Array.isArray(value)
      ? value
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const includes = (pattern, ...values) => pattern.test(values.map(lower).join(" "));

  const stickyTrapCount = optionalCount(input.stickyTrapCount, "Sticky trap count");
  const plantsChecked = optionalCount(input.plantsChecked, "Plants checked");
  const plantsAffected = optionalCount(input.plantsAffected, "Plants affected");
  if (
    plantsChecked !== null &&
    plantsAffected !== null &&
    plantsAffected > plantsChecked
  ) {
    throw new TypeError("Plants affected cannot be greater than plants checked");
  }

  const cropContext = clean(
    input.cropContext || input.crop || input.cropIdentity?.commonName
  );
  const scoutLocation = clean(input.scoutLocation || input.location);
  const leafDamageText = clean(input.leafDamage || input.damagePattern);
  const leafDamage = lower(leafDamageText);
  const pestSeenText = clean(input.pestSeen);
  const pestSeen = lower(pestSeenText);
  const undersideText = clean(input.undersideInspection);
  const underside = lower(undersideText);
  const distribution = clean(input.distribution);
  const progression = clean(input.progression);
  const magnification = clean(input.magnification);
  const trapContext = clean(input.trapContext);
  const environmentConditions = clean(input.environmentConditions);
  const recentActions = clean(input.recentActions);
  const additionalInformation = clean(input.additionalInformation);
  const evidence = parseList(input.evidence || input.notes);
  const suppliedImageAnalysis =
    input.imageAnalysis && typeof input.imageAnalysis === "object"
      ? input.imageAnalysis
      : {};
  const mediaEvidence = Array.isArray(input.mediaEvidence) ? input.mediaEvidence : [];
  const imageEvidenceUsed = Array.isArray(suppliedImageAnalysis.evidenceUsed)
    ? suppliedImageAnalysis.evidenceUsed.map(String).filter(Boolean)
    : [];
  const imageLimitations = Array.isArray(suppliedImageAnalysis.limitations)
    ? suppliedImageAnalysis.limitations.map(String).filter(Boolean)
    : [];
  const photosAttachedFromMedia = mediaEvidence.filter((item) =>
    /photo|image/i.test(String(item?.type || item?.mimeType || item?.kind || ""))
  ).length;
  const photosAttached = Number(
    suppliedImageAnalysis.photoCount || photosAttachedFromMedia
  );
  const imageRequested = suppliedImageAnalysis.requested === true || photosAttached > 0;
  const imagePerformed =
    imageRequested === true &&
    suppliedImageAnalysis.performed === true &&
    Number(suppliedImageAnalysis.photosAnalyzed || 0) > 0;
  const videosAttached = mediaEvidence.filter((item) =>
    /video/i.test(String(item?.type || item?.mimeType || item?.kind || ""))
  ).length;
  const mediaAnalysis = {
    requested: imageRequested,
    performed: imagePerformed,
    photosAttached,
    photosAnalyzed: imagePerformed
      ? Number(suppliedImageAnalysis.photosAnalyzed || photosAttached)
      : 0,
    videosAttached,
    videosAnalyzed: 0,
    provider: imagePerformed ? clean(suppliedImageAnalysis.provider) || null : null,
    providerLabel: imagePerformed
      ? clean(suppliedImageAnalysis.providerLabel) || "AI IPM photo review"
      : null,
    confidence: imagePerformed ? lower(suppliedImageAnalysis.confidence) || "low" : "low",
    quality: imagePerformed
      ? lower(suppliedImageAnalysis.quality) || "limited"
      : "unreviewed",
    evidenceUsed: imagePerformed ? imageEvidenceUsed : [],
    limitations: unique([
      ...imageLimitations,
      ...(imageRequested && !imagePerformed
        ? ["Attached photo pixels were not analyzed in this scout result."]
        : []),
      ...(videosAttached
        ? [
            "Attached video is stored as evidence; direct video interpretation is not enabled."
          ]
        : [])
    ]),
    status: imagePerformed
      ? "photo_pixels_analyzed"
      : imageRequested
        ? "photos_attached_not_analyzed"
        : "no_photos_submitted",
    videoStatus: videosAttached
      ? "stored_for_follow_up; direct video interpretation is not enabled"
      : "No video attached"
  };

  if (!leafDamageText && !pestSeenText && !evidence.length && !imageEvidenceUsed.length) {
    throw new TypeError(
      "A direct observation is required: describe the damage, organism, or another observed sign before running IPM Scout"
    );
  }

  const combined = [
    pestSeenText,
    leafDamageText,
    undersideText,
    distribution,
    progression,
    evidence.join(" "),
    imageEvidenceUsed.join(" ")
  ].join(" ");
  const candidates = [
    {
      issue: "pest_pressure",
      organism: "spider mites possible",
      category: "sap-feeding pest",
      score:
        (includes(/\bmites?\b|two[- ]spotted/, pestSeenText) ? 4 : 0) +
        (includes(/fine web|webbing|moving specks?|round eggs?/, undersideText, combined)
          ? 2
          : 0) +
        (includes(/stippl|bronzing|speckl/, leafDamageText) ? 1 : 0),
      evidence: unique([
        includes(/\bmites?\b|two[- ]spotted/, pestSeenText)
          ? `Direct observation entered: ${pestSeenText}.`
          : "",
        includes(/fine web|webbing|moving specks?|round eggs?/, undersideText, combined)
          ? "Webbing, moving specks, or egg-like signs were recorded."
          : "",
        includes(/stippl|bronzing|speckl/, leafDamageText)
          ? `Damage pattern includes ${leafDamageText}.`
          : ""
      ])
    },
    {
      issue: "pest_pressure",
      organism: "thrips possible",
      category: "rasping-sucking pest",
      score:
        (includes(/\bthrips?\b/, pestSeenText) ? 4 : 0) +
        (includes(
          /silver|scrap|streak|black frass|black specks?/,
          leafDamageText,
          undersideText
        )
          ? 2
          : 0) +
        (includes(
          /slender|cigar[- ]shaped|fast[- ]moving/,
          pestSeenText,
          evidence.join(" ")
        )
          ? 1
          : 0),
      evidence: unique([
        includes(/\bthrips?\b/, pestSeenText)
          ? `Direct observation entered: ${pestSeenText}.`
          : "",
        includes(
          /silver|scrap|streak|black frass|black specks?/,
          leafDamageText,
          undersideText
        )
          ? "Silvering, scraping, streaking, or frass-like signs were recorded."
          : ""
      ])
    },
    {
      issue: "pest_pressure",
      organism: "fungus gnats possible",
      category: "root-zone/flying pest",
      score:
        (includes(/fungus gnat|\bgnats?\b/, pestSeenText) ? 4 : 0) +
        (includes(
          /small black fl|tiny black fl|larvae|larva/,
          pestSeenText,
          evidence.join(" ")
        )
          ? 2
          : 0) +
        (includes(/wet media|saturated|overwater|algae/, environmentConditions) ? 1 : 0),
      evidence: unique([
        includes(/fungus gnat|\bgnats?\b/, pestSeenText)
          ? `Direct observation entered: ${pestSeenText}.`
          : "",
        includes(/wet media|saturated|overwater|algae/, environmentConditions)
          ? "Persistently wet root-zone conditions were recorded."
          : ""
      ])
    },
    {
      issue: "pest_pressure",
      organism: "aphids possible",
      category: "sap-feeding pest",
      score:
        (includes(/\baphids?\b/, pestSeenText) ? 4 : 0) +
        (includes(/honeydew|sticky residue|cast skins?|cluster/, combined) ? 2 : 0) +
        (includes(/curl|distort|new growth/, leafDamageText, distribution) ? 1 : 0),
      evidence: unique([
        includes(/\baphids?\b/, pestSeenText)
          ? `Direct observation entered: ${pestSeenText}.`
          : "",
        includes(/honeydew|sticky residue|cast skins?|cluster/, combined)
          ? "Honeydew, cast skins, sticky residue, or clustered organisms were recorded."
          : ""
      ])
    },
    {
      issue: "pest_pressure",
      organism: "whiteflies possible",
      category: "sap-feeding flying pest",
      score:
        (includes(/whitefl|white fl/, pestSeenText) ? 4 : 0) +
        (includes(
          /white insects? flew|flies? when disturbed|scale[- ]like nymph/,
          combined
        )
          ? 2
          : 0) +
        (includes(/honeydew|sticky residue/, combined) ? 1 : 0),
      evidence: unique([
        includes(/whitefl|white fl/, pestSeenText)
          ? `Direct observation entered: ${pestSeenText}.`
          : "",
        includes(
          /white insects? flew|flies? when disturbed|scale[- ]like nymph/,
          combined
        )
          ? "Flying white adults or underside nymph-like signs were recorded."
          : ""
      ])
    },
    {
      issue: "disease_or_leaf_spot",
      organism: "powdery mildew-like growth, not confirmed",
      category: "fungal-like disease sign",
      score:
        (includes(/powdery mildew/, pestSeenText, leafDamageText) ? 4 : 0) +
        (includes(/white powder|powdery patch|white patch|surface growth/, leafDamageText)
          ? 2
          : 0) +
        (includes(
          /humid|high rh|poor airflow|dense canopy|leaf wet/,
          environmentConditions
        )
          ? 1
          : 0),
      evidence: unique([
        includes(/white powder|powdery patch|white patch|surface growth/, leafDamageText)
          ? "White powdery or surface-growth signs were recorded."
          : "",
        includes(
          /humid|high rh|poor airflow|dense canopy|leaf wet/,
          environmentConditions
        )
          ? "Humidity, leaf-wetness, or airflow conditions may favor disease pressure."
          : ""
      ])
    },
    {
      issue: "disease_or_leaf_spot",
      organism: "leaf spot or tissue disease possible",
      category: "disease-like lesion",
      score:
        (includes(/leaf spot|lesion|halo|concentric|water[- ]soaked/, leafDamageText)
          ? 3
          : 0) +
        (includes(/rapid|spreading|expanding/, progression) ? 1 : 0) +
        (includes(/humid|leaf wet|splash|poor airflow/, environmentConditions) ? 1 : 0),
      evidence: unique([
        includes(/leaf spot|lesion|halo|concentric|water[- ]soaked/, leafDamageText)
          ? `Lesion pattern recorded: ${leafDamageText}.`
          : "",
        includes(/rapid|spreading|expanding/, progression)
          ? `Progression recorded as ${progression}.`
          : ""
      ])
    },
    {
      issue: "pest_pressure",
      organism: "chewing pest possible",
      category: "chewing damage",
      score:
        (includes(/caterpillar|larva|beetle|weevil|slug|snail/, pestSeenText) ? 4 : 0) +
        (includes(/holes?|chew|notch|skeleton|frass/, leafDamageText, evidence.join(" "))
          ? 2
          : 0),
      evidence: unique([
        includes(/holes?|chew|notch|skeleton|frass/, leafDamageText, evidence.join(" "))
          ? "Chewing, holes, notching, skeletonizing, or frass was recorded."
          : ""
      ])
    }
  ]
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  const leading = candidates[0] || null;
  const runnerUp = candidates[1] || null;
  const suspectedIssue = leading?.issue || "monitoring_and_differential_needed";
  const suspectedOrganism = leading?.organism || "not confirmed";
  const affectedPercent =
    plantsChecked && plantsAffected !== null
      ? Number(((plantsAffected / plantsChecked) * 100).toFixed(1))
      : null;
  const rapidlySpreading = includes(/rapid|quick|overnight|doubl|worsen/, progression);
  let severity = "low";
  if (
    rapidlySpreading ||
    (affectedPercent !== null && affectedPercent >= 50) ||
    (stickyTrapCount !== null && stickyTrapCount >= 21)
  ) {
    severity = "high";
  } else if (
    leading ||
    (affectedPercent !== null && affectedPercent >= 10) ||
    (stickyTrapCount !== null && stickyTrapCount >= 6)
  ) {
    severity = "medium";
  }

  const directOrganismClaim =
    pestSeenText &&
    !/^(none|not seen|not confirmed|unknown|unsure|n\/a)$/i.test(pestSeenText);
  const evidenceChannels = [
    Boolean(leafDamageText),
    Boolean(distribution),
    Boolean(progression),
    Boolean(undersideText && !/not checked/i.test(undersideText)),
    stickyTrapCount !== null && Boolean(trapContext),
    Boolean(evidence.length),
    imagePerformed
  ].filter(Boolean).length;
  const confidence =
    leading?.score >= 6 && directOrganismClaim && evidenceChannels >= 4
      ? "high"
      : leading?.score >= 3 && evidenceChannels >= 2
        ? "medium"
        : "low";
  const supportingEvidence = unique([
    ...(leading?.evidence || []),
    ...evidence.map((item) => `User observation: ${item}.`),
    ...mediaAnalysis.evidenceUsed.map((item) => `Photo analysis: ${item}.`),
    affectedPercent !== null
      ? `${plantsAffected} of ${plantsChecked} checked plants were recorded as affected (${affectedPercent}%).`
      : "",
    stickyTrapCount !== null
      ? `Sticky-trap count entered: ${stickyTrapCount}${trapContext ? ` (${trapContext})` : ""}.`
      : ""
  ]);
  const counterEvidence = unique([
    !directOrganismClaim ? "No organism identity was directly confirmed." : "",
    includes(/clear|none seen|no pest|no eggs|no movement/, undersideText)
      ? `Underside inspection did not record confirming organisms: ${undersideText}.`
      : "",
    includes(/stable|not spreading|improving/, progression)
      ? `The pattern is not currently worsening: ${progression}.`
      : "",
    runnerUp
      ? `Competing pattern: ${runnerUp.organism} also matched part of the entered evidence.`
      : "",
    !leading
      ? "The entered pattern does not strongly match a supported local pest or disease rule."
      : ""
  ]);
  const missingInformation = unique([
    !cropContext ? "crop and growth stage" : "",
    !scoutLocation ? "specific scout location or zone" : "",
    plantsChecked === null || plantsAffected === null
      ? "plants checked and plants affected counts"
      : "",
    !distribution ? "symptom distribution across and within plants" : "",
    !progression ? "progression and time since the prior check" : "",
    !undersideText || /not checked/i.test(undersideText) ? "leaf-underside findings" : "",
    !magnification ? "magnification used and what it revealed" : "",
    stickyTrapCount === null ? "dated sticky-trap count, when relevant" : "",
    stickyTrapCount !== null && !trapContext
      ? "trap location, exposure time, color, and comparison count"
      : "",
    !environmentConditions ? "measured environment and root-zone conditions" : "",
    !imagePerformed
      ? "sharp whole-plant, damage-pattern, leaf-top, leaf-underside, and macro photos"
      : ""
  ]);
  const readinessStatus =
    leafDamageText && distribution && progression && evidenceChannels >= 4
      ? "ready_for_working_hypothesis"
      : leafDamageText || directOrganismClaim || evidence.length || imagePerformed
        ? "partial_evidence"
        : "insufficient_evidence";
  const readiness = {
    status: readinessStatus,
    completedEvidenceChannels: evidenceChannels,
    missingCount: missingInformation.length,
    summary:
      readinessStatus === "ready_for_working_hypothesis"
        ? "Enough independent scout fields are present to rank a working hypothesis; organism confirmation may still be missing."
        : "The tool can triage the pattern, but the missing checks limit confidence and treatment decisions."
  };
  const contributingConditions = unique([
    includes(/humid|high rh|leaf wet|condensation/, environmentConditions)
      ? "Recorded moisture or humidity may favor foliar disease pressure."
      : "",
    includes(/poor airflow|stagnant|dense canopy|crowd/, environmentConditions)
      ? "Recorded airflow or canopy density may increase pest/disease pressure."
      : "",
    includes(/hot|dry|low rh|water stress/, environmentConditions)
      ? "Recorded hot/dry or water-stress conditions can intensify mite-like injury or abiotic lookalikes."
      : "",
    includes(/wet media|saturated|overwater|algae/, environmentConditions)
      ? "Recorded wet root-zone conditions may support fungus gnats or root stress lookalikes."
      : "",
    recentActions ? `Recent action history must be considered: ${recentActions}.` : ""
  ]);
  const nextInspectionSteps = unique([
    !undersideText || /not checked/i.test(undersideText)
      ? "Inspect representative symptomatic and nearby healthy leaf undersides with 10–30x magnification."
      : "Repeat the same underside inspection on symptomatic and nearby healthy plants for comparison.",
    !imagePerformed
      ? "Capture a whole-plant view, the distribution pattern, both leaf surfaces, and a sharp macro of any organism or sign."
      : mediaAnalysis.quality !== "usable"
        ? "Retake limited photos in neutral light with sharp focus and a size reference."
        : "",
    stickyTrapCount === null || !trapContext
      ? "Record sticky-trap zone, color, exposure time, current count, and prior count."
      : "Recount the same dated trap position to measure direction of change.",
    plantsChecked === null || plantsAffected === null
      ? "Count plants checked and affected by zone before and after any response."
      : "Repeat the checked/affected count in the same zone after the selected interval.",
    leading?.issue === "disease_or_leaf_spot"
      ? "Compare lesions on new and old growth; consider extension or laboratory review when the pattern spreads or identity changes the response."
      : "Confirm eggs, immature stages, adults, frass, webbing, honeydew, or another discriminating sign before choosing controls."
  ]);
  const treatmentCategories = unique([
    "monitor",
    severity === "high" || (affectedPercent !== null && affectedPercent > 0)
      ? "isolate"
      : "",
    leading ? "sanitation" : "",
    includes(/flying|gnat|whitefl/, leading?.category, suspectedOrganism)
      ? "sticky traps"
      : "",
    directOrganismClaim ? "mechanical removal" : "",
    includes(/disease|mildew|spot/, suspectedIssue, suspectedOrganism) ||
    includes(/humid|leaf wet|poor airflow/, environmentConditions)
      ? "improve airflow"
      : "",
    includes(/humid|leaf wet|condensation/, environmentConditions)
      ? "reduce leaf wetness"
      : "",
    leading ? "consult label/extension" : "",
    leading?.issue === "disease_or_leaf_spot" ||
    (severity === "high" && confidence === "low")
      ? "professional testing"
      : ""
  ]);
  const recommendations = unique([
    `Treat ${suspectedOrganism} as a working hypothesis, not a confirmed identification.`,
    ...nextInspectionSteps.slice(0, 3),
    "Choose only from the displayed IPM categories after identity, crop safety, site legality, label directions, and re-entry/harvest restrictions are checked.",
    "Record the decision and repeat the same counts so the outcome can strengthen or reject this hypothesis."
  ]);
  const authorityCitations = [
    {
      sourceId: "uc-ipm",
      title: "Monitoring with Sticky Traps",
      organization: "UC Statewide Integrated Pest Management Program",
      url: "https://ipm.ucanr.edu/agriculture/floriculture-and-ornamental-nurseries/monitoring-with-sticky-traps/",
      supports:
        "Use traps as repeatable trend evidence with location/date context and combine them with direct plant inspection."
    },
    {
      sourceId: "extension-penn-state",
      title: "High Tunnel Vegetable Crops: Designing a Scouting Plan",
      organization: "Penn State Extension",
      url: "https://extension.psu.edu/high-tunnel-vegetable-crops-designing-a-scouting-plan",
      supports:
        "Use a standardized scouting plan and inspect plants directly because sticky cards do not represent every pest or life stage."
    }
  ];
  const inputSnapshot = {
    growId: input.growId || null,
    plantId: input.plantId || null,
    stage: input.stage || null,
    cropContext,
    scoutLocation,
    plantsChecked,
    plantsAffected,
    distribution,
    progression,
    pestSeen: pestSeenText,
    leafDamage: leafDamageText,
    undersideInspection: undersideText,
    magnification,
    stickyTrapCount,
    trapContext,
    environmentConditions,
    recentActions,
    evidence,
    additionalInformation,
    imageAnalysis: mediaAnalysis
  };
  const primarySummary = leading
    ? `${suspectedOrganism} is the leading ${confidence}-confidence working hypothesis from the structured scout. ${supportingEvidence[0] || "The pattern needs confirmation."} Confirm a discriminating sign before choosing a treatment.`
    : "The structured scout does not support a strong local pest or disease match yet. Continue the listed inspections and compare symptomatic plants with nearby healthy plants.";
  const primaryAnswer = {
    source: "growpathai_ipm_scout",
    suspectedIssue,
    suspectedOrganism,
    confidence,
    severity,
    answer: primarySummary,
    interpretation: primarySummary,
    supportingEvidence,
    counterEvidence,
    missingInformation,
    nextInspectionSteps
  };
  const gptVerificationPrompt = [
    "You are GrowPathAI's IPM verification assistant.",
    "Review the same IPM scout inputs and provide a second opinion.",
    "Treat attached image-analysis descriptions as structured evidence; this second pass does not inspect photo pixels.",
    "Do not recommend pesticide products or rates. Organism identity must be verified with photos, magnification, trap counts, and inspection notes before treatment decisions.",
    "Return suspected issue, suspected organism, confidence, severity, supporting evidence, counter-evidence, missing information, next inspection steps, safe treatment categories, and whether the GrowPathAI result agrees with your review.",
    `Scout input JSON: ${JSON.stringify(inputSnapshot)}`
  ].join("\n");
  const gptVerification = {
    provider: "gpt",
    providerLabel: "GPT structured IPM second opinion",
    status: "pending_gpt_review",
    secondaryAnswer: null,
    prompt: gptVerificationPrompt,
    inputSnapshot,
    requiredForTreatmentDecision: true,
    mediaAnalysisPerformed: false,
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
  const warnings = unique([
    "Verify IPM findings with magnification/photos and GPT second review before treatment decisions.",
    "This is an IPM working hypothesis, not a guaranteed diagnosis or pesticide recommendation.",
    severity === "high"
      ? "Pressure or progression was scored high. Separate affected material when appropriate and obtain a confirming identification promptly."
      : "",
    imageRequested && !imagePerformed
      ? "Photos are attached, but their pixels were not analyzed in this result."
      : "",
    stickyTrapCount !== null && !trapContext
      ? "The sticky-trap count lacks location/exposure context and cannot be compared reliably."
      : ""
  ]);
  return {
    suspectedIssue,
    suspectedOrganism,
    category: leading?.category || "unresolved pattern",
    confidence,
    severity,
    evidence,
    supportingEvidence,
    counterEvidence,
    missingInformation,
    contributingConditions,
    readiness,
    pressureSummary: {
      plantsChecked,
      plantsAffected,
      affectedPercent,
      stickyTrapCount,
      trapContext: trapContext || null,
      progression: progression || null
    },
    rankedCandidates: candidates.slice(0, 3).map((candidate) => ({
      suspectedIssue: candidate.issue,
      suspectedOrganism: candidate.organism,
      category: candidate.category,
      evidenceScore: candidate.score,
      evidence: candidate.evidence
    })),
    primaryAnswer,
    growPathAi: primaryAnswer,
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
    mediaAnalysis,
    methodIds: unique(["plant-diagnosis-etgu", ...stringArray(input.assistantMethodIds)]),
    sourceIds: unique([
      "growpath-method",
      "user-observation",
      "uc-ipm",
      "extension-penn-state",
      ...stringArray(input.assistantSourceIds)
    ]),
    citations: [
      ...authorityCitations,
      ...(Array.isArray(input.assistantCitations) ? input.assistantCitations : [])
    ],
    sourceRecords: authorityCitations,
    limitations: unique([
      ...mediaAnalysis.limitations,
      "Pattern matching cannot confirm organism identity, disease species, pesticide suitability, or legal use.",
      "Sticky-trap counts are trend evidence only when trap location, exposure time, and counting method are comparable."
    ]),
    warnings,
    nextInspectionSteps,
    recommendations,
    nonChemicalRecommendations: recommendations,
    treatmentCategories,
    treatmentCategory: treatmentCategories.join(", "),
    taskSuggestions: [
      {
        title: "Repeat IPM scout",
        dueInDays: severity === "high" ? 1 : 3,
        priority: severity === "high" ? "high" : "medium",
        sourceStage: "ipm_inspection",
        description: nextInspectionSteps.slice(0, 3).join(" ")
      },
      {
        title: "Document IPM evidence and treatment decision",
        dueInDays: severity === "high" ? 1 : 4,
        priority: severity === "high" ? "high" : "medium",
        sourceStage: "ipm_treatment_decision",
        description:
          "Save comparable counts, photos, confirmed identity evidence, selected treatment category, label/safety checks, and the source ToolRun."
      },
      {
        title: "Review IPM outcome",
        dueInDays: severity === "high" ? 3 : 7,
        priority: "medium",
        sourceStage: "ipm_outcome_review",
        description:
          "Repeat the same scout method and record whether pressure improved, remained stable, or worsened."
      }
    ],
    userDecision: {
      value: "not_decided",
      allowed: ["accepted", "uncertain", "rejected"],
      note: "Accepted means likely working hypothesis, not confirmed organism identity."
    }
  };
}

function calculateSpeciesCropIdentification(input = {}) {
  const commonName = String(
    input.userEnteredName ||
      input.commonName ||
      input.crop ||
      input.scientificName ||
      "unknown crop"
  ).trim();
  const scientificName = String(input.scientificName || "").trim();
  const cultivar = String(input.cultivar || input.strain || "").trim();
  const commonNames = Array.from(
    new Set([commonName, ...parseList(input.commonNames)].filter(Boolean))
  );
  const suppliedImageAnalysis =
    input.imageAnalysis && typeof input.imageAnalysis === "object"
      ? input.imageAnalysis
      : {};
  const imageAnalysis = {
    requested: suppliedImageAnalysis.requested === true,
    performed: suppliedImageAnalysis.performed === true,
    photoCount: Number.isFinite(Number(suppliedImageAnalysis.photoCount))
      ? Number(suppliedImageAnalysis.photoCount)
      : 0,
    provider: String(suppliedImageAnalysis.provider || "").trim() || null,
    providerLabel: String(suppliedImageAnalysis.providerLabel || "").trim() || null,
    confidence: ["high", "medium", "low"].includes(
      String(suppliedImageAnalysis.confidence || "").toLowerCase()
    )
      ? String(suppliedImageAnalysis.confidence).toLowerCase()
      : "low",
    quality: ["usable", "limited", "unusable"].includes(
      String(suppliedImageAnalysis.quality || "").toLowerCase()
    )
      ? String(suppliedImageAnalysis.quality).toLowerCase()
      : "limited",
    identifyingVisualTraits: String(
      suppliedImageAnalysis.identifyingVisualTraits || ""
    ).trim(),
    evidenceUsed: parseList(suppliedImageAnalysis.evidenceUsed),
    limitations: parseList(suppliedImageAnalysis.limitations)
  };
  const traits = [
    input.traits,
    input.identificationNotes,
    input.notes,
    imageAnalysis.identifyingVisualTraits
  ]
    .flatMap(parseList)
    .filter(Boolean);
  const confirmed =
    input.userConfirmed === true ||
    String(input.userConfirmed || "").toLowerCase() === "true";
  const recommendationContext = confirmed
    ? `Save ${commonName} as the confirmed crop identity before applying crop-specific targets.`
    : `Confirm ${commonName} identity before applying crop-specific diagnosis, nutrient, environment, or IPM guidance.`;
  return {
    likelyCrop: commonName,
    scientificName: scientificName || null,
    commonNames,
    cultivarOrStrain: cultivar || null,
    confidence: confirmed
      ? "user_confirmed"
      : imageAnalysis.performed
        ? imageAnalysis.confidence
        : traits.length >= 3
          ? "medium"
          : "low",
    confirmationRequired: !confirmed,
    userConfirmationRequired: !confirmed,
    recommendationContext,
    imageAnalysis,
    cropProfileSuggestion: {
      commonName,
      scientificName: scientificName || null,
      commonNames,
      cultivarOrStrain: cultivar || null,
      traits,
      source: confirmed
        ? "user_confirmed"
        : imageAnalysis.performed
          ? "ai_vision_draft"
          : "user_entered"
    },
    warnings: [
      ...(!confirmed
        ? ["Confirm crop identity before relying on crop-specific recommendations."]
        : []),
      ...(imageAnalysis.requested && !imageAnalysis.performed
        ? ["Uploaded photo pixels were not analyzed by the active provider."]
        : [])
    ],
    recommendations: [
      "Attach this identity to the plant or grow profile once confirmed.",
      imageAnalysis.performed
        ? "Compare the visible flower, leaf, stem, and growth traits with another clear view before confirmation."
        : "Use photos, breeder/source notes, leaf structure, growth habit, and flowering behavior as supporting evidence."
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
  const trichomeInputsComplete = [
    input.cloudyPercent,
    input.amberPercent,
    input.clearPercent
  ].every(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );
  const cloudyPercent = trichomeInputsComplete
    ? Math.max(0, number(input.cloudyPercent, "Cloudy percent"))
    : null;
  const amberPercent = trichomeInputsComplete
    ? Math.max(0, number(input.amberPercent, "Amber percent"))
    : null;
  const clearPercent = trichomeInputsComplete
    ? Math.max(0, number(input.clearPercent, "Clear percent"))
    : null;
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
  if (!trichomeInputsComplete) {
    warnings.push(
      "Trichome percentages are missing. Enter confirmed manual observations or use usable macro-photo analysis before relying on harvest timing."
    );
  }
  if (trichomeInputsComplete && remaining <= 10 && cloudyPercent >= 50)
    readinessStatus = "checking_window";
  if (
    trichomeInputsComplete &&
    remaining <= 3 &&
    cloudyPercent >= 60 &&
    amberPercent >= 5
  )
    readinessStatus = "ready_soon";
  if (trichomeInputsComplete && clearPercent > 25) readinessStatus = "not_ready";
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
      observation: trichomeInputsComplete
        ? `${cloudyPercent}% cloudy, ${amberPercent}% amber, ${clearPercent}% clear`
        : "Not entered",
      interpretation: !trichomeInputsComplete
        ? "Trichome evidence is missing; no maturity inference was made from trichomes."
        : clearPercent > 25
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
    trichomeInterpretation: !trichomeInputsComplete
      ? "Trichome evidence is missing. Add confirmed manual values or usable macro-photo analysis."
      : clearPercent > 25
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
      sampleLocation,
      evidenceStatus: trichomeInputsComplete ? "entered" : "missing"
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
      !trichomeInputsComplete
        ? "Capture usable macro photos or enter confirmed manual trichome observations before making a trichome-based harvest decision."
        : clearPercent > 25
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
  const recipeUseRate =
    input.recipeUseRate == null || input.recipeUseRate === ""
      ? null
      : Math.max(0, number(input.recipeUseRate, "Recipe use rate"));
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
    recipeAvailability: recipeUseRate ? Math.floor(quantity / recipeUseRate) : null,
    costPerUse: recipeUseRate ? Number((cost * recipeUseRate).toFixed(2)) : null,
    reorderSuggestions: lowStock
      ? [{ title: `Reorder ${input.name || "item"}`, dueInDays: 1, priority: "medium" }]
      : []
  };
}

function calculateCropSteeringProject(input = {}) {
  const dryback = optionalNumber(input.drybackPercent, "Dryback percent");
  const runoffEC = optionalNumber(input.runoffEC, "Runoff EC");
  const inputEC = optionalNumber(input.inputEC, "Input EC");
  const inputPH = optionalNumber(input.inputPH, "Input pH");
  const runoffPH = optionalNumber(input.runoffPH, "Runoff pH");
  const recoveryHours = optionalNumber(input.recoveryHours, "Recovery hours");
  const dli = optionalNumber(input.dli, "DLI");
  const ppfd = optionalNumber(input.ppfd ?? input.lightIntensity, "PPFD");
  const vpd = optionalNumber(input.vpd, "VPD");
  const airTemperature = optionalNumber(
    input.airTemperature ?? input.temperature,
    "Air temperature"
  );
  const relativeHumidity = optionalNumber(
    input.relativeHumidity ?? input.humidity,
    "Relative humidity"
  );
  const leafTemperature = optionalNumber(input.leafTemperature, "Leaf temperature");
  const co2 = optionalNumber(input.co2 ?? input.co2Ppm, "CO2");
  const responseText = String(input.plantResponse || input.response || "").toLowerCase();
  const recordedStage = String(input.stage || "").trim();
  const recordedPhase = String(input.phase || "").trim();
  const stage = recordedStage.toLowerCase();
  const goal = String(input.steeringIntent || input.steeringGoal || "").toLowerCase();
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
  const hasPressureEvidence =
    dryback != null ||
    inputEC != null ||
    runoffEC != null ||
    inputPH != null ||
    runoffPH != null ||
    recoveryHours != null ||
    Boolean(responseText.trim()) ||
    dli != null ||
    ppfd != null ||
    vpd != null;
  const pressureLevel = !hasPressureEvidence
    ? "insufficient_data"
    : pressureScore >= 5
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
    pressureLevel === "insufficient_data"
      ? "insufficient_data"
      : plantResponse === "positive" && pressureLevel !== "excessive"
        ? "useful_or_tolerated"
        : plantResponse === "negative" || pressureLevel === "excessive"
          ? "exceeded_useful_steering"
          : "monitor_before_increasing_pressure";
  const steeringIntent = !goal
    ? "not_recorded"
    : /recovery/.test(goal)
      ? "recovery"
      : /ripening|finish/.test(goal)
        ? "ripening"
        : /vegetative|veg|rooting|mother/.test(goal)
          ? "vegetative"
          : /generative|flower|stacking|resin/.test(goal)
            ? "generative"
            : "balanced";
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
  const lightPressureRecorded =
    ppfd != null ||
    /increase|raised|higher|dim|lower|reduced/.test(
      String(input.lightChange || "").toLowerCase()
    );
  const phenoTags = [];
  if (plantResponse === "positive" && dryback != null && dryback >= 20)
    phenoTags.push("dryback_tolerant");
  if (plantResponse === "negative" && dryback != null && dryback >= 20)
    phenoTags.push("dryback_sensitive");
  if (plantResponse === "positive" && lightPressureRecorded)
    phenoTags.push("high_light_tolerant");
  if (plantResponse === "negative" && lightPressureRecorded)
    phenoTags.push("light_sensitive");
  if (
    plantResponse === "positive" &&
    inputEC != null &&
    runoffEC != null &&
    runoffEC <= inputEC * 1.35
  )
    phenoTags.push("ec_tolerant");
  if (warnings.some((warning) => /runoff EC|burn/i.test(warning)))
    phenoTags.push("ec_sensitive");
  if (inputPH != null && runoffPH != null && Math.abs(runoffPH - inputPH) >= 0.5)
    phenoTags.push("ph_sensitive");
  if (recoveryStatus === "recovered") phenoTags.push("recovery_strong");
  if (recoveryStatus === "poor_recovery") phenoTags.push("recovery_poor");
  if (plantResponse === "positive" && steeringIntent === "generative")
    phenoTags.push("generative_steering_candidate");
  if (plantResponse === "positive" && steeringIntent === "vegetative")
    phenoTags.push("vegetative_recovery_candidate");

  const missingInformation = [];
  if (!input.projectId) missingInformation.push("crop steering project");
  if (!recordedStage) missingInformation.push("stage");
  if (!goal) missingInformation.push("steering intent");
  if (dryback == null) missingInformation.push("dryback measurement");
  if (!String(input.irrigationTiming || "").trim())
    missingInformation.push("irrigation timing");
  if (vpd == null && relativeHumidity == null)
    missingInformation.push("VPD or relative humidity");
  if (dli == null && ppfd == null) missingInformation.push("DLI or PPFD");
  if (inputEC == null && runoffEC == null) missingInformation.push("input or runoff EC");
  if (inputPH == null && runoffPH == null) missingInformation.push("input or runoff pH");
  if (!responseText.trim()) missingInformation.push("plant response observation");
  const assessmentStatus = !hasPressureEvidence
    ? "insufficient_data"
    : recoveryStatus === "poor_recovery"
      ? "pressure_exceeded"
      : recoveryStatus === "recovered"
        ? "response_recorded"
        : "response_pending";
  const tasksToCreate = [
    {
      title:
        plantResponse === "negative" || pressureLevel === "excessive"
          ? "Return to recovery steering"
          : "Check plant recovery",
      dueInDays: 1,
      priority: plantResponse === "negative" || warnings.length ? "high" : "medium",
      sourceStage: "crop_steering_recovery",
      description:
        "Recheck the same plant after the next light and irrigation cycle; record posture, wilt, new damage, and recovery time."
    },
    ...(dryback != null
      ? [
          {
            title: "Recheck dryback before irrigation",
            dueInDays: 1,
            priority: ["high", "excessive"].includes(pressureLevel) ? "high" : "medium",
            sourceStage: "crop_steering_dryback",
            description:
              "Measure dryback using the same method before changing irrigation timing or steering pressure."
          }
        ]
      : []),
    ...(runoffEC != null || runoffPH != null
      ? [
          {
            title: "Check runoff EC and pH trend",
            dueInDays: 2,
            priority: warnings.length ? "high" : "medium",
            sourceStage: "crop_steering_root_zone",
            description:
              "Repeat calibrated input/runoff measurements and compare sampling method, volume, recipe, and root-zone condition."
          }
        ]
      : []),
    ...(lightPressureRecorded
      ? [
          {
            title: "Check light stress and new growth",
            dueInDays: 1,
            priority: plantResponse === "negative" ? "high" : "medium",
            sourceStage: "crop_steering_light_response",
            description:
              "Photograph the same plant and record leaf angle, bleaching, curl, temperature, and PPFD/DLI before another increase."
          }
        ]
      : [])
  ];
  return {
    projectId: input.projectId || null,
    projectName: input.projectName || null,
    assessmentStatus,
    steeringIntent,
    steeringGoal: steeringIntent,
    stage: recordedStage || null,
    medium: input.medium || null,
    plantResponse,
    observedResponse: input.plantResponse || null,
    pressureLevel,
    recoveryStatus,
    steeringOutcome,
    phenoImpact,
    phase: recordedPhase || recordedStage || null,
    dryback: dryback == null ? null : { actualPercent: dryback },
    rootzone: {
      inputEC,
      runoffEC,
      inputPH,
      runoffPH
    },
    environment: {
      dli,
      ppfd,
      vpd,
      airTemperature,
      relativeHumidity,
      leafTemperature,
      co2,
      temperatureUnit: input.temperatureUnit || null,
      irrigationTiming: input.irrigationTiming || null
    },
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
    phenoTags: Array.from(new Set(phenoTags)),
    tasksToCreate,
    missingInformation,
    limitations: [
      "A single steering entry cannot establish cultivar tolerance; compare repeated entries and final quality outcomes.",
      "VPD, PPFD/DLI, EC, pH, and dryback readings depend on calibrated instruments, consistent placement, and repeatable sampling.",
      "Pressure should not be increased while recovery is poor, measurements are missing, or stress remains unresolved."
    ],
    methodIds: ["crop-steering", "soil-nutrients"],
    sourceIds: [],
    logSummary: `${steeringIntent} steering at ${pressureLevel} pressure with ${plantResponse} plant response.`
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
