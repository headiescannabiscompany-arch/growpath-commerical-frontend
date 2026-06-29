export type NormalizedDiagnosis = {
  id: string;
  issueSummary: string;
  confidence: "low" | "medium" | "high" | "unknown";
  severity: "low" | "medium" | "high" | "unknown";
  evidence: string[];
  missingData: string[];
  actions: string[];
  tags: string[];
  explanation: string;
  followUp: string;
  source: string;
};

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function band(value: unknown): "low" | "medium" | "high" | "unknown" {
  if (typeof value === "number") {
    if (value >= 4) return "high";
    if (value >= 2) return "medium";
    if (value >= 1) return "low";
  }
  const text = String(value || "").toLowerCase();
  if (text.includes("high") || text.includes("critical")) return "high";
  if (text.includes("medium") || text.includes("moderate")) return "medium";
  if (text.includes("low")) return "low";
  return "unknown";
}

export function normalizeDiagnosisResponse(response: any): NormalizedDiagnosis {
  const row =
    response?.data?.diagnosis ??
    response?.diagnosis ??
    response?.result ??
    response?.data ??
    response ??
    {};
  const details = response?.details ?? row?.details ?? {};
  const likelyIssues = Array.isArray(details?.likelyIssues) ? details.likelyIssues : [];
  const evidence = strings(row?.evidenceObserved ?? row?.evidence);
  const missingData = strings(row?.missingData);
  const actions = strings(row?.suggestedActions ?? row?.aiActions ?? row?.actions);
  return {
    id: String(row?._id || row?.id || ""),
    issueSummary: String(
      row?.issueSummary ||
        row?.possibleIssue ||
        row?.summary ||
        "No diagnosis summary returned."
    ),
    confidence: band(row?.confidence ?? row?.confidenceLevel),
    severity: band(row?.severity ?? row?.severityLevel),
    evidence: evidence.length
      ? evidence
      : strings(likelyIssues.flatMap((issue: any) => issue?.evidence || [])),
    missingData: missingData.length
      ? missingData
      : strings(likelyIssues.flatMap((issue: any) => issue?.nextChecks || [])),
    actions: actions.length ? actions : strings(details?.recommendations),
    tags: strings(row?.tags ?? details?.tags),
    explanation: String(
      row?.aiExplanation || row?.explanation || details?.disclaimer || ""
    ),
    followUp: String(
      row?.followUp || row?.followUpQuestion || details?.suggestedTasks?.[0]?.title || ""
    ),
    source: String(
      row?.provider || row?.analysisProvider || row?.sourceType || "unverified"
    )
  };
}
