type GrowthProfile = {
  confirmationStatus?: string;
  sizeMetrics?: Record<string, any>;
  waterUseProfile?: Record<string, any>;
} | null;

const CONFIRMED_STATUSES = new Set(["user_confirmed", "reviewed", "verified"]);

function demandFactor(value?: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "high") return 1.2;
  if (normalized === "low") return 0.85;
  return 1;
}

function canopyFactor(widthCm?: number) {
  if (!Number.isFinite(widthCm || NaN)) return 1;
  if ((widthCm || 0) >= 120) return 1.15;
  if ((widthCm || 0) <= 45) return 0.85;
  return 1;
}

function isConfirmed(profile?: GrowthProfile) {
  return CONFIRMED_STATUSES.has(String(profile?.confirmationStatus || "").toLowerCase());
}

export function buildWateringEstimate({
  potLiters,
  runoffPct,
  intervalDays,
  plantGrowthProfile,
  medium = "soil",
  stage = "veg",
  targetDrybackPercent,
  actualDrybackPercent,
  vpdKpa,
  recentRunoffPct,
  recoveryTimeHours,
  leafResponse
}: {
  potLiters: number;
  runoffPct: number;
  intervalDays: number;
  plantGrowthProfile?: GrowthProfile;
  medium?: string;
  stage?: string;
  targetDrybackPercent?: number;
  actualDrybackPercent?: number;
  vpdKpa?: number;
  recentRunoffPct?: number;
  recoveryTimeHours?: number;
  leafResponse?: string;
}) {
  const liters = Math.max(0, Number.isFinite(potLiters) ? potLiters : 0);
  const runoff = Math.max(0, Number.isFinite(runoffPct) ? runoffPct : 0);
  const interval = Math.max(
    1,
    Math.round(Number.isFinite(intervalDays) ? intervalDays : 1)
  );
  const sizeMetrics = plantGrowthProfile?.sizeMetrics || {};
  const waterUseProfile = plantGrowthProfile?.waterUseProfile || {};
  const canopyWidthCm = Number(sizeMetrics.canopyWidthCm || sizeMetrics.canopyCm || 0);
  const observedDemand = String(
    waterUseProfile.observedDemand ||
      waterUseProfile.waterDemand ||
      waterUseProfile.demand ||
      ""
  );
  const rawPlantFactor = Number(
    (canopyFactor(canopyWidthCm || undefined) * demandFactor(observedDemand)).toFixed(2)
  );
  const normalizedMedium = String(medium || "soil").toLowerCase();
  const normalizedStage = String(stage || "veg").toLowerCase();
  const mediumFactor = normalizedMedium.includes("coco")
    ? 1.18
    : normalizedMedium.includes("living")
      ? 0.82
      : normalizedMedium.includes("peat")
        ? 1.05
        : normalizedMedium.includes("hydro")
          ? 1.25
          : 1;
  const stageFactor = /seed|clone/.test(normalizedStage)
    ? 0.55
    : /late|ripen|finish/.test(normalizedStage)
      ? 0.9
      : /flower|bloom/.test(normalizedStage)
        ? 1.08
        : 1;
  const numericVpd = Number(vpdKpa);
  const environmentFactor = Number.isFinite(numericVpd)
    ? numericVpd > 1.5
      ? 1.12
      : numericVpd < 0.8
        ? 0.9
        : 1
    : 1;
  const hasPlantOverlay = Boolean(canopyWidthCm || observedDemand);
  const confirmed = isConfirmed(plantGrowthProfile);
  const plantFactor = confirmed ? rawPlantFactor : 1;
  const base = liters * 0.22;
  const target = base * plantFactor * mediumFactor * stageFactor * environmentFactor * (1 + runoff / 100);
  const numericTargetDryback = Number(targetDrybackPercent);
  const numericActualDryback = Number(actualDrybackPercent);
  const numericRunoff = Number(recentRunoffPct);
  const numericRecovery = Number(recoveryTimeHours);
  const normalizedLeafResponse = String(leafResponse || "").toLowerCase();
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const factors: string[] = [];
  let pressureScore = 0;

  if (mediumFactor !== 1) factors.push(`medium ${normalizedMedium}`);
  if (stageFactor !== 1) factors.push(`stage ${normalizedStage}`);
  if (environmentFactor !== 1) factors.push(`VPD ${numericVpd} kPa`);

  if (Number.isFinite(numericTargetDryback) && /seed|clone/.test(normalizedStage) && numericTargetDryback > 12) {
    warnings.push("Fresh clones and seedlings should avoid hard drybacks.");
  }
  if (Number.isFinite(numericActualDryback) && Number.isFinite(numericTargetDryback)) {
    if (numericActualDryback > numericTargetDryback + 8) {
      pressureScore += 2;
      warnings.push("Actual dryback exceeded the target by a meaningful margin.");
    } else if (numericActualDryback > numericTargetDryback) {
      pressureScore += 1;
    }
  }
  if (Number.isFinite(numericActualDryback) && numericActualDryback >= 30) {
    pressureScore += 2;
    warnings.push("Dryback is high enough to treat as steering pressure, not routine watering.");
  }
  if (Number.isFinite(numericRunoff)) {
    if (numericRunoff <= 2 && /coco|hydro|salt/.test(normalizedMedium)) {
      warnings.push("Very low runoff in coco/salt-style systems can increase salt buildup risk.");
    }
    if (numericRunoff >= 25 && /living|soil/.test(normalizedMedium)) {
      warnings.push("High runoff in soil/living soil can leach nutrients and biology-sensitive inputs.");
    }
  }
  if (Number.isFinite(numericVpd)) {
    if (numericVpd > 1.6) warnings.push("High VPD can speed dryback and increase irrigation demand.");
    if (numericVpd < 0.7) warnings.push("Low VPD can slow transpiration and make overwatering easier.");
  }
  if (Number.isFinite(numericRecovery)) {
    if (numericRecovery > 24) {
      pressureScore += 2;
      warnings.push("Recovery longer than 24 hours suggests the previous dryback or irrigation pressure was too high.");
    } else if (numericRecovery > 12) {
      pressureScore += 1;
    }
  }
  if (/wilt|severe|stall|damage/.test(normalizedLeafResponse)) {
    pressureScore += 2;
    warnings.push("Leaf response suggests this watering/dryback pattern may be causing stress damage.");
  } else if (/droop/.test(normalizedLeafResponse)) {
    pressureScore += 1;
  }

  const pressureLevel = pressureScore >= 4 ? "high" : pressureScore >= 2 ? "moderate" : "low";
  const wateringIntent = /seed|clone|veg|recovery/.test(normalizedStage)
    ? "vegetative_or_recovery"
    : /late|ripen|finish/.test(normalizedStage)
      ? "ripening"
      : "generative";

  recommendations.push(
    pressureLevel === "high"
      ? "Reduce dryback or stabilize irrigation until the plant recovers quickly again."
      : pressureLevel === "moderate"
        ? "Hold this range and verify next-morning recovery before increasing pressure."
        : "Use this as a starting volume and adjust from pot weight, dryback speed, runoff, and plant response."
  );
  if (wateringIntent === "generative") {
    recommendations.push("For generative irrigation, track recovery time and stretch/bud response before tightening drybacks.");
  }
  if (wateringIntent === "vegetative_or_recovery") {
    recommendations.push("For veg/recovery, prioritize stable moisture, turgor, and root growth over hard dryback pressure.");
  }
  return {
    targetLiters: target.toFixed(2),
    perWeekLiters: (target * (7 / interval)).toFixed(2),
    medium: normalizedMedium,
    stage: normalizedStage,
    wateringIntent,
    pressureLevel,
    targetDrybackPercent: Number.isFinite(numericTargetDryback) ? numericTargetDryback : null,
    actualDrybackPercent: Number.isFinite(numericActualDryback) ? numericActualDryback : null,
    recentRunoffPct: Number.isFinite(numericRunoff) ? numericRunoff : null,
    recoveryTimeHours: Number.isFinite(numericRecovery) ? numericRecovery : null,
    plantAdjustmentFactor: plantFactor,
    plantAdjustmentLabel:
      plantFactor === 1
        ? "none"
        : `${plantFactor > 1 ? "+" : ""}${Math.round((plantFactor - 1) * 100)}%`,
    plantContextApplied: plantFactor !== 1,
    plantContextRequiresConfirmation: hasPlantOverlay && !confirmed,
    plantContextReasons: [
      canopyWidthCm ? `canopy ${canopyWidthCm} cm` : "",
      observedDemand ? `observed water demand ${observedDemand}` : ""
    ].filter(Boolean),
    environmentalAdjustmentReasons: factors,
    warnings,
    recommendations,
    tasksToCreate:
      pressureLevel === "high"
        ? [
            {
              title: "Check plant recovery after watering",
              priority: "high"
            }
          ]
        : [
            {
              title: "Recheck pot weight and dryback",
              priority: "medium"
            }
          ]
  };
}
