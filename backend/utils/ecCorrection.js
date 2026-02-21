"use strict";

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return value;
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

function computeDilution({ currentEC, targetEC, reservoirVolumeL }) {
  const action = "dilute";
  const assumptions = ["Assumes added water EC ~ 0"];

  if (typeof reservoirVolumeL === "number" && reservoirVolumeL > 0) {
    const waterAddL = reservoirVolumeL * (currentEC / targetEC - 1);
    const finalVolumeL = reservoirVolumeL + waterAddL;
    return {
      action,
      waterAddL: round(waterAddL, 3),
      finalVolumeL: round(finalVolumeL, 3),
      confidence: "high",
      assumptions
    };
  }

  // ratio-only guidance if no volume
  const fractionToKeep = targetEC / currentEC;
  return {
    action,
    fractionToKeep: round(fractionToKeep, 3),
    confidence: "medium",
    assumptions: assumptions.concat(["No reservoir volume provided; ratio guidance only"])
  };
}

function computeIncrease({
  currentEC,
  targetEC,
  reservoirVolumeL,
  ecPerMlPerL,
  ecPerGramPerL
}) {
  const action = "increase";
  const delta = targetEC - currentEC;
  const assumptions = [];

  if (typeof ecPerMlPerL === "number" && ecPerMlPerL > 0) {
    const mlPerL = delta / ecPerMlPerL;
    const totalMl =
      typeof reservoirVolumeL === "number" && reservoirVolumeL > 0
        ? mlPerL * reservoirVolumeL
        : null;
    return {
      action,
      mlPerL: round(mlPerL, 3),
      totalMl: totalMl == null ? null : round(totalMl, 2),
      confidence: reservoirVolumeL ? "high" : "medium",
      assumptions
    };
  }

  if (typeof ecPerGramPerL === "number" && ecPerGramPerL > 0) {
    const gPerL = delta / ecPerGramPerL;
    const totalG =
      typeof reservoirVolumeL === "number" && reservoirVolumeL > 0
        ? gPerL * reservoirVolumeL
        : null;
    return {
      action,
      gPerL: round(gPerL, 3),
      totalG: totalG == null ? null : round(totalG, 2),
      confidence: reservoirVolumeL ? "high" : "medium",
      assumptions
    };
  }

  assumptions.push("No calibration coefficient provided (ecPerMlPerL or ecPerGramPerL)");
  return {
    action,
    confidence: "low",
    assumptions
  };
}

function computeEcCorrection(args) {
  const {
    currentEC,
    targetEC,
    reservoirVolumeL,
    ecPerMlPerL,
    ecPerGramPerL,
    tolerance = 0.05
  } = args;

  const deltaEC = targetEC - currentEC;
  const absDelta = Math.abs(deltaEC);

  if (absDelta <= tolerance) {
    return {
      action: "no_change",
      confidence: "high",
      assumptions: [],
      notes: `ΔEC ${round(absDelta, 3)} within tolerance ${tolerance}`
    };
  }

  if (deltaEC < 0) {
    return computeDilution({ currentEC, targetEC, reservoirVolumeL });
  }

  return computeIncrease({
    currentEC,
    targetEC,
    reservoirVolumeL,
    ecPerMlPerL,
    ecPerGramPerL
  });
}

module.exports = { computeEcCorrection };
