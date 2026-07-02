export const CALCULATOR_VERSIONS: Record<string, string> = {
  vpd: "vpd-2026.06",
  ppfd: "ppfd-dli-2026.06",
  "ppfd-dli": "ppfd-dli-2026.06",
  watering: "watering-heuristic-2026.06",
  "dew-point-guard": "dew-point-guard-2026.06",
  "bud-rot-risk": "bud-rot-risk-heuristic-2026.06",
  "npk-recipe": "npk-recipe-chemistry-2026.06",
  "nutrient-chemistry": "nutrient-chemistry-2026.06",
  "nutrient-source-comparison": "nutrient-source-comparison-2026.07",
  "ph-ec-check": "ph-ec-range-check-2026.07",
  "topdress-plan": "topdress-plan-2026.07",
  "dry-amendment-mix": "dry-amendment-mix-2026.07",
  "dry-cure-guard": "dry-cure-guard-2026.07",
  "soil-builder": "soil-builder-2026.07",
  "environment-analysis": "environment-analysis-2026.06",
  "feeding-schedule": "feeding-schedule-2026.06",
  "harvest-estimator": "advanced-planning-v1",
  "pheno-matrix": "pheno-matrix-v1",
  "timeline-planner": "timeline-planner-2026.06",
  "pdf-export": "pdf-export-2026.06"
};

export function getCalculatorVersion(toolKey?: string, fallback = "1") {
  const normalized = String(toolKey || "").trim();
  return CALCULATOR_VERSIONS[normalized] || fallback;
}
