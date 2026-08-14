import type { AiInspectionView } from "@/types/evidence";

export type EvidenceReviewConfidence = "high" | "medium" | "low" | "unknown";

export type EvidenceReview = {
  requested: boolean;
  performed: boolean;
  photoCount: number;
  photosAnalyzed: number;
  quality: string;
  confidence: EvidenceReviewConfidence;
  providerLabel?: string;
  analysisId?: string;
  reviewPolicyVersion?: string;
  providerModel?: string;
  imageDetail?: string;
  evidenceUsed: string[];
  counterEvidence: string[];
  missingInformation: string[];
  requiredNextPhotos: string[];
  limitations: string[];
  inspectionViews?: AiInspectionView[];
};

function inspectionViews(value: unknown): AiInspectionView[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item: any) => ({
      sourceEvidenceAssetId: String(item.sourceEvidenceAssetId || "").trim(),
      workspaceType: ["personal", "commercial", "facility"].includes(
        String(item.workspaceType)
      )
        ? item.workspaceType
        : undefined,
      workspaceId: item.workspaceId ? String(item.workspaceId) : undefined,
      facilityId: item.facilityId ? String(item.facilityId) : undefined,
      sourceImageIndex: Math.max(1, Math.trunc(Number(item.sourceImageIndex) || 1)),
      kind: String(item.kind || "diagnostic view").trim(),
      cropStrategy: ["focus", "coverage", "macro_coverage"].includes(
        String(item.cropStrategy)
      )
        ? item.cropStrategy
        : "focus",
      sourceBounds: item.sourceBounds || null,
      width: Math.max(0, Math.trunc(Number(item.width) || 0)),
      height: Math.max(0, Math.trunc(Number(item.height) || 0)),
      mimeType: "image/jpeg" as const,
      sha256: String(item.sha256 || "").trim().toLowerCase(),
      dataUrl: item.dataUrl ? String(item.dataUrl) : undefined,
      limitation: item.limitation ? String(item.limitation) : undefined
    }))
    .filter(
      (item) =>
        Boolean(item.sourceEvidenceAssetId) && /^[a-f0-9]{64}$/.test(item.sha256)
    )
    .slice(0, 36);
}

function itemText(item: unknown): string {
  if (typeof item === "string" || typeof item === "number") {
    return String(item).trim();
  }
  if (!item || typeof item !== "object") return "";
  const value = item as Record<string, unknown>;
  const primaryKeys = [
    "request",
    "instruction",
    "photo",
    "check",
    "message",
    "description",
    "label",
    "field",
    "name",
    "role"
  ];
  const primary = primaryKeys.map((key) => itemText(value[key])).find(Boolean);
  const reason = itemText(value.reason || value.issue || value.failure);
  if (primary && reason && !primary.toLowerCase().includes(reason.toLowerCase())) {
    return `${primary}: ${reason}`;
  }
  return primary || reason || "";
}

function list(value: unknown): string[] {
  const expand = (entry: unknown): unknown[] => {
    if (Array.isArray(entry)) return entry.flatMap(expand);
    if (!entry || typeof entry !== "object") return entry == null ? [] : [entry];
    const object = entry as Record<string, unknown>;
    const nested = [
      object.items,
      object.requests,
      object.photos,
      object.checks,
      object.missing
    ].flatMap(expand);
    return itemText(entry) ? [entry, ...nested] : nested;
  };
  const source = expand(value);
  return Array.from(new Set(source.map(itemText).filter(Boolean))).slice(0, 12);
}

function mergedList(...values: unknown[]): string[] {
  return Array.from(new Set(values.flatMap(list))).slice(0, 12);
}

function confidence(value: unknown): EvidenceReviewConfidence {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0.75 ? "high" : value >= 0.45 ? "medium" : "low";
  }
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "moderate") return "medium";
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
    analysisId:
      String(fallback.analysisId ?? value.analysisId ?? value.reviewId ?? "").trim() ||
      undefined,
    reviewPolicyVersion:
      String(
        fallback.reviewPolicyVersion ?? value.reviewPolicyVersion ?? value.policyVersion ?? ""
      ).trim() || undefined,
    providerModel:
      String(fallback.providerModel ?? value.providerModel ?? value.model ?? "").trim() ||
      undefined,
    imageDetail:
      String(fallback.imageDetail ?? value.imageDetail ?? "").trim() || undefined,
    evidenceUsed: list(fallback.evidenceUsed ?? value.evidenceUsed ?? value.evidence),
    counterEvidence: list(fallback.counterEvidence ?? value.counterEvidence),
    missingInformation: mergedList(
      fallback.missingInformation,
      value.missingInformation,
      value.missingData,
      value.nextInspectionSteps,
      value.requiredNextChecks
    ),
    requiredNextPhotos: mergedList(
      fallback.requiredNextPhotos,
      value.requiredNextPhotos,
      value.photoRequests,
      value.requiredPhotos,
      value.qualityIssues
    ),
    limitations: mergedList(fallback.limitations, value.limitations),
    inspectionViews: inspectionViews(
      (fallback as any).inspectionViews ?? value.inspectionViews
    )
  };
}

const HARVEST_ROLE_REQUESTS: Record<string, string> = {
  top_macro: "Add a sharp macro photo of intact gland heads on a top bud calyx.",
  middle_macro: "Add a sharp macro photo of intact gland heads on a middle bud calyx.",
  lower_macro: "Add a sharp macro photo of intact gland heads on a lower bud calyx.",
  context: "Add one wider bud-context photo that shows where the macro samples came from."
};

function harvestRoleRequests(media: Record<string, any>) {
  const findings = Array.isArray(media.imageFindings) ? media.imageFindings : [];
  const explicitFailures = mergedList(media.roleFailures, media.failedRoles);
  const failedFindings = findings
    .filter((finding: any) => finding && finding.usableForDistribution === false)
    .map((finding: any) => {
      const role = String(finding.role || "uncertain").replaceAll("_", " ");
      const reason = String(
        finding.excludedReason || "does not show usable detail"
      ).trim();
      return `Retake photo ${finding.imageIndex || ""} (${role}): ${reason}.`
        .replace("photo  (", "photo (")
        .replace("..", ".");
    });
  const shouldCheckRoles =
    media.qualityChecks?.roleCoverage === "incomplete" ||
    (typeof media.photoUsable === "boolean" && !media.photoUsable && findings.length > 0);
  const observedRoles = new Set(
    findings.map((finding: any) => String(finding?.role || "")).filter(Boolean)
  );
  const missingRoles = shouldCheckRoles
    ? Object.entries(HARVEST_ROLE_REQUESTS)
        .filter(([role]) => !observedRoles.has(role))
        .map(([, request]) => request)
    : [];
  return mergedList(explicitFailures, failedFindings, missingRoles);
}

/** Infer a shared evidence review from Diagnosis, IPM, or Harvest output contracts. */
export function inferEvidenceReview(
  outputs: Record<string, any>,
  payload: Record<string, any>
) {
  const media = outputs.mediaAnalysis || outputs.photoAnalysis || outputs.imageAnalysis;
  const assetIds = Array.isArray(payload.evidenceAssetIds)
    ? payload.evidenceAssetIds
    : [];
  const mediaEvidence = Array.isArray(payload.mediaEvidence) ? payload.mediaEvidence : [];
  const photoUrls = Array.isArray(payload.photoUrls) ? payload.photoUrls : [];
  const requested = Boolean(
    media || assetIds.length || mediaEvidence.length || photoUrls.length
  );
  if (!requested) return null;
  const mediaValue =
    media && typeof media === "object" ? (media as Record<string, any>) : {};
  const harvestRequests = harvestRoleRequests(mediaValue);
  return normalizeEvidenceReview(
    {
      ...mediaValue,
      evidenceUsed: mergedList(outputs.evidenceUsed, mediaValue.evidenceUsed),
      counterEvidence: mergedList(
        outputs.counterEvidence,
        mediaValue.counterEvidence,
        outputs.gptVerification?.counterEvidence
      ),
      missingInformation: mergedList(
        outputs.missingInformation,
        mediaValue.missingInformation,
        outputs.nextInspectionSteps,
        outputs.gptVerification?.missingInformation,
        outputs.gptVerification?.nextInspectionSteps
      ),
      requiredNextPhotos: mergedList(
        outputs.requiredNextPhotos,
        outputs.photoRequests,
        mediaValue.requiredNextPhotos,
        mediaValue.photoRequests,
        mediaValue.qualityIssues,
        harvestRequests,
        mediaValue.photoUsable === false ? mediaValue.recommendation : undefined
      ),
      limitations: mergedList(
        outputs.limitations,
        mediaValue.limitations,
        outputs.warnings
      )
    },
    {
      requested,
      analysisId: outputs.analysisId || outputs.reviewId,
      reviewPolicyVersion: outputs.reviewPolicyVersion,
      providerModel: outputs.providerModel || mediaValue.providerModel,
      imageDetail: outputs.imageDetail || mediaValue.imageDetail,
      confidence: outputs.confidence ?? mediaValue.confidence,
      photoCount:
        assetIds.length ||
        mediaEvidence.filter((item: any) => item?.type !== "video").length ||
        photoUrls.length ||
        numberValue(mediaValue.photoCount) ||
        numberValue(mediaValue.imagesAnalyzed)
    }
  );
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
