type FeedingScheduleRow = {
  week?: number | string;
  stage?: string;
  amount?: string;
  notes?: string;
  feed?: {
    amountPerGallon?: string;
  };
};

export function reviewFeedingSchedule({
  schedule,
  medium,
  stage,
  productName,
  inputEC,
  runoffEC,
  inputPH,
  runoffPH,
  waterSource
}: {
  schedule: FeedingScheduleRow[];
  medium: string;
  stage: string;
  productName: string;
  inputEC?: number;
  runoffEC?: number;
  inputPH?: number;
  runoffPH?: number;
  waterSource?: string;
}) {
  const normalizedMedium = String(medium || "unknown").toLowerCase();
  const normalizedStage = String(stage || "unknown").toLowerCase();
  const normalizedWaterSource = String(waterSource || "").toLowerCase();
  const rows = Array.isArray(schedule) ? schedule : [];
  const scheduleText = rows
    .map(
      (row) =>
        `${row.stage || ""} ${row.amount || ""} ${row.feed?.amountPerGallon || ""} ${row.notes || ""}`
    )
    .join(" ")
    .toLowerCase();
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  if (!rows.length) {
    warnings.push("No schedule rows were provided for review.");
    riskScore += 1;
  }
  if (/seed|clone/.test(normalizedStage) && /full|heavy|strong|bloom|pk|booster|high/.test(scheduleText)) {
    warnings.push("Seedling/clone stage should avoid aggressive feed, bloom boosters, and high EC schedules.");
    riskScore += 2;
  }
  if (/late|ripen|finish/.test(normalizedStage) && /heavy|high|nitrogen|grow|veg/.test(scheduleText)) {
    warnings.push("Late flower/ripening schedules should avoid heavy late nitrogen or high EC unless intentionally justified.");
    riskScore += 2;
  }
  if (/coco|hydro/.test(normalizedMedium)) {
    warnings.push("Coco/hydro-style feeding should track runoff or root-zone EC trends, not just input schedule.");
    riskScore += 1;
  }
  if (/living|soil/.test(normalizedMedium) && /daily|every watering|strong/.test(scheduleText)) {
    warnings.push("Soil/living soil feeding should consider biology, topdress timing, and EC buildup before applying strong frequent feed.");
    riskScore += 1;
  }
  if (Number.isFinite(inputEC) && Number(inputEC) > 2.4) {
    warnings.push("Input EC is high for many cultivars/stages. Confirm tolerance before applying.");
    riskScore += 2;
  }
  if (
    Number.isFinite(inputEC) &&
    Number.isFinite(runoffEC) &&
    Number(runoffEC) > Number(inputEC) * 1.35
  ) {
    warnings.push("Runoff EC is materially higher than input EC; review buildup before increasing feed.");
    riskScore += 2;
  }
  if (Number.isFinite(inputPH) && (Number(inputPH) < 5.5 || Number(inputPH) > 6.8)) {
    warnings.push("Input pH is outside a common fertigation target range. Verify medium-specific targets.");
    riskScore += 1;
  }
  if (
    Number.isFinite(inputPH) &&
    Number.isFinite(runoffPH) &&
    Math.abs(Number(runoffPH) - Number(inputPH)) > 0.4
  ) {
    warnings.push("Runoff pH drift is large enough to trend before changing feed strength.");
    riskScore += 1;
  }
  if (normalizedWaterSource === "ro") {
    warnings.push("RO water has low buffering. Calcium/magnesium and alkalinity context matter.");
  }
  if (/city|well|tap/.test(normalizedWaterSource)) {
    warnings.push("City/well water may contain alkalinity or minerals that change pH/EC interpretation.");
  }

  const riskLevel = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";
  recommendations.push(
    warnings.length
      ? "Review EC, pH, runoff, dryback, and plant response before applying this schedule as written."
      : "Use this as a planned schedule and keep logging EC, pH, runoff, dryback, and plant response."
  );
  recommendations.push("Do not treat a generated schedule as a product label replacement.");

  return {
    productName: productName || "Nutrient line",
    medium: normalizedMedium,
    stage: normalizedStage,
    riskLevel,
    rowCount: rows.length,
    warnings: Array.from(new Set(warnings)),
    recommendations,
    tasksToCreate: [
      {
        title: riskLevel === "high" ? "Review feeding schedule before applying" : "Check plant response after feeding",
        priority: riskLevel === "high" ? "high" : "medium"
      },
      {
        title: "Log input EC/pH and runoff after next feed",
        priority: "medium"
      }
    ]
  };
}
