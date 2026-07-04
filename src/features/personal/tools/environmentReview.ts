function dewPointC(tempC: number, rh: number) {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(Math.max(1, Math.min(100, rh)) / 100);
  return (b * alpha) / (a - alpha);
}

export function reviewEnvironmentReadings({
  stage,
  tempDayC,
  tempNightC,
  humidity,
  vpd,
  ppfd,
  dli,
  co2,
  lightHours
}: {
  stage: string;
  tempDayC?: number;
  tempNightC?: number;
  humidity?: number;
  vpd?: number;
  ppfd?: number;
  dli?: number;
  co2?: number;
  lightHours?: number;
}) {
  const normalizedStage = String(stage || "unknown").toLowerCase();
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;
  const dewPoint =
    Number.isFinite(tempDayC) && Number.isFinite(humidity)
      ? Number(dewPointC(Number(tempDayC), Number(humidity)).toFixed(1))
      : null;
  const dewPointSpread =
    dewPoint != null && Number.isFinite(tempDayC)
      ? Number((Number(tempDayC) - dewPoint).toFixed(1))
      : null;

  if (Number.isFinite(humidity) && Number(humidity) >= 70 && /flower|late|ripen|finish/.test(normalizedStage)) {
    warnings.push("High humidity in flower increases mold and bud rot risk.");
    riskScore += 2;
  }
  if (dewPointSpread != null && dewPointSpread <= 4.5 && /flower|late|ripen|finish/.test(normalizedStage)) {
    warnings.push("Dew point spread is tight; inspect dense canopy and flower surfaces.");
    riskScore += 2;
  }
  if (Number.isFinite(vpd) && Number(vpd) < 0.7) {
    warnings.push("Low VPD can reduce transpiration and contribute to calcium-transport symptoms.");
    riskScore += 1;
  }
  if (Number.isFinite(vpd) && Number(vpd) > 1.6) {
    warnings.push("High VPD can increase dryback speed and irrigation demand.");
    riskScore += 1;
  }
  if (Number.isFinite(ppfd) && /seed|clone/.test(normalizedStage) && Number(ppfd) > 300) {
    warnings.push("Seedlings/clones may be under too much light for stable rooting and early growth.");
    riskScore += 2;
  }
  if (Number.isFinite(dli) && /late|ripen|finish/.test(normalizedStage) && Number(dli) > 45) {
    warnings.push("Very high DLI late flower can add heat/light pressure and reduce finish quality if plants are not tolerating it.");
    riskScore += 1;
  }
  if (Number.isFinite(tempDayC) && Number.isFinite(tempNightC) && Math.abs(Number(tempDayC) - Number(tempNightC)) > 8) {
    warnings.push("Large day/night temperature swings can complicate VPD, color, uptake, and condensation risk.");
    riskScore += 1;
  }
  if (Number.isFinite(co2) && Number(co2) > 1000 && Number.isFinite(ppfd) && Number(ppfd) < 600) {
    warnings.push("Elevated CO2 has limited value if light intensity is not also high enough.");
    riskScore += 1;
  }
  if (Number.isFinite(lightHours) && /flower|late|ripen|finish/.test(normalizedStage) && Number(lightHours) > 13) {
    warnings.push("Flowering photoperiod appears long; verify crop type, genetics, and light schedule.");
    riskScore += 2;
  }

  const riskLevel = riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";
  recommendations.push(
    riskLevel === "high"
      ? "Stabilize environment before adding more feed, light, or dryback pressure."
      : "Trend readings with plant response before making large environmental changes."
  );
  recommendations.push("Confirm sensor placement at canopy level and compare readings across the room.");

  return {
    stage: normalizedStage,
    riskLevel,
    dewPointC: dewPoint,
    dewPointSpreadC: dewPointSpread,
    warnings: Array.from(new Set(warnings)),
    recommendations,
    tasksToCreate: [
      {
        title: riskLevel === "high" ? "Inspect environment risk zones" : "Recheck environment readings",
        priority: riskLevel === "high" ? "high" : "medium"
      }
    ]
  };
}
