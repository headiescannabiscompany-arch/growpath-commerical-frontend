export function reportToText(report: any): string {
  if (!report) return "";

  const lines: string[] = [];
  lines.push(String(report.title || "Weekly Compliance Report"));
  lines.push("");

  if (report.period?.start && report.period?.end) {
    lines.push(`Period: ${report.period.start} → ${report.period.end}`);
    lines.push("");
  }

  if (report.executiveSummary) {
    lines.push("Executive Summary");
    lines.push(String(report.executiveSummary));
    lines.push("");
  }

  if (Array.isArray(report.metrics) && report.metrics.length) {
    lines.push("Key Metrics");
    report.metrics.forEach((m: any) => {
      const delta = m.delta ? ` (Δ ${m.delta})` : "";
      lines.push(`- ${m.label}: ${m.value}${delta}`);
    });
    lines.push("");
  }

  if (Array.isArray(report.risks) && report.risks.length) {
    lines.push("Top Risks");
    report.risks.forEach((r: any) => lines.push(`- ${String(r)}`));
    lines.push("");
  }

  if (Array.isArray(report.recommendedActions) && report.recommendedActions.length) {
    lines.push("Recommended Actions");
    report.recommendedActions.forEach((a: any) => {
      lines.push(
        `- ${String(a.label || "Action")}${a.targetScreen ? ` → ${a.targetScreen}` : ""}`
      );
    });
    lines.push("");
  }

  if (report.confidence)
    lines.push(`Confidence: ${String(report.confidence).toUpperCase()}`);
  if (Array.isArray(report.sourcesUsed) && report.sourcesUsed.length) {
    lines.push(`Sources: ${report.sourcesUsed.join(", ")}`);
  }

  return lines.join("\n");
}
