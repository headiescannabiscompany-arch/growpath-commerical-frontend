import { apiRequest } from "./apiRequest";
import {
  isAiInspectionDerivationVersion,
  type AiInspectionView,
  type EvidenceWorkspaceType
} from "@/types/evidence";

export const SUPPORTED_HARVEST_REVIEW_POLICIES = [
  "harvest-trichome-server-attestation-v1",
  "harvest-trichome-server-attestation-v2-full-grid",
  "harvest-trichome-server-attestation-v3-head-development",
  "harvest-trichome-server-attestation-v4-batched-evidence"
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
    | "ruptured_heads"
    | "bare_stalks"
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
  analysisMode?: "standard" | "deep";
  batchCount?: number;
  batchSize?: number;
  aggregationVersion?: string;
  manifestDigest?: string;
  selectedEvidenceDigest?: string;
  analyzedEvidenceDigest?: string;
  creditsQuoted?: number;
  batchSummaries?: Array<{
    batchIndex: number;
    imageCount: number;
    globalImageIndexes: number[];
    inputDigest: string;
    resultDigest: string;
    responseId?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
  }>;
  aggregateReceipt?: {
    kind: "harvest_vision_aggregate";
    version: 2;
    signature: string;
    keyId: string;
    manifestDigest?: string;
    selectedEvidenceDigest?: string;
    analyzedEvidenceDigest?: string;
    [key: string]: unknown;
  };
  diagnosticViewsAnalyzed?: number;
  inspectionViews?: AiInspectionView[];
  selectedEvidenceAssetIds?: string[];
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

export type HarvestTrichomeAnalysisInput = {
  growId?: string;
  cropContext?: "cannabis" | "hemp";
  evidenceAssetIds: string[];
  workspaceType: EvidenceWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  plantId?: string;
  daysSinceFlip?: number;
  sampleLocation?: string;
  notes?: string;
};

export type HarvestDeepReviewQuote = {
  version: "harvest-analysis-quote-v1";
  tokenVersion?: "harvest-deep-quote-v1";
  token: string | null;
  keyId?: string | null;
  analysisMode: "standard" | "deep";
  selectedEvidenceCount: number;
  analyzedEvidenceCount: number;
  duplicateEvidenceCount: number;
  sourceVideoSelected: boolean;
  evidenceCount: number;
  batchCount: number;
  creditsQuoted: number;
  manifestDigest: string;
  selectedEvidenceDigest: string;
  analyzedEvidenceDigest: string;
  expiresAt: string | null;
};

export type HarvestDeepReviewOperation = {
  id: string;
  status: "queued" | "processing" | "succeeded" | "refunded" | "failed";
  analysisMode: "deep";
  clientOperationKey: string;
  requestDigest: string;
  batchCount: number;
  completedBatches?: number;
  creditsQuoted: number;
  creditsRefunded?: number;
  creditState?: "reserved" | "charged" | "refunded" | "not_reserved" | "not_charged";
  failureMessage?: string;
  errorCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type HarvestDeepReviewOperationPacket = {
  operation: HarvestDeepReviewOperation;
  result?: TrichomeVisionResult;
  idempotentReplay?: boolean;
};

export type HarvestDeepReviewDiscardReceipt = {
  success: true;
  discarded: true;
  permanent: true;
  evidenceDeleted: false;
  sourceVideoDeleted: false;
  operation: {
    id: string;
    status: "failed";
    state: "failed";
    analysisMode: "deep";
    errorCode: "HARVEST_RESULT_DELETED";
    failureMessage: string;
    completedAt?: string;
    discardedAt: string;
    result: null;
  };
};

export const HARVEST_FEED_DRAFT_MAX_VIEWS = 8;

export type HarvestFeedDraftView = Pick<
  AiInspectionView,
  | "sourceEvidenceAssetId"
  | "sourceImageIndex"
  | "kind"
  | "cropStrategy"
  | "derivationVersion"
  | "sourceBounds"
  | "width"
  | "height"
  | "mimeType"
  | "sha256"
>;

export type HarvestFeedReviewDraft = {
  id: string;
  status: "draft";
  type: "education";
  sourceType: "harvest_readiness";
  title: string;
  body: string;
  tags: string[];
  contentLabels: string[];
  selectedViewCount: number;
  selectionDigest: string;
  selectedViews: HarvestFeedDraftView[];
  createdAt?: string;
  updatedAt?: string;
};

export type HarvestFeedReviewDraftPacket = {
  success: true;
  idempotentReplay: boolean;
  draft: HarvestFeedReviewDraft;
};

type HarvestFeedReviewDraftWorkspace = {
  workspaceType: EvidenceWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  commercialAccountId?: string;
};

function normalizedHarvestFeedReviewDraft(value: any): HarvestFeedReviewDraftPacket {
  const packet = value?.data ?? value;
  const draft = packet?.draft;
  const selectedViews = Array.isArray(draft?.selectedViews) ? draft.selectedViews : [];
  const selectedViewCount = Number(draft?.selectedViewCount);
  if (
    packet?.success !== true ||
    !String(draft?.id || "").trim() ||
    draft?.status !== "draft" ||
    draft?.type !== "education" ||
    draft?.sourceType !== "harvest_readiness" ||
    !String(draft?.title || "").trim() ||
    !String(draft?.body || "").trim() ||
    !Array.isArray(draft?.tags) ||
    !Array.isArray(draft?.contentLabels) ||
    !Number.isInteger(selectedViewCount) ||
    selectedViewCount < 1 ||
    selectedViewCount > HARVEST_FEED_DRAFT_MAX_VIEWS ||
    selectedViews.length !== selectedViewCount ||
    !/^[a-f0-9]{64}$/.test(String(draft?.selectionDigest || "")) ||
    selectedViews.some(
      (view: any) =>
        !String(view?.sourceEvidenceAssetId || "").trim() ||
        !Number.isInteger(Number(view?.sourceImageIndex)) ||
        !String(view?.kind || "").trim() ||
        !["focus", "coverage", "macro_coverage"].includes(
          String(view?.cropStrategy || "")
        ) ||
        (view?.derivationVersion !== undefined &&
          !isAiInspectionDerivationVersion(view.derivationVersion)) ||
        view?.mimeType !== "image/jpeg" ||
        !/^[a-f0-9]{64}$/.test(String(view?.sha256 || ""))
    )
  ) {
    throw new Error(
      "GrowPath did not return a complete private Harvest Feed review draft."
    );
  }
  return {
    success: true,
    idempotentReplay: packet?.idempotentReplay === true,
    draft: { ...draft, selectedViewCount, selectedViews }
  } as HarvestFeedReviewDraftPacket;
}

function normalizedTrichomeVisionResult(value: any): TrichomeVisionResult {
  const result = value?.result ?? value?.data?.result ?? value?.data ?? value;
  if (!result || typeof result.photoUsable !== "boolean") {
    throw new Error(
      "The photo analysis returned an incomplete result. Please try again."
    );
  }
  const aggregateReceipt =
    result.aggregateReceipt ?? value?.aggregateReceipt ?? value?.data?.aggregateReceipt;
  const analysisReceipt =
    result.analysisReceipt ??
    aggregateReceipt ??
    value?.analysisReceipt ??
    value?.aggregateReceipt ??
    value?.data?.analysisReceipt ??
    value?.data?.aggregateReceipt;
  const reviewPolicyVersion = String(analysisReceipt?.reviewPolicyVersion || "").trim();
  const aggregateReceiptComplete =
    reviewPolicyVersion !== "harvest-trichome-server-attestation-v4-batched-evidence" ||
    (aggregateReceipt?.kind === "harvest_vision_aggregate" &&
      aggregateReceipt?.version === 2 &&
      /^[a-f0-9]{64}$/.test(String(aggregateReceipt?.signature || "")) &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(String(aggregateReceipt?.keyId || "")) &&
      /^[a-f0-9]{64}$/.test(String(aggregateReceipt?.manifestDigest || "")) &&
      /^[a-f0-9]{64}$/.test(String(aggregateReceipt?.selectedEvidenceDigest || "")) &&
      /^[a-f0-9]{64}$/.test(String(aggregateReceipt?.analyzedEvidenceDigest || "")) &&
      analysisReceipt?.kind === aggregateReceipt.kind &&
      analysisReceipt?.version === aggregateReceipt.version &&
      analysisReceipt?.signature === aggregateReceipt.signature &&
      analysisReceipt?.keyId === aggregateReceipt.keyId &&
      analysisReceipt?.manifestDigest === aggregateReceipt.manifestDigest &&
      analysisReceipt?.selectedEvidenceDigest ===
        aggregateReceipt.selectedEvidenceDigest &&
      analysisReceipt?.analyzedEvidenceDigest ===
        aggregateReceipt.analyzedEvidenceDigest);
  const receiptIsComplete = Boolean(
    String(analysisReceipt?.aiUsageEventId || "").trim() &&
    /^[a-f0-9]{64}$/i.test(
      String(analysisReceipt?.normalizedHarvestResultDigest || "").trim()
    ) &&
    String(analysisReceipt?.evidenceFingerprint || "").trim() &&
    isSupportedHarvestReviewPolicy(reviewPolicyVersion) &&
    aggregateReceiptComplete
  );
  if (!receiptIsComplete) {
    throw new Error(
      "The photo analysis was not securely attested, so no trichome fields were filled. Please run the photo review again."
    );
  }
  return {
    ...result,
    ...(aggregateReceipt ? { aggregateReceipt } : {}),
    analysisReceipt
  } as TrichomeVisionResult;
}

export async function analyzeTrichomePhotos(
  input: HarvestTrichomeAnalysisInput
): Promise<TrichomeVisionResult> {
  const response = await apiRequest<any>("/api/ai/harvest/trichomes", {
    method: "POST",
    body: input
  });
  return normalizedTrichomeVisionResult(response);
}

export async function quoteDeepTrichomeReview(
  input: HarvestTrichomeAnalysisInput,
  options: { signal?: AbortSignal } = {}
) {
  const response = await apiRequest<any>("/api/ai/harvest/trichomes/quote", {
    method: "POST",
    signal: options.signal,
    timeoutMs: 45000,
    body: input
  });
  const quote = response?.quote ?? response?.data?.quote;
  const selectedEvidenceCount = Number(quote?.selectedEvidenceCount);
  const analyzedEvidenceCount = Number(quote?.analyzedEvidenceCount);
  const duplicateEvidenceCount = Number(quote?.duplicateEvidenceCount);
  const evidenceCount = Number(quote?.evidenceCount);
  const batchCount = Number(quote?.batchCount);
  const creditsQuoted = Number(quote?.creditsQuoted);
  const analysisMode = String(quote?.analysisMode || "");
  const deepTokenValid =
    analysisMode !== "deep" ||
    (quote?.tokenVersion === "harvest-deep-quote-v1" &&
      Boolean(String(quote?.token || "").trim()));
  const standardTokenValid = analysisMode !== "standard" || quote?.token == null;
  const keyIdValid =
    analysisMode === "deep"
      ? /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(String(quote?.keyId || ""))
      : quote?.keyId === null || quote?.keyId === undefined;
  const expiryValid =
    analysisMode === "deep"
      ? typeof quote?.expiresAt === "string" &&
        Number.isFinite(new Date(quote.expiresAt).getTime())
      : quote?.expiresAt == null;
  if (
    quote?.version !== "harvest-analysis-quote-v1" ||
    !["standard", "deep"].includes(analysisMode) ||
    !Number.isInteger(selectedEvidenceCount) ||
    selectedEvidenceCount < 4 ||
    selectedEvidenceCount > 80 ||
    !Number.isInteger(analyzedEvidenceCount) ||
    analyzedEvidenceCount < 1 ||
    analyzedEvidenceCount > selectedEvidenceCount ||
    !Number.isInteger(duplicateEvidenceCount) ||
    duplicateEvidenceCount !== selectedEvidenceCount - analyzedEvidenceCount ||
    typeof quote?.sourceVideoSelected !== "boolean" ||
    !Number.isInteger(evidenceCount) ||
    evidenceCount !== analyzedEvidenceCount ||
    !Number.isInteger(batchCount) ||
    batchCount < 1 ||
    batchCount > 7 ||
    !Number.isInteger(creditsQuoted) ||
    creditsQuoted !== batchCount ||
    (analysisMode === "standard" && (analyzedEvidenceCount > 12 || batchCount !== 1)) ||
    (analysisMode === "deep" && (analyzedEvidenceCount < 13 || batchCount < 2)) ||
    !deepTokenValid ||
    !standardTokenValid ||
    !keyIdValid ||
    !/^[a-f0-9]{64}$/.test(String(quote?.manifestDigest || "")) ||
    !/^[a-f0-9]{64}$/.test(String(quote?.selectedEvidenceDigest || "")) ||
    !/^[a-f0-9]{64}$/.test(String(quote?.analyzedEvidenceDigest || "")) ||
    !expiryValid
  ) {
    throw new Error(
      "GrowPath could not produce a complete evidence-bound Deep review quote."
    );
  }
  return {
    ...quote,
    analysisMode,
    selectedEvidenceCount,
    analyzedEvidenceCount,
    duplicateEvidenceCount,
    evidenceCount,
    batchCount,
    creditsQuoted
  } as HarvestDeepReviewQuote;
}

function normalizedDeepOperation(value: any): HarvestDeepReviewOperation {
  const operation = value?.operation ?? value?.data?.operation ?? value;
  const status = String(operation?.status || operation?.state || "");
  const creditState = operation?.creditState ? String(operation.creditState) : undefined;
  const batchCount = Number(operation?.batchCount);
  const completedBatches = Number(
    operation?.completedBatches ?? operation?.completedBatchCount ?? 0
  );
  const creditsQuoted = Number(operation?.creditsQuoted);
  if (
    !String(operation?.id || "").trim() ||
    !["queued", "processing", "succeeded", "refunded", "failed"].includes(status) ||
    operation?.analysisMode !== "deep" ||
    !/^.{8,200}$/.test(String(operation?.clientOperationKey || "")) ||
    !/^[a-f0-9]{64}$/.test(String(operation?.requestDigest || "")) ||
    !Number.isInteger(batchCount) ||
    batchCount < 2 ||
    batchCount > 7 ||
    !Number.isInteger(completedBatches) ||
    completedBatches < 0 ||
    completedBatches > batchCount ||
    !Number.isInteger(creditsQuoted) ||
    creditsQuoted !== batchCount ||
    (creditState !== undefined &&
      !["reserved", "charged", "refunded", "not_reserved", "not_charged"].includes(
        creditState
      ))
  ) {
    throw new Error("GrowPath returned an invalid Deep review operation.");
  }
  return {
    ...operation,
    id: String(operation.id),
    status,
    analysisMode: "deep",
    clientOperationKey: String(operation.clientOperationKey),
    requestDigest: String(operation.requestDigest),
    batchCount,
    completedBatches,
    creditsQuoted,
    ...(creditState ? { creditState } : {}),
    ...(operation?.errorCode
      ? { errorCode: String(operation.errorCode).slice(0, 160) }
      : {}),
    ...(operation?.failureMessage
      ? { failureMessage: String(operation.failureMessage).slice(0, 500) }
      : {}),
    creditsRefunded: Number.isFinite(Number(operation.creditsRefunded))
      ? Math.max(0, Math.trunc(Number(operation.creditsRefunded)))
      : undefined
  } as HarvestDeepReviewOperation;
}

function normalizedDeepOperationPacket(value: any): HarvestDeepReviewOperationPacket {
  const operation = normalizedDeepOperation(value);
  const rawResult =
    value?.result ??
    value?.operation?.result ??
    value?.data?.result ??
    value?.data?.operation?.result;
  if (operation.status === "succeeded" && !rawResult) {
    throw new Error(
      "GrowPath marked the Deep review complete without its signed aggregate result."
    );
  }
  return {
    operation,
    ...(typeof value?.idempotentReplay === "boolean"
      ? { idempotentReplay: value.idempotentReplay }
      : typeof value?.data?.idempotentReplay === "boolean"
        ? { idempotentReplay: value.data.idempotentReplay }
        : {}),
    ...(operation.status === "succeeded" && rawResult
      ? { result: normalizedTrichomeVisionResult({ ...value, result: rawResult }) }
      : {})
  };
}

export async function startDeepTrichomeReview(
  input: HarvestTrichomeAnalysisInput & {
    analysisMode: "deep";
    deepReviewQuoteToken: string;
    creditsQuoted: number;
    clientOperationKey: string;
  },
  options: { signal?: AbortSignal } = {}
) {
  const clientOperationKey = String(input.clientOperationKey || "").trim();
  if (clientOperationKey.length < 8 || clientOperationKey.length > 200) {
    throw new Error("A stable Deep review request ID is required before submission.");
  }
  const response = await apiRequest<any>("/api/ai/harvest/trichomes", {
    method: "POST",
    signal: options.signal,
    // Deep start revalidates as many as 80 protected originals before the
    // durable queue record is returned. Keep this longer than the bounded R2
    // read deadline so a slow-but-valid start is not mistaken for a lost one.
    timeoutMs: 120000,
    retries: 0,
    headers: { "X-Client-Request-Id": clientOperationKey },
    body: { ...input, clientOperationKey }
  });
  return normalizedDeepOperationPacket(response);
}

export async function findDeepTrichomeReviewOperation(
  clientOperationKey: string,
  workspace: {
    workspaceType: EvidenceWorkspaceType;
    workspaceId?: string;
    facilityId?: string;
  },
  options: { signal?: AbortSignal } = {}
) {
  const key = String(clientOperationKey || "").trim();
  if (key.length < 8 || key.length > 200) {
    throw new Error("A stable Deep review request ID is required for recovery.");
  }
  const response = await apiRequest<any>("/api/ai/harvest/trichomes/operations", {
    signal: options.signal,
    timeoutMs: 30000,
    params: { ...workspace, clientOperationKey: key }
  });
  const direct = response?.operation ?? response?.data?.operation;
  const listed = response?.operations ?? response?.data?.operations;
  const candidates = direct ? [direct] : Array.isArray(listed) ? listed : [];
  if (!candidates.length) return null;
  if (candidates.length !== 1) {
    throw new Error("GrowPath returned more than one operation for one request ID.");
  }
  const packet = normalizedDeepOperationPacket({
    ...response,
    operation: candidates[0],
    result: response?.result ?? response?.data?.result ?? candidates[0]?.result
  });
  if (packet.operation.clientOperationKey !== key) {
    throw new Error("The recovered Deep review does not match this request ID.");
  }
  return packet;
}

export async function getDeepTrichomeReviewOperation(
  operationId: string,
  workspace: {
    workspaceType: EvidenceWorkspaceType;
    workspaceId?: string;
    facilityId?: string;
  },
  options: { signal?: AbortSignal } = {}
) {
  if (!String(operationId || "").trim()) {
    throw new Error("A Deep review operation ID is required.");
  }
  const response = await apiRequest<any>(
    `/api/ai/harvest/trichomes/operations/${encodeURIComponent(operationId)}`,
    {
      signal: options.signal,
      timeoutMs: 60000,
      params: workspace
    }
  );
  return normalizedDeepOperationPacket(response);
}

export async function retryPristineDeepTrichomeReviewOperation(
  operationId: string,
  workspace: {
    workspaceType: EvidenceWorkspaceType;
    workspaceId?: string;
    facilityId?: string;
  },
  options: { signal?: AbortSignal } = {}
) {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("A failed Deep review operation ID is required.");
  const response = await apiRequest<any>(
    `/api/ai/harvest/trichomes/operations/${encodeURIComponent(id)}/retry`,
    {
      method: "POST",
      signal: options.signal,
      timeoutMs: 240000,
      retries: 0,
      body: {
        workspaceType: workspace.workspaceType,
        ...(workspace.workspaceId ? { workspaceId: workspace.workspaceId } : {}),
        ...(workspace.facilityId ? { facilityId: workspace.facilityId } : {})
      }
    }
  );
  const packet = normalizedDeepOperationPacket(response);
  const retried = response?.retried ?? response?.data?.retried;
  if (
    retried !== true ||
    packet.operation.id !== id ||
    packet.operation.status !== "queued" ||
    !["not_reserved", "not_charged"].includes(String(packet.operation.creditState || ""))
  ) {
    throw new Error(
      "GrowPath did not confirm the guarded same-operation retry. No replacement review was submitted."
    );
  }
  return packet;
}

export async function discardUnsavedDeepTrichomeReview(
  operationId: string,
  workspace: {
    workspaceType: EvidenceWorkspaceType;
    workspaceId?: string;
    facilityId?: string;
  },
  options: { signal?: AbortSignal } = {}
) {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("A completed Deep review operation is required.");
  const response = await apiRequest<any>(
    `/api/ai/harvest/trichomes/operations/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      signal: options.signal,
      timeoutMs: 30000,
      retries: 0,
      body: {
        confirmPermanentDelete: true,
        workspaceType: workspace.workspaceType,
        ...(workspace.workspaceId ? { workspaceId: workspace.workspaceId } : {}),
        ...(workspace.facilityId ? { facilityId: workspace.facilityId } : {})
      }
    }
  );
  const receipt = response?.data ?? response;
  const operation = receipt?.operation;
  if (
    receipt?.success !== true ||
    receipt?.discarded !== true ||
    receipt?.permanent !== true ||
    receipt?.evidenceDeleted !== false ||
    receipt?.sourceVideoDeleted !== false ||
    String(operation?.id || "") !== id ||
    operation?.status !== "failed" ||
    operation?.state !== "failed" ||
    operation?.analysisMode !== "deep" ||
    operation?.errorCode !== "HARVEST_RESULT_DELETED" ||
    operation?.result !== null ||
    !String(operation?.failureMessage || "").trim() ||
    !String(operation?.discardedAt || "").trim()
  ) {
    throw new Error(
      "GrowPath did not confirm the permanent unsaved Deep-result discard. The result remains visible until status is verified."
    );
  }
  return receipt as HarvestDeepReviewDiscardReceipt;
}

export async function createHarvestFeedReviewDraft(
  operationId: string,
  workspace: HarvestFeedReviewDraftWorkspace,
  selectedViews: HarvestFeedDraftView[],
  options: { signal?: AbortSignal } = {}
) {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("A completed Deep Harvest review is required.");
  if (
    !Array.isArray(selectedViews) ||
    selectedViews.length < 1 ||
    selectedViews.length > HARVEST_FEED_DRAFT_MAX_VIEWS
  ) {
    throw new Error(
      `Choose 1–${HARVEST_FEED_DRAFT_MAX_VIEWS} inspected zoom images for the Feed review draft.`
    );
  }
  const response = await apiRequest<any>(
    `/api/ai/harvest/trichomes/operations/${encodeURIComponent(id)}/feed-draft`,
    {
      method: "POST",
      signal: options.signal,
      timeoutMs: 60000,
      retries: 0,
      body: { ...workspace, selectedViews }
    }
  );
  return normalizedHarvestFeedReviewDraft(response);
}

export async function deleteHarvestFeedReviewDraft(
  operationId: string,
  workspace: HarvestFeedReviewDraftWorkspace,
  options: { signal?: AbortSignal } = {}
) {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("A completed Deep Harvest review is required.");
  const response = await apiRequest<any>(
    `/api/ai/harvest/trichomes/operations/${encodeURIComponent(id)}/feed-draft`,
    {
      method: "DELETE",
      signal: options.signal,
      timeoutMs: 60000,
      retries: 0,
      params: workspace
    }
  );
  if (
    response?.success !== true ||
    response?.deleted !== true ||
    typeof response?.draftId !== "string" ||
    !/^[a-f0-9]{24}$/.test(response.draftId)
  ) {
    throw new Error(
      "GrowPath did not confirm deletion of the private Feed review draft."
    );
  }
  return { deleted: true as const, draftId: response.draftId };
}

export async function getHarvestFeedReviewDraft(
  operationId: string,
  workspace: HarvestFeedReviewDraftWorkspace,
  options: { signal?: AbortSignal } = {}
) {
  const id = String(operationId || "").trim();
  if (!id) throw new Error("A completed Deep Harvest review is required.");
  const response = await apiRequest<any>(
    `/api/ai/harvest/trichomes/operations/${encodeURIComponent(id)}/feed-draft`,
    {
      signal: options.signal,
      timeoutMs: 30000,
      params: workspace
    }
  );
  return normalizedHarvestFeedReviewDraft(response);
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
