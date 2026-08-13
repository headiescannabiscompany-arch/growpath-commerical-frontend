import { apiRequest } from "./apiRequest";
import type { EvidenceWorkspaceType } from "@/types/evidence";

export const SUPPORTED_HARVEST_REVIEW_POLICIES = [
  "harvest-trichome-server-attestation-v1",
  "harvest-trichome-server-attestation-v2-full-grid",
  "harvest-trichome-server-attestation-v3-head-development"
] as const;

export function isSupportedHarvestReviewPolicy(value: unknown) {
  return SUPPORTED_HARVEST_REVIEW_POLICIES.includes(
    String(value || "") as (typeof SUPPORTED_HARVEST_REVIEW_POLICIES)[number]
  );
}

export type TrichomeVisionResult = {
  photoUsable: boolean;
  imageQuality: "usable" | "limited" | "unusable";
  clear: number | null;
  cloudy: number | null;
  amber: number | null;
  visibleSampleEstimateUsable?: boolean;
  sampleClear?: number | null;
  sampleCloudy?: number | null;
  sampleAmber?: number | null;
  sampleAmberOrWarmLight?: number | null;
  sampleAmberMin?: number | null;
  sampleAmberMax?: number | null;
  sampleCloudyOrGlare?: number | null;
  sampleEstimateBasis?: string;
  visibleSampleHeadCount?: number;
  visibleSampleCountSource?: "resolved_head_tally" | "provider_proportion" | "none";
  visibleSampleCountingConfidence?: "high" | "medium" | "low" | "not_counted";
  confidence: number;
  dominant: "clear" | "cloudy" | "amber" | "uncertain";
  cloudinessObservation?:
    | "direct_cloudy"
    | "likely_cloudy_persistent"
    | "glare_obscured"
    | "not_visible"
    | "uncertain";
  cloudinessConfidence?: number;
  cloudinessBasis?: string;
  amberVisibility?:
    | "none_visible"
    | "isolated_visible"
    | "substantial_visible"
    | "uncertain";
  amberEvidenceBasis?: string;
  headDevelopmentObservation?:
    | "developing"
    | "intact_swollen"
    | "mixed"
    | "advanced_senescence"
    | "not_visible"
    | "uncertain";
  headDevelopmentBasis?: string;
  headDevelopmentSignals?: Array<
    | "small_developing_heads"
    | "intact_turgid_heads"
    | "visibly_swollen_heads"
    | "wrinkled_heads"
    | "collapsed_heads"
    | "resin_exudation"
    | "fused_heads"
    | "detached_or_missing_heads"
  >;
  visibleTraits: string[];
  evidence: string[];
  recommendation: string;
  limitations: string[];
  qualityChecks?: {
    focus: "usable" | "limited" | "blocking";
    glare: "none" | "localized" | "blocking";
    lighting: "neutral" | "mixed" | "colored" | "problematic";
    headVisibility: "sufficient" | "limited" | "unresolved";
    roleCoverage: "complete" | "incomplete" | "uncertain";
  };
  imageFindings?: Array<{
    imageIndex: number;
    role:
      | "top_macro"
      | "middle_macro"
      | "lower_macro"
      | "context"
      | "additional_macro"
      | "uncertain";
    usableForDistribution: boolean;
    usableForVisibleSample?: boolean;
    trichomeRichRegion: string;
    excludedReason: string;
    focus: "sharp" | "partial" | "blurred";
    glare: "none" | "localized" | "blocking";
    visibleHeadDetail: "sufficient" | "limited" | "unresolved";
    resolvedHeadCounts?: {
      clear: number;
      cloudy: number;
      amber: number;
      amberOrWarmLight?: number;
      cloudyOrGlare: number;
    };
    resolvedHeadTotal?: number;
    countingConfidence?: "high" | "medium" | "low" | "not_counted";
  }>;
  provider: string;
  providerLabel: string;
  providerModel: string;
  imageDetail?: "low" | "high" | "original" | "auto";
  imagesAnalyzed: number;
  diagnosticViewsAnalyzed?: number;
  evidenceUsed: string[];
  analysisId: string;
  analysisReceipt?: {
    aiUsageEventId: string;
    normalizedHarvestResultDigest: string;
    evidenceFingerprint: string;
    reviewPolicyVersion: string;
    [key: string]: unknown;
  };
  aiCreditsUsed: number;
  aiTokensRemaining?: number;
  creditStatus: "charged" | "refunded" | "not_charged";
};

export type HarvestTrichomeFeedbackInput = {
  analysisId: string;
  estimateAlignment: "close" | "amber_higher" | "amber_lower" | "cannot_tell";
  ownerVisibleAmberPercent?: number;
  basis?: string;
  consentForModelTraining?: boolean;
  calibrationAuthorization?: {
    version: "harvest-trichome-calibration-consent-v1";
    rightsConfirmed: true;
    scope: "internal_ai_evaluation_and_calibration";
    publicUseAuthorized: false;
  };
};

export async function analyzeTrichomePhotos(input: {
  growId: string;
  evidenceAssetIds: string[];
  workspaceType: EvidenceWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  plantId?: string;
  daysSinceFlip?: number;
  sampleLocation?: string;
  notes?: string;
}): Promise<TrichomeVisionResult> {
  const response = await apiRequest<any>("/api/ai/harvest/trichomes", {
    method: "POST",
    body: input
  });
  const result = response?.result ?? response?.data?.result ?? response?.data ?? response;
  if (!result || typeof result.photoUsable !== "boolean") {
    throw new Error(
      "The photo analysis returned an incomplete result. Please try again."
    );
  }
  const analysisReceipt =
    result.analysisReceipt ??
    response?.analysisReceipt ??
    response?.data?.analysisReceipt;
  const receiptIsComplete = Boolean(
    String(analysisReceipt?.aiUsageEventId || "").trim() &&
    /^[a-f0-9]{64}$/i.test(
      String(analysisReceipt?.normalizedHarvestResultDigest || "").trim()
    ) &&
    String(analysisReceipt?.evidenceFingerprint || "").trim() &&
    isSupportedHarvestReviewPolicy(analysisReceipt?.reviewPolicyVersion)
  );
  if (!receiptIsComplete) {
    throw new Error(
      "The photo analysis was not securely attested, so no trichome fields were filled. Please run the photo review again."
    );
  }
  return {
    ...result,
    analysisReceipt
  } as TrichomeVisionResult;
}

export function submitHarvestTrichomeFeedback(input: HarvestTrichomeFeedbackInput) {
  const rating =
    input.estimateAlignment === "close"
      ? 5
      : input.estimateAlignment === "cannot_tell"
        ? 3
        : 2;
  return apiRequest<{
    success: boolean;
    feedbackId: string;
    queueStatus: string;
    received: Record<string, unknown>;
  }>("/api/ai/feedback", {
    method: "POST",
    body: {
      targetType: "harvest_trichome_review",
      targetId: input.analysisId,
      rating,
      estimateAlignment: input.estimateAlignment,
      ownerVisibleAmberPercent: input.ownerVisibleAmberPercent,
      basis: input.basis,
      consentForModelTraining: input.consentForModelTraining === true,
      ...(input.consentForModelTraining === true && input.calibrationAuthorization
        ? { calibrationAuthorization: input.calibrationAuthorization }
        : {})
    }
  });
}
