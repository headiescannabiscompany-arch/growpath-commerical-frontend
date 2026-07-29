export type NormalizedDiagnosis = {
  id: string;
  issueSummary: string;
  confidence: "low" | "medium" | "high" | "unknown";
  topCandidateConfidence: number | null;
  overallHealth: string;
  severity: "low" | "medium" | "high" | "unknown";
  evidence: string[];
  counterEvidence: string[];
  missingData: string[];
  actions: string[];
  tags: string[];
  explanation: string;
  followUp: string;
  source: string;
  diagnosisClass: string;
  patternSummary: string;
  rootZoneSummary: string;
  environmentSummary: string;
  numberSummary: string;
  urgency: string;
  providerName: string;
  providerModel: string;
  growPathReasoning: string[];
  improvementNotice: string;
  providerResult?: unknown;
  imageAnalysis?: {
    requested?: boolean;
    performed?: boolean;
    photoCount?: number;
    usableForTriage?: boolean;
    qualityIssues?: string[];
    observedFeatures?: string[];
    limitations?: string[];
    provider?: string;
    providerModel?: string;
    reason?: string;
  };
  verification?: {
    status?: string;
    agreement?: boolean | null;
    note?: string;
    overlappingIssues?: string[];
  };
  cropIdentity: {
    commonName?: string;
    scientificName?: string;
    cultivarOrStrain?: string;
    confidence?: string;
    ambiguous?: boolean;
    visibleEvidence?: string[];
    alternatives?: string[];
    source?: "user_context" | "visual_suggestion" | "insufficient_evidence";
    cropProfileMatched?: boolean;
    cropProfileId?: string | null;
    cropProfileCurationStatus?: string | null;
    requiresUserConfirmation?: boolean;
    clarificationPrompt?: string;
  };
  cropProfileSnapshot?: {
    id?: string;
    displayName?: string;
    scientificName?: string;
    cropCategory?: string;
    curationStatus?: string;
    environmentTargets?: unknown[];
    nutritionTargets?: unknown[];
    recommendationCautions?: string[];
  } | null;
};

export const DIAGNOSIS_SAFETY_DISCLAIMER =
  "GrowPath AI provides plant-health triage, not a guaranteed lab diagnosis. Confirm with environment, medium, water, and testing when possible.";

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

function confidenceBand(value: unknown): "low" | "medium" | "high" | "unknown" {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = value > 1 && value <= 100 ? value / 100 : value;
    if (normalized >= 0.75 && normalized <= 1) return "high";
    if (normalized >= 0.45 && normalized < 0.75) return "medium";
    if (normalized > 0 && normalized < 0.45) return "low";
  }
  return band(value);
}

function candidateConfidence(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const normalized = numeric > 1 && numeric <= 100 ? numeric / 100 : numeric;
  return normalized >= 0 && normalized <= 1 ? normalized : null;
}

function cautiousIssueSummary(value: unknown): string {
  const summary = String(value || "").trim() || "No diagnosis summary returned.";
  return summary
    .replace(/^\s*(confirmed|definite|certain|guaranteed)\b[:\-\s]*/i, "Possible ")
    .replace(/\b(is|are)\s+(confirmed|definite|certain|guaranteed)\b/gi, "$1 possible")
    .replace(
      /\b(confirmed|definite|certain|guaranteed)\s+(diagnosis|disease|infection|deficiency|toxicity)\b/gi,
      "possible $2"
    );
}

export function normalizeDiagnosisResponse(response: any): NormalizedDiagnosis {
  const row =
    response?.data?.diagnosis ??
    response?.diagnosis ??
    response?.result ??
    response?.data ??
    response ??
    {};
  const details = response?.details ?? row?.details ?? row?.aiResult ?? {};
  const providerDetails = row?.providerResult || details?.providerResult || {};
  const likelyIssues = Array.isArray(details?.likelyIssues)
    ? details.likelyIssues
    : Array.isArray(providerDetails?.likelyIssues)
      ? providerDetails.likelyIssues
      : [];
  const evidence = strings(row?.evidenceObserved ?? row?.evidence);
  const counterEvidence = strings(row?.counterEvidence);
  const missingData = strings(row?.missingData);
  const actions = strings(row?.suggestedActions ?? row?.aiActions ?? row?.actions);
  return {
    id: String(row?._id || row?.id || ""),
    issueSummary: cautiousIssueSummary(
      row?.issueSummary || row?.possibleIssue || row?.summary
    ),
    confidence: confidenceBand(
      row?.confidence ??
        row?.confidenceLevel ??
        details?.overallConfidence ??
        details?.confidence
    ),
    topCandidateConfidence: candidateConfidence(likelyIssues[0]?.confidence),
    overallHealth: String(row?.overallHealth || details?.overallHealth || ""),
    severity: band(row?.severity ?? row?.severityLevel),
    evidence: evidence.length
      ? evidence
      : strings(likelyIssues.flatMap((issue: any) => issue?.evidence || [])),
    counterEvidence: counterEvidence.length
      ? counterEvidence
      : strings(likelyIssues.flatMap((issue: any) => issue?.counterEvidence || [])),
    missingData: missingData.length
      ? missingData
      : strings(likelyIssues.flatMap((issue: any) => issue?.nextChecks || [])),
    actions: actions.length ? actions : strings(details?.recommendations),
    tags: strings(row?.tags ?? details?.suggestedTags ?? details?.tags),
    explanation: String(
      row?.aiExplanation ||
        row?.explanation ||
        details?.disclaimer ||
        DIAGNOSIS_SAFETY_DISCLAIMER
    ),
    followUp: String(
      row?.followUp ||
        row?.followUpQuestion ||
        details?.followUpQuestion ||
        details?.tasksToCreate?.[0]?.title ||
        details?.suggestedTasks?.[0]?.title ||
        ""
    ),
    source: String(
      row?.providerName ||
        details?.providerName ||
        row?.provider ||
        row?.analysisProvider ||
        row?.sourceType ||
        "unverified"
    ),
    diagnosisClass: String(row?.diagnosisClass || details?.diagnosisClass || ""),
    patternSummary: String(row?.patternSummary || details?.patternSummary || ""),
    rootZoneSummary: String(row?.rootZoneSummary || details?.rootZoneSummary || ""),
    environmentSummary: String(
      row?.environmentSummary || details?.environmentSummary || ""
    ),
    numberSummary: String(row?.numberSummary || details?.numberSummary || ""),
    urgency: String(row?.urgency || details?.urgency || ""),
    providerName: String(
      row?.providerName || details?.providerName || row?.provider || ""
    ),
    providerModel: String(row?.providerModel || details?.providerModel || ""),
    growPathReasoning: strings(
      row?.growPathReasoning || details?.growPathReasoning || row?.reasoning
    ),
    improvementNotice: String(row?.improvementNotice || details?.improvementNotice || ""),
    providerResult: row?.providerResult || details?.providerResult || undefined,
    imageAnalysis: row?.imageAnalysis || details?.imageAnalysis || undefined,
    verification: row?.verification || details?.verification || undefined,
    cropIdentity: row?.cropIdentity || details?.cropIdentity || {},
    cropProfileSnapshot: row?.cropProfileSnapshot || details?.cropProfileSnapshot || null
  };
}
