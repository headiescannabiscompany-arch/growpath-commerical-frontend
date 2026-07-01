type GrowthProfile = {
  sizeMetrics?: Record<string, any>;
  waterUseProfile?: Record<string, any>;
} | null;

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

export function buildWateringEstimate({
  potLiters,
  runoffPct,
  intervalDays,
  plantGrowthProfile
}: {
  potLiters: number;
  runoffPct: number;
  intervalDays: number;
  plantGrowthProfile?: GrowthProfile;
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
  const plantFactor = Number(
    (canopyFactor(canopyWidthCm || undefined) * demandFactor(observedDemand)).toFixed(2)
  );
  const base = liters * 0.22;
  const target = base * plantFactor * (1 + runoff / 100);
  return {
    targetLiters: target.toFixed(2),
    perWeekLiters: (target * (7 / interval)).toFixed(2),
    plantAdjustmentFactor: plantFactor,
    plantAdjustmentLabel:
      plantFactor === 1
        ? "none"
        : `${plantFactor > 1 ? "+" : ""}${Math.round((plantFactor - 1) * 100)}%`,
    plantContextApplied: plantFactor !== 1,
    plantContextReasons: [
      canopyWidthCm ? `canopy ${canopyWidthCm} cm` : "",
      observedDemand ? `observed water demand ${observedDemand}` : ""
    ].filter(Boolean)
  };
}
