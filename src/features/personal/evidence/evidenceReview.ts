export type EvidenceReviewConfidence = "high" | "medium" | "low" | "unknown";

export type EvidenceReview = {
  requested: boolean;
  performed: boolean;
  photoCount: number;
  photosAnalyzed: number;
  quality: string;
  confidence: EvidenceReviewConfidence;
  providerLabel?: string;
  evidenceUsed: string[];
  counterEvidence: string[];
  missingInformation: string[];
  requiredNextPhotos: string[];
  limitations: string[];
};

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function confidence(value: unknown): EvidenceReviewConfidence {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "high" || normalized === "medium" || normalized === "low"
    ? normalized
    : "unknown";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

/** Normalize provider-specific media fields without upgrading a text-only result. */
export function normalizeEvidenceReview(
  source: unknown,
  fallback: Partial<EvidenceReview> = {}
): EvidenceReview {
  const value =
    source && typeof source === "object" ? (source as Record<string, any>) : {};
  const performed = Boolean(value.performed || value.imageAnalysisPerformed === true);
  const requested = Boolean(value.requested || value.evidenceRequested || performed);
  return {
    requested: fallback.requested ?? requested,
    performed: fallback.performed ?? performed,
    photoCount: numberValue(fallback.photoCount ?? value.photoCount),
    photosAnalyzed: numberValue(fallback.photosAnalyzed ?? value.photosAnalyzed),
    quality: String(fallback.quality ?? value.quality ?? value.imageQuality ?? "unknown"),
    confidence: confidence(
      fallback.confidence ?? value.confidence ?? value.visualConfidence
    ),
    providerLabel:
      String(fallback.providerLabel ?? value.providerLabel ?? "").trim() || undefined,
    evidenceUsed: list(fallback.evidenceUsed ?? value.evidenceUsed ?? value.evidence),
    counterEvidence: list(fallback.counterEvidence ?? value.counterEvidence),
    missingInformation: list(
      fallback.missingInformation ?? value.missingInformation ?? value.missingData
    ),
    requiredNextPhotos: list(fallback.requiredNextPhotos ?? value.requiredNextPhotos),
    limitations: list(fallback.limitations ?? value.limitations)
  };
}

export function evidenceReviewNextChecks(review: EvidenceReview) {
  return [
    ...review.requiredNextPhotos,
    ...review.missingInformation,
    ...review.limitations
  ]
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 8);
}
