import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { useHarvestDeepReview } from "@/features/personal/tools/useHarvestDeepReview";
import {
  getHarvestBatch,
  listHarvestBatches,
  updateHarvestBatch,
  type DryCureRecordInput,
  type HarvestBatch
} from "@/api/harvestBatches";
import {
  analyzeTrichomePhotos,
  createHarvestFeedReviewDraft,
  deleteHarvestFeedReviewDraft,
  getHarvestFeedReviewDraft,
  HARVEST_FEED_DRAFT_MAX_VIEWS,
  isSupportedHarvestReviewPolicy,
  submitHarvestTrichomeFeedback,
  type HarvestDeepReviewOperation,
  type HarvestDeepReviewQuote,
  type HarvestFeedDraftView,
  type HarvestFeedReviewDraft,
  type TrichomeVisionResult
} from "@/api/harvestVision";
import type { VideoWorkspaceType } from "@/api/videos";
import { listEvidenceAssets, providerEvidencePayload } from "@/api/evidence";
import { getToolRun, type ToolRun } from "@/api/toolRuns";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { useServerVideoFrameExtraction } from "@/components/media/useServerVideoFrameExtraction";
import SavedGrowPhotoEvidencePicker from "@/components/media/SavedGrowPhotoEvidencePicker";
import EvidenceReviewPanel from "@/components/personal/EvidenceReviewPanel";
import { PLANT_REVIEW_PHOTO_LIMIT } from "@/features/personal/diagnosis/photoEvidenceQuality";
import {
  inspectedPhotoEstimateCounts,
  inspectedPhotoEstimateHeader,
  inspectedPhotoEstimatePercentages,
  inspectedPhotoEstimates,
  strongestInspectedAmberSignal
} from "@/features/personal/tools/harvestVisibleSample";
import {
  exportSelectedHarvestFrames,
  HARVEST_PRIVATE_FRAME_EXPORT_LIMIT,
  harvestAnalyzedGlobalIndexes,
  harvestBatchSummariesCoverEvidence,
  harvestRetainedFrameExportCandidates,
  isShareableSignedHarvestResult,
  savedHarvestAnalysis,
  savedHarvestAnalysisOperationId,
  shareSignedHarvestResult
} from "@/features/personal/tools/harvestPrivateSharing";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import {
  aiInspectionViewIdentityKey,
  type AiInspectionView,
  type EvidenceAsset
} from "@/types/evidence";
import { businessDeskProviderSignatureSha256 } from "@/features/businessDesk/providerOperationPersistence";
import { restorableHarvestEvidence } from "@/features/personal/evidence/harvestEvidenceRestore";

const MIN_HARVEST_PHOTOS = 4;
const MAX_HARVEST_PROVIDER_IMAGES = 80;
const MAX_HARVEST_USER_PHOTOS = PLANT_REVIEW_PHOTO_LIMIT;
const HARVEST_FRAME_PREVIEW_LIMIT = 12;
const HARVEST_CONTEXT_SCOPED_FIELDS = ["harvestBatchId"];

export {
  harvestAnalyzedGlobalIndexes,
  harvestBatchSummariesCoverEvidence,
  savedHarvestAnalysis,
  savedHarvestAnalysisOperationId
};

const HARVEST_CALIBRATION_CHOICES = [
  { key: "close", label: "Estimate looks close" },
  { key: "amber_higher", label: "Amber looks higher" },
  { key: "amber_lower", label: "Amber looks lower" },
  { key: "cannot_tell", label: "I cannot tell" }
] as const;

const HARVEST_PHOTO_CHECKLIST = [
  "Use at least 3 sharp macro photos from top, middle, and lower bud sites.",
  "Focus on intact trichome gland heads on bud calyxes, not pistils or sugar-leaf edges.",
  "Use neutral white light; avoid purple LEDs, glare, blur, digital zoom, and heavy compression.",
  "Include one wider bud-context photo so each macro sample has a clear location.",
  "A short video can be scanned for a bounded set of distinct, usable still frames; every retained frame still must pass the same focus, glare, and bud-site checks.",
  "Image count is not coverage: many wide views cannot replace three true macros where individual intact gland heads are visible."
];

function readableEvidenceBytes(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 bytes";
  if (bytes < 1024) return `${Math.round(bytes)} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function harvestFeedDraftView(view: AiInspectionView): HarvestFeedDraftView {
  return {
    sourceEvidenceAssetId: view.sourceEvidenceAssetId,
    sourceImageIndex: view.sourceImageIndex,
    kind: view.kind,
    cropStrategy: view.cropStrategy,
    ...(view.derivationVersion ? { derivationVersion: view.derivationVersion } : {}),
    sourceBounds: view.sourceBounds || null,
    width: view.width,
    height: view.height,
    mimeType: view.mimeType,
    sha256: view.sha256
  };
}

export function harvestReviewCreditEstimate(imageCount: number) {
  const boundedCount = Math.min(
    MAX_HARVEST_PROVIDER_IMAGES,
    Math.max(1, Math.trunc(Number(imageCount) || 0))
  );
  return Math.min(7, Math.max(1, Math.ceil(boundedCount / 12)));
}

export function harvestVideoReviewPlan(input: {
  status: "idle" | "processing" | "completed" | "partial" | "failed";
  chosenCeiling: 12 | 80;
  requestedFrameCount?: number;
  targetFrameCount?: number;
  selectedCount?: number;
}) {
  const persistedCount = Math.max(
    Number(input.requestedFrameCount || 0),
    Number(input.targetFrameCount || 0),
    Number(input.selectedCount || 0)
  );
  const persistedCeiling: 12 | 80 | null = persistedCount
    ? persistedCount > 12
      ? 80
      : 12
    : null;
  const restoreLocked = input.status === "processing" || input.status === "completed";
  return {
    selectedCeiling: restoreLocked
      ? (persistedCeiling ?? input.chosenCeiling)
      : input.chosenCeiling,
    effectiveCeiling: restoreLocked
      ? (persistedCeiling ?? input.chosenCeiling)
      : input.chosenCeiling,
    restoreLocked
  };
}

type HarvestAnalysisDraft = {
  result: TrichomeVisionResult;
  scopeKey: string;
  revisionKey: string;
  growId: string;
  operationId?: string;
};

type HarvestReviewResultContext = Pick<
  HarvestDeepReviewQuote,
  | "analysisMode"
  | "selectedEvidenceCount"
  | "analyzedEvidenceCount"
  | "batchCount"
  | "creditsQuoted"
  | "manifestDigest"
  | "selectedEvidenceDigest"
  | "analyzedEvidenceDigest"
> & { operationId?: string };

function savedHarvestEvidenceIds(run: ToolRun | null) {
  const inputs = (run?.inputs || run?.input || run?.params || {}) as Record<string, any>;
  const outputs = (run?.outputs || run?.result || {}) as Record<string, any>;
  const photoAnalysis =
    outputs.photoAnalysis && typeof outputs.photoAnalysis === "object"
      ? outputs.photoAnalysis
      : {};
  return [
    ...(Array.isArray(inputs.evidenceAssetIds) ? inputs.evidenceAssetIds : []),
    ...(Array.isArray(inputs.selectedEvidenceAssetIds)
      ? inputs.selectedEvidenceAssetIds
      : []),
    ...(Array.isArray(photoAnalysis.evidenceUsed) ? photoAnalysis.evidenceUsed : []),
    ...(Array.isArray(photoAnalysis.selectedEvidenceAssetIds)
      ? photoAnalysis.selectedEvidenceAssetIds
      : [])
  ]
    .map(String)
    .filter(Boolean);
}

function harvestAnalysisScopeKey(input: {
  workspaceType: VideoWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  growId: string;
  plantId: string;
  evidenceAssetIds: string[];
  sampleLocation: string;
  notes?: string;
  daysSinceFlip?: number;
  cropContext?: "cannabis" | "hemp";
}) {
  // The quote binds provider context as well as media. Persist and compare only a
  // deterministic digest so private notes never enter operation metadata or scope keys.
  return `harvest-analysis::${businessDeskProviderSignatureSha256(
    JSON.stringify({
      workspaceType: input.workspaceType,
      workspaceId: String(input.workspaceId || ""),
      facilityId: String(input.facilityId || ""),
      growId: String(input.growId || ""),
      plantId: String(input.plantId || ""),
      evidenceAssetIds: input.evidenceAssetIds.map(String).filter(Boolean),
      sampleLocation: String(input.sampleLocation || ""),
      notes: String(input.notes || "").trim(),
      daysSinceFlip:
        typeof input.daysSinceFlip === "number" && Number.isFinite(input.daysSinceFlip)
          ? input.daysSinceFlip
          : null,
      cropContext: String(input.cropContext || "")
    })
  )}`;
}

function harvestAnalysisRevisionKey(
  result: TrichomeVisionResult,
  scopeKey: string,
  operationId = ""
) {
  const receipt = result.analysisReceipt;
  return [
    scopeKey,
    String(result.analysisId || "no-analysis-id"),
    String(receipt?.aiUsageEventId || "no-usage-event"),
    String(receipt?.normalizedHarvestResultDigest || "no-result-digest"),
    String(receipt?.evidenceFingerprint || "no-evidence-fingerprint"),
    String(receipt?.reviewPolicyVersion || "no-review-policy"),
    String(operationId || "no-operation-id")
  ].join("::");
}

function harvestPercentageDraft(value: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value * 100))
    : "";
}

function trichomeHeadTallyLabel(
  finding: NonNullable<TrichomeVisionResult["imageFindings"]>[number]
) {
  const counts = finding.resolvedHeadCounts;
  if (!counts) return "";
  const total =
    Number(counts.clear || 0) +
    Number(counts.cloudy || 0) +
    Number(counts.amber || 0) +
    Number(counts.amberOrWarmLight || 0) +
    Number(counts.cloudyOrGlare || 0);
  if (!total) return "";
  return ` · tally: ${counts.clear} clear / ${counts.cloudy} cloudy / ${counts.amber} confirmed amber / ${counts.amberOrWarmLight || 0} amber or warm light / ${counts.cloudyOrGlare} cloudy or glare (${total} heads, ${finding.countingConfidence || "low"} confidence)`;
}

export function harvestHeadDevelopmentSignalLabel(signal: string) {
  if (signal === "ruptured_heads") return "ruptured heads";
  if (signal === "bare_stalks") return "bare stalks";
  return String(signal || "uncertain").replaceAll("_", " ");
}

function harvestPhotoRecoveryMessage(detail?: string) {
  return [
    detail || "Photo analysis could not run.",
    "No trichome fields were filled.",
    "Retake or reselect the photos using the checklist:",
    HARVEST_PHOTO_CHECKLIST.join(" ")
  ]
    .filter(Boolean)
    .join(" ");
}

function harvestRequestWasCancelled(error: any, signal?: AbortSignal) {
  const code = String(error?.code || "").toUpperCase();
  return (
    signal?.aborted ||
    error?.name === "AbortError" ||
    code === "ABORT_ERR" ||
    code === "ABORTED"
  );
}

export function UnsavedHarvestDeepResultDiscard({
  operation,
  busy,
  onDiscard
}: {
  operation: HarvestDeepReviewOperation | null;
  busy: boolean;
  onDiscard: () => Promise<boolean> | boolean;
}) {
  const { palette } = useAppTheme();
  const photoStyles = useMemo(() => createHarvestPhotoStyles(palette), [palette]);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConfirmationOpen(false);
    setConfirmed(false);
  }, [operation?.id, operation?.status]);

  if (!operation || operation.status !== "succeeded") return null;

  if (!confirmationOpen) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Discard unsaved Deep result"
        disabled={busy}
        onPress={() => setConfirmationOpen(true)}
        style={[photoStyles.secondaryButton, busy && photoStyles.disabled]}
      >
        <Text style={photoStyles.secondaryButtonText}>
          Discard Unsaved Deep Result...
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel="Confirm unsaved Deep result discard"
      style={photoStyles.qualityChecks}
    >
      <Text style={photoStyles.checklistTitle}>Permanent result-only discard</Text>
      <Text style={photoStyles.warning}>
        This permanently removes this unsaved signed Deep result and its provider-result
        metadata. It cannot be undone. The private source video and retained frames are
        kept and are not deleted. AI credits already charged for the completed review are
        not refunded.
      </Text>
      <Text style={photoStyles.help}>
        GrowPath will refuse this action if the result was saved, is used for calibration,
        or is under a legal or preservation hold. Delete a saved result from Saved Runs or
        remove the protected reference instead.
      </Text>
      <View style={photoStyles.consentRow}>
        <Switch
          accessibilityLabel="I understand unsaved Deep result discard is permanent and not refunded"
          value={confirmed}
          onValueChange={setConfirmed}
          disabled={busy}
        />
        <Text style={photoStyles.consentText}>
          I understand this result-only discard is permanent, keeps the private media, and
          does not refund the charged AI credits.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Permanently discard unsaved Deep result"
        disabled={!confirmed || busy}
        onPress={() => void onDiscard()}
        style={[
          photoStyles.secondaryButton,
          (!confirmed || busy) && photoStyles.disabled
        ]}
      >
        <Text style={photoStyles.removeText}>
          {busy ? "Discarding Unsaved Result..." : "Permanently Discard Unsaved Result"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel unsaved Deep result discard"
        disabled={busy}
        onPress={() => {
          setConfirmationOpen(false);
          setConfirmed(false);
        }}
        style={[photoStyles.secondaryButton, busy && photoStyles.disabled]}
      >
        <Text style={photoStyles.secondaryButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

function HarvestPhotoAnalyzer({
  growId,
  plantId,
  evidenceAssets,
  onEvidenceAssetsChange,
  initialAnalysis,
  initialAnalysisOperationId,
  onAnalysisDraft,
  onScopeKeyChange,
  workspaceType,
  workspaceId,
  facilityId,
  retryToolRunId
}: {
  growId: string;
  plantId: string;
  evidenceAssets: EvidenceAsset[];
  onEvidenceAssetsChange: React.Dispatch<React.SetStateAction<EvidenceAsset[]>>;
  initialAnalysis: TrichomeVisionResult | null;
  initialAnalysisOperationId?: string;
  onAnalysisDraft: React.Dispatch<React.SetStateAction<HarvestAnalysisDraft | null>>;
  onScopeKeyChange: React.Dispatch<React.SetStateAction<string>>;
  workspaceType: VideoWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  retryToolRunId?: string;
}) {
  const { palette } = useAppTheme();
  const photoStyles = useMemo(() => createHarvestPhotoStyles(palette), [palette]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidenceUploadBusy, setEvidenceUploadBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [restoreFeedback, setRestoreFeedback] = useState("");
  const [restoringEvidence, setRestoringEvidence] = useState(false);
  const [analysis, setAnalysis] = useState<TrichomeVisionResult | null>(initialAnalysis);
  const [analysisOperationId, setAnalysisOperationId] = useState(
    String(initialAnalysisOperationId || "")
  );
  const [calibrationChoice, setCalibrationChoice] = useState("");
  const [observedAmberPercent, setObservedAmberPercent] = useState("");
  const [calibrationNotes, setCalibrationNotes] = useState("");
  const [calibrationConsent, setCalibrationConsent] = useState(false);
  const [calibrationRightsConfirmed, setCalibrationRightsConfirmed] = useState(false);
  const [calibrationBusy, setCalibrationBusy] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState("");
  const [videoReviewImageCeiling, setVideoReviewImageCeiling] = useState<12 | 80>(12);
  const [selectedFrameExportIds, setSelectedFrameExportIds] = useState<string[]>([]);
  const [frameExportBusy, setFrameExportBusy] = useState(false);
  const [frameExportFeedback, setFrameExportFeedback] = useState("");
  const [standaloneCropContextConfirmed, setStandaloneCropContextConfirmed] =
    useState(false);
  const [resultShareBusy, setResultShareBusy] = useState(false);
  const [resultShareFeedback, setResultShareFeedback] = useState("");
  const [selectedFeedDraftViewKeys, setSelectedFeedDraftViewKeys] = useState<string[]>(
    []
  );
  const [feedReviewDraft, setFeedReviewDraft] = useState<HarvestFeedReviewDraft | null>(
    null
  );
  const [feedReviewDraftBusy, setFeedReviewDraftBusy] = useState(false);
  const [feedReviewDraftFeedback, setFeedReviewDraftFeedback] = useState("");
  const [feedDraftLookupBusy, setFeedDraftLookupBusy] = useState(false);
  const [feedDraftLookupSettledOperationId, setFeedDraftLookupSettledOperationId] =
    useState("");
  const inspectedBreakdown = useMemo(
    () => inspectedPhotoEstimates(analysis?.imageFindings),
    [analysis?.imageFindings]
  );
  const strongestAmberSignal = useMemo(
    () => strongestInspectedAmberSignal(inspectedBreakdown),
    [inspectedBreakdown]
  );
  const previousGrowIdRef = useRef(growId);
  const mountedAnalysisRef = useRef(initialAnalysis);
  const mountedAnalysisOperationIdRef = useRef(String(initialAnalysisOperationId || ""));
  const feedReviewDraftRef = useRef(feedReviewDraft);
  const feedDraftLookupControllerRef = useRef<AbortController | null>(null);
  const feedDraftCreateControllerRef = useRef<AbortController | null>(null);
  const feedDraftDeleteControllerRef = useRef<AbortController | null>(null);
  const evidenceWorkspace = useMemo(
    () => ({
      workspaceType,
      ...(workspaceId ? { workspaceId } : {}),
      ...(workspaceType === "facility" && facilityId ? { facilityId } : {})
    }),
    [facilityId, workspaceId, workspaceType]
  );
  const directPhotoCount = evidenceAssets.filter(
    (asset) => asset.assetType === "photo" && asset.source !== "generated"
  ).length;
  const currentHarvestSourceVideo = evidenceAssets.find(
    (asset) => asset.assetType === "video" && asset.purpose === "harvest"
  );
  const persistedFrameExtraction = currentHarvestSourceVideo?.frameExtraction;
  const persistedVideoPlan = harvestVideoReviewPlan({
    status: persistedFrameExtraction?.status || "idle",
    chosenCeiling: videoReviewImageCeiling,
    requestedFrameCount: persistedFrameExtraction?.requestedFrameCount,
    targetFrameCount: persistedFrameExtraction?.preselection?.targetFrameCount,
    selectedCount: persistedFrameExtraction?.preselection?.selectedCount
  });
  const effectiveVideoReviewImageCeiling = persistedVideoPlan.effectiveCeiling;
  const videoFrameSelection = useServerVideoFrameExtraction({
    assets: evidenceAssets,
    onChange: updateEvidence,
    workspace: evidenceWorkspace,
    purpose: "harvest",
    growId,
    plantId,
    maxProviderReadyPhotos: effectiveVideoReviewImageCeiling,
    disabled: busy || evidenceUploadBusy,
    workflowLabel: "Harvest Readiness"
  });
  const frameExportCandidates = useMemo(
    () =>
      videoFrameSelection.ready
        ? harvestRetainedFrameExportCandidates({
            sourceVideo: videoFrameSelection.sourceVideo,
            extraction: videoFrameSelection.extraction,
            frames: videoFrameSelection.selectedFrames
          })
        : [],
    [
      videoFrameSelection.extraction,
      videoFrameSelection.ready,
      videoFrameSelection.selectedFrames,
      videoFrameSelection.sourceVideo
    ]
  );
  const frameExportCandidateIds = useMemo(
    () =>
      frameExportCandidates.map((candidate) =>
        String(candidate.asset._id || candidate.asset.id)
      ),
    [frameExportCandidates]
  );
  const frameExportCandidateKey = frameExportCandidateIds.join("|");
  const frameExportCandidateIdsRef = useRef(frameExportCandidateIds);
  frameExportCandidateIdsRef.current = frameExportCandidateIds;
  const selectedFrameExportKnownBytes = useMemo(() => {
    const selectedIds = new Set(selectedFrameExportIds);
    return frameExportCandidates.reduce((total, candidate) => {
      const candidateId = String(candidate.asset._id || candidate.asset.id || "");
      const fileSizeBytes = Number(candidate.asset.fileSizeBytes || 0);
      return (
        total +
        (selectedIds.has(candidateId) &&
        Number.isFinite(fileSizeBytes) &&
        fileSizeBytes > 0
          ? fileSizeBytes
          : 0)
      );
    }, 0);
  }, [frameExportCandidates, selectedFrameExportIds]);
  const evidence = providerEvidencePayload(videoFrameSelection.providerReadyAssets);
  const photoCount = evidence.images.length;
  const reviewQuoteRequired = photoCount > 12;
  const evidenceAssetKey = evidence.evidenceAssetIds.map(String).join("|");
  const normalizedEvidenceAssetIds = useMemo(
    () => (evidenceAssetKey ? evidenceAssetKey.split("|") : []),
    [evidenceAssetKey]
  );
  const analysisScopeKey = harvestAnalysisScopeKey({
    workspaceType,
    workspaceId,
    facilityId,
    growId,
    plantId,
    evidenceAssetIds: normalizedEvidenceAssetIds,
    sampleLocation: "mixed_bud_sites",
    notes,
    cropContext: !growId && standaloneCropContextConfirmed ? "cannabis" : undefined
  });
  const analysisScopeKeyRef = useRef(analysisScopeKey);
  const previousAnalysisScopeKeyRef = useRef(analysisScopeKey);
  const analysisRequestRevisionRef = useRef(0);
  const signedAnalysisRestoreKeyRef = useRef("");
  analysisScopeKeyRef.current = analysisScopeKey;
  const analysisInput = useMemo(
    () => ({
      growId: growId || undefined,
      cropContext:
        !growId && standaloneCropContextConfirmed ? ("cannabis" as const) : undefined,
      plantId: plantId || undefined,
      evidenceAssetIds: normalizedEvidenceAssetIds,
      workspaceType,
      workspaceId,
      facilityId,
      sampleLocation: "mixed_bud_sites",
      notes: notes.trim() || undefined
    }),
    [
      facilityId,
      growId,
      normalizedEvidenceAssetIds,
      notes,
      plantId,
      standaloneCropContextConfirmed,
      workspaceId,
      workspaceType
    ]
  );
  const deepReviewOperation = useHarvestDeepReview({
    enabled:
      reviewQuoteRequired &&
      videoFrameSelection.ready &&
      photoCount >= MIN_HARVEST_PHOTOS,
    scopeKey: analysisScopeKey,
    workspaceKey: [
      workspaceType,
      workspaceId || "self",
      facilityId || "no-facility"
    ].join("::"),
    expectedImageCount: photoCount,
    analysisInput,
    onResult: (result, context) =>
      acceptAnalysisResult(
        result,
        analysisScopeKeyRef.current,
        analysisRequestRevisionRef.current,
        { ...context, analysisMode: "deep" }
      ),
    onDiscarded: () => {
      mountedAnalysisRef.current = null;
      mountedAnalysisOperationIdRef.current = "";
      setAnalysis(null);
      setAnalysisOperationId("");
      onAnalysisDraft(null);
      setResultShareFeedback("");
      setSelectedFeedDraftViewKeys([]);
      setFeedReviewDraft(null);
      setFeedReviewDraftFeedback("");
      setFeedback(
        "The unsaved signed Deep result was permanently discarded. The private source video and retained frames were kept, and the completed review's charged credits were not refunded."
      );
    }
  });
  const recoverSavedDeepReview = deepReviewOperation.recoverSucceededById;
  const analysisBusy =
    busy || Boolean(deepReviewOperation.busy) || deepReviewOperation.operationActive;
  const feedDraftOperationId =
    deepReviewOperation.operation?.status === "succeeded" &&
    analysis?.analysisMode === "deep" &&
    analysisOperationId === deepReviewOperation.operation.id
      ? deepReviewOperation.operation.id
      : "";
  const succeededDeepReviewOperationId =
    deepReviewOperation.operation?.status === "succeeded"
      ? deepReviewOperation.operation.id
      : "";
  const feedDraftEligibleViews = useMemo(
    () =>
      analysis?.analysisMode === "deep" && Array.isArray(analysis.inspectionViews)
        ? analysis.inspectionViews.filter(
            (view) =>
              Boolean(String(view.sourceEvidenceAssetId || "").trim()) &&
              /^[a-f0-9]{64}$/.test(String(view.sha256 || ""))
          )
        : [],
    [analysis?.analysisMode, analysis?.inspectionViews]
  );
  const selectedFeedDraftViews = useMemo(() => {
    const selected = new Set(selectedFeedDraftViewKeys);
    return feedDraftEligibleViews
      .filter((view) => selected.has(aiInspectionViewIdentityKey(view)))
      .slice(0, HARVEST_FEED_DRAFT_MAX_VIEWS);
  }, [feedDraftEligibleViews, selectedFeedDraftViewKeys]);
  const feedDraftRequestIdentity = JSON.stringify([
    analysisScopeKey,
    String(analysis?.analysisId || ""),
    analysisOperationId,
    feedDraftOperationId,
    evidenceWorkspace.workspaceType,
    evidenceWorkspace.workspaceId || "",
    evidenceWorkspace.facilityId || ""
  ]);
  const feedDraftRequestIdentityRef = useRef(feedDraftRequestIdentity);
  feedDraftRequestIdentityRef.current = feedDraftRequestIdentity;
  feedReviewDraftRef.current = feedReviewDraft;
  const privateFeedDraftLifecycleSettled = Boolean(
    !succeededDeepReviewOperationId ||
    (feedDraftOperationId === succeededDeepReviewOperationId &&
      feedDraftLookupSettledOperationId === succeededDeepReviewOperationId)
  );
  const prepareNewReviewBlocked = Boolean(
    deepReviewOperation.busy ||
    feedDraftLookupBusy ||
    feedReviewDraftBusy ||
    feedReviewDraft ||
    !privateFeedDraftLifecycleSettled
  );

  useEffect(() => {
    feedDraftLookupControllerRef.current?.abort();
    feedDraftLookupControllerRef.current = null;
    feedDraftCreateControllerRef.current?.abort();
    feedDraftCreateControllerRef.current = null;
    feedDraftDeleteControllerRef.current?.abort();
    feedDraftDeleteControllerRef.current = null;
    setFeedDraftLookupBusy(false);
    setFeedDraftLookupSettledOperationId("");
    setFeedReviewDraftBusy(false);
    return () => {
      feedDraftLookupControllerRef.current?.abort();
      feedDraftCreateControllerRef.current?.abort();
      feedDraftDeleteControllerRef.current?.abort();
    };
  }, [feedDraftRequestIdentity]);

  useEffect(() => {
    const eligible = new Set(frameExportCandidateIdsRef.current);
    setSelectedFrameExportIds((current) => {
      const next = current.filter((id) => eligible.has(id));
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
    setFrameExportFeedback("");
  }, [frameExportCandidateKey]);

  useEffect(() => {
    onScopeKeyChange(analysisScopeKey);
  }, [analysisScopeKey, evidenceAssetKey, onScopeKeyChange]);

  useEffect(() => {
    if (previousAnalysisScopeKeyRef.current === analysisScopeKey) return;
    previousAnalysisScopeKeyRef.current = analysisScopeKey;
    analysisRequestRevisionRef.current += 1;
    mountedAnalysisRef.current = null;
    mountedAnalysisOperationIdRef.current = "";
    setAnalysis(null);
    setAnalysisOperationId("");
    onAnalysisDraft(null);
  }, [analysisScopeKey, onAnalysisDraft]);

  useEffect(() => {
    setCalibrationChoice("");
    setObservedAmberPercent("");
    setCalibrationNotes("");
    setCalibrationConsent(false);
    setCalibrationRightsConfirmed(false);
    setCalibrationStatus("");
    setResultShareFeedback("");
    setSelectedFeedDraftViewKeys([]);
    setFeedReviewDraft(null);
    setFeedReviewDraftFeedback("");
  }, [analysis?.analysisId]);

  useEffect(() => {
    if (!feedDraftOperationId || analysis?.analysisMode !== "deep") {
      setFeedDraftLookupBusy(false);
      setFeedDraftLookupSettledOperationId("");
      return;
    }
    const requestIdentity = feedDraftRequestIdentity;
    const operationId = feedDraftOperationId;
    const controller = new AbortController();
    feedDraftLookupControllerRef.current?.abort();
    feedDraftLookupControllerRef.current = controller;
    setFeedDraftLookupBusy(true);
    setFeedDraftLookupSettledOperationId("");
    void getHarvestFeedReviewDraft(operationId, evidenceWorkspace, {
      signal: controller.signal
    })
      .then((packet) => {
        if (
          controller.signal.aborted ||
          feedDraftLookupControllerRef.current !== controller ||
          feedDraftRequestIdentityRef.current !== requestIdentity
        ) {
          return;
        }
        setFeedReviewDraft(packet.draft);
        const restored = new Set(
          packet.draft.selectedViews.map(aiInspectionViewIdentityKey)
        );
        setSelectedFeedDraftViewKeys(
          feedDraftEligibleViews
            .map(aiInspectionViewIdentityKey)
            .filter((key) => restored.has(key))
        );
        setFeedReviewDraftFeedback(
          "Your private GrowPath Feed review draft was restored. It is not public."
        );
        setFeedDraftLookupSettledOperationId(operationId);
      })
      .catch((error: any) => {
        if (
          harvestRequestWasCancelled(error, controller.signal) ||
          feedDraftLookupControllerRef.current !== controller ||
          feedDraftRequestIdentityRef.current !== requestIdentity
        ) {
          return;
        }
        if (Number(error?.status || 0) === 404) {
          setFeedReviewDraft(null);
          setFeedDraftLookupSettledOperationId(operationId);
          return;
        }
        setFeedReviewDraftFeedback(
          error?.message || "GrowPath could not check for an existing Feed review draft."
        );
      })
      .finally(() => {
        if (feedDraftLookupControllerRef.current === controller) {
          feedDraftLookupControllerRef.current = null;
          setFeedDraftLookupBusy(false);
        }
      });
    return () => controller.abort();
  }, [
    analysis?.analysisMode,
    evidenceWorkspace,
    feedDraftEligibleViews,
    feedDraftOperationId,
    feedDraftRequestIdentity
  ]);

  useEffect(() => {
    let active = true;
    const growChanged = previousGrowIdRef.current !== growId;
    previousGrowIdRef.current = growId;
    if (growChanged || !mountedAnalysisRef.current) {
      if (growChanged) analysisRequestRevisionRef.current += 1;
      mountedAnalysisRef.current = null;
      mountedAnalysisOperationIdRef.current = "";
      setAnalysis(null);
      setAnalysisOperationId("");
      onAnalysisDraft(null);
    } else {
      setAnalysis(mountedAnalysisRef.current);
      setAnalysisOperationId(mountedAnalysisOperationIdRef.current);
    }
    setRestoreFeedback("");

    setRestoringEvidence(true);
    const assetsPromise = listEvidenceAssets({
      ...(growId ? { growId } : {}),
      ...(workspaceType !== "personal"
        ? {
            workspaceType,
            ...(workspaceId ? { workspaceId } : {}),
            ...(workspaceType === "facility" && facilityId ? { facilityId } : {})
          }
        : {})
    });
    const retryRunPromise =
      retryToolRunId && workspaceType === "personal"
        ? getToolRun(retryToolRunId).catch(() => null)
        : Promise.resolve(null);

    Promise.all([assetsPromise, retryRunPromise])
      .then(([assets, retryRun]: [EvidenceAsset[], ToolRun | null]) => {
        if (!active) return;
        const exactRetryIds = new Set(savedHarvestEvidenceIds(retryRun));
        const eligibleAssets = retryToolRunId
          ? assets.filter((asset) =>
              exactRetryIds.has(String(asset._id || asset.id || ""))
            )
          : assets;
        const restored = restorableHarvestEvidence(
          eligibleAssets,
          growId,
          MAX_HARVEST_PROVIDER_IMAGES
        );
        const savedPhotos = restored.filter((asset) => asset.assetType === "photo");
        const savedVideo = restored.find((asset) => asset.assetType === "video");

        if (retryToolRunId && !exactRetryIds.size) {
          onEvidenceAssetsChange([]);
          setRestoreFeedback(
            "The saved run did not retain an exact Harvest evidence set. Choose the original grow photos before running a new analysis."
          );
          return;
        }

        onEvidenceAssetsChange((current) => {
          const currentForGrow = current.filter(
            (asset) => String(asset.growId || "") === growId
          );
          const merged = new Map<string, EvidenceAsset>();
          for (const asset of [...restored, ...currentForGrow]) {
            merged.set(String(asset._id || asset.id), asset);
          }
          return Array.from(merged.values());
        });
        if (restored.length) {
          setRestoreFeedback(
            `Restored ${savedPhotos.length} ${
              retryToolRunId ? "exact " : "saved "
            }harvest photo${
              savedPhotos.length === 1 ? "" : "s"
            }${savedVideo ? " and 1 source video" : ""} for this ${
              growId ? "grow" : "standalone workspace review"
            }.`
          );
        }
      })
      .catch(() => {
        if (active) {
          setRestoreFeedback(
            "Saved harvest evidence could not be restored. You can still choose photos already in this grow or add new evidence."
          );
        }
      })
      .finally(() => {
        if (active) setRestoringEvidence(false);
      });

    return () => {
      active = false;
    };
  }, [
    facilityId,
    growId,
    onAnalysisDraft,
    onEvidenceAssetsChange,
    retryToolRunId,
    workspaceId,
    workspaceType
  ]);

  useEffect(() => {
    let active = true;
    const currentEvidenceAssetIds = evidenceAssetKey
      ? evidenceAssetKey.split("|").filter(Boolean)
      : [];
    if (
      !retryToolRunId ||
      workspaceType !== "personal" ||
      !currentEvidenceAssetIds.length
    ) {
      return () => {
        active = false;
      };
    }

    const restoreKey = `${retryToolRunId}:${currentEvidenceAssetIds
      .slice()
      .sort()
      .join("|")}`;
    if (signedAnalysisRestoreKeyRef.current === restoreKey) {
      return () => {
        active = false;
      };
    }
    signedAnalysisRestoreKeyRef.current = restoreKey;

    void getToolRun(retryToolRunId)
      .then((retryRun) => {
        if (!active) return;
        const restoredAnalysis = savedHarvestAnalysis(retryRun);
        if (!restoredAnalysis) return;
        const restoredOperationId = savedHarvestAnalysisOperationId(retryRun);

        const retainedIds = new Set(savedHarvestEvidenceIds(retryRun));
        const currentIds = new Set(currentEvidenceAssetIds);
        if (
          !retainedIds.size ||
          !Array.from(retainedIds).every((id) => currentIds.has(id))
        ) {
          return;
        }
        if (
          analysis?.analysisId === restoredAnalysis.analysisId &&
          (!restoredOperationId || analysisOperationId === restoredOperationId)
        ) {
          return;
        }

        const restoredScopeKey = harvestAnalysisScopeKey({
          workspaceType,
          workspaceId,
          facilityId,
          growId,
          plantId,
          evidenceAssetIds: currentEvidenceAssetIds,
          sampleLocation: "mixed_bud_sites",
          notes
        });
        mountedAnalysisRef.current = restoredAnalysis;
        mountedAnalysisOperationIdRef.current = restoredOperationId;
        setAnalysis(restoredAnalysis);
        setAnalysisOperationId(restoredOperationId);
        onAnalysisDraft({
          result: restoredAnalysis,
          scopeKey: restoredScopeKey,
          revisionKey: harvestAnalysisRevisionKey(
            restoredAnalysis,
            restoredScopeKey,
            restoredOperationId
          ),
          growId,
          ...(restoredOperationId ? { operationId: restoredOperationId } : {})
        });
        setRestoreFeedback(
          (current) =>
            `${current ? `${current} ` : ""}Restored the signed photo analysis for zero-credit review.${
              restoredOperationId
                ? " Recovering its exact completed operation and private Feed-draft address from Saved Runs."
                : ""
            }`
        );
        if (restoredOperationId) {
          void recoverSavedDeepReview(restoredOperationId, restoredAnalysis);
        }
      })
      .catch(() => {
        if (active && signedAnalysisRestoreKeyRef.current === restoreKey) {
          signedAnalysisRestoreKeyRef.current = "";
        }
        // The exact evidence remains available even when the signed result cannot be replayed.
      });

    return () => {
      active = false;
    };
  }, [
    analysis?.analysisId,
    analysisOperationId,
    evidenceAssetKey,
    facilityId,
    growId,
    recoverSavedDeepReview,
    onAnalysisDraft,
    notes,
    plantId,
    retryToolRunId,
    workspaceId,
    workspaceType
  ]);

  function updateEvidence(next: EvidenceAsset[]) {
    analysisRequestRevisionRef.current += 1;
    onEvidenceAssetsChange(next);
    mountedAnalysisRef.current = null;
    mountedAnalysisOperationIdRef.current = "";
    setAnalysis(null);
    setAnalysisOperationId("");
    onAnalysisDraft(null);
    const nextPhotoCount = providerEvidencePayload(next).images.length;
    setFeedback(
      nextPhotoCount >= MIN_HARVEST_PHOTOS
        ? "Photo set uploaded. Confirm the samples meet the checklist, then run the AI review."
        : "Keep adding evidence: three sharp macro bud-site samples plus one wider context photo are required. No AI credit is used until a complete set is submitted."
    );
  }

  const addSavedGrowEvidence: React.Dispatch<React.SetStateAction<EvidenceAsset[]>> = (
    update
  ) => {
    analysisRequestRevisionRef.current += 1;
    onEvidenceAssetsChange(update);
    mountedAnalysisRef.current = null;
    mountedAnalysisOperationIdRef.current = "";
    setAnalysis(null);
    setAnalysisOperationId("");
    onAnalysisDraft(null);
    setFeedback(
      "Saved grow photo added. Confirm it is a sharp macro or context view before analysis."
    );
  };

  function acceptAnalysisResult(
    result: TrichomeVisionResult,
    requestScopeKey: string,
    requestRevision: number,
    quoteContext?: HarvestReviewResultContext
  ) {
    const expectedSelectedOrdered = evidence.imageEvidenceAssetIds.map(String);
    const expectedSelectedSorted = [...expectedSelectedOrdered].sort();
    const actualAnalyzedOrdered = (result.evidenceUsed || []).map(String);
    const returnedSelected = Array.isArray(result.selectedEvidenceAssetIds)
      ? result.selectedEvidenceAssetIds.map(String)
      : null;
    const receipt = result.analysisReceipt;
    const analyzedGlobalIndexes = returnedSelected
      ? harvestAnalyzedGlobalIndexes(returnedSelected, actualAnalyzedOrdered)
      : null;
    const expectedCredits = quoteContext?.creditsQuoted ?? 1;
    const selectedSetMatches = returnedSelected
      ? returnedSelected.length === expectedSelectedOrdered.length &&
        returnedSelected.every((id, index) => id === expectedSelectedOrdered[index])
      : receipt?.evidenceFingerprint === expectedSelectedSorted.join("|");
    const baseReceiptMatches = Boolean(
      receipt &&
      expectedSelectedOrdered.length >= MIN_HARVEST_PHOTOS &&
      expectedSelectedOrdered.length <= MAX_HARVEST_PROVIDER_IMAGES &&
      selectedSetMatches &&
      receipt.evidenceFingerprint === expectedSelectedSorted.join("|") &&
      actualAnalyzedOrdered.length > 0 &&
      new Set(actualAnalyzedOrdered).size === actualAnalyzedOrdered.length &&
      result.imagesAnalyzed === actualAnalyzedOrdered.length &&
      result.imagesAnalyzed <= expectedSelectedOrdered.length &&
      result.aiCreditsUsed === expectedCredits &&
      result.creditStatus === "charged" &&
      isSupportedHarvestReviewPolicy(receipt.reviewPolicyVersion) &&
      receipt.aiUsageEventId === result.analysisId
    );

    let quoteAndAggregateMatch = true;
    if (quoteContext) {
      quoteAndAggregateMatch = Boolean(
        quoteContext.selectedEvidenceCount === expectedSelectedOrdered.length &&
        quoteContext.analyzedEvidenceCount === actualAnalyzedOrdered.length &&
        quoteContext.creditsQuoted === result.aiCreditsUsed
      );
      if (quoteContext.analysisMode === "deep") {
        const aggregateReceipt = result.aggregateReceipt;
        const operationId = String(quoteContext.operationId || "").trim();
        quoteAndAggregateMatch = Boolean(
          quoteAndAggregateMatch &&
          receipt?.reviewPolicyVersion ===
            "harvest-trichome-server-attestation-v4-batched-evidence" &&
          result.analysisMode === "deep" &&
          /^[A-Za-z0-9_-]{8,160}$/.test(operationId) &&
          quoteContext.batchCount >= 2 &&
          quoteContext.batchCount <= 7 &&
          result.batchCount === quoteContext.batchCount &&
          result.batchSize === 12 &&
          result.creditsQuoted === quoteContext.creditsQuoted &&
          String(result.aggregationVersion || "").trim() &&
          result.manifestDigest === quoteContext.manifestDigest &&
          result.selectedEvidenceDigest === quoteContext.selectedEvidenceDigest &&
          result.analyzedEvidenceDigest === quoteContext.analyzedEvidenceDigest &&
          analyzedGlobalIndexes !== null &&
          harvestBatchSummariesCoverEvidence(
            result.batchSummaries,
            analyzedGlobalIndexes,
            quoteContext.batchCount
          ) &&
          aggregateReceipt?.kind === "harvest_vision_aggregate" &&
          aggregateReceipt?.version === 2 &&
          /^[a-f0-9]{64}$/.test(String(aggregateReceipt?.signature || "")) &&
          /^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/.test(
            String(aggregateReceipt?.keyId || "")
          ) &&
          receipt?.kind === aggregateReceipt.kind &&
          receipt?.version === aggregateReceipt.version &&
          receipt?.signature === aggregateReceipt.signature &&
          receipt?.keyId === aggregateReceipt.keyId &&
          aggregateReceipt?.manifestDigest === quoteContext.manifestDigest &&
          receipt?.manifestDigest === aggregateReceipt.manifestDigest &&
          aggregateReceipt?.selectedEvidenceDigest ===
            quoteContext.selectedEvidenceDigest &&
          receipt?.selectedEvidenceDigest === aggregateReceipt.selectedEvidenceDigest &&
          aggregateReceipt?.analyzedEvidenceDigest ===
            quoteContext.analyzedEvidenceDigest &&
          receipt?.analyzedEvidenceDigest === aggregateReceipt.analyzedEvidenceDigest
        );
      } else {
        quoteAndAggregateMatch = Boolean(
          quoteAndAggregateMatch &&
          quoteContext.analyzedEvidenceCount <= 12 &&
          quoteContext.creditsQuoted === 1 &&
          (!result.analysisMode || result.analysisMode === "standard")
        );
      }
    } else {
      quoteAndAggregateMatch = Boolean(
        expectedSelectedOrdered.length <= 12 && result.aiCreditsUsed === 1
      );
    }

    if (!baseReceiptMatches || !quoteAndAggregateMatch) {
      throw new Error(
        "The evidence receipt does not match the exact selected photos, retained frames, server quote, and aggregate evidence manifest. No trichome fields were filled."
      );
    }
    if (
      analysisScopeKeyRef.current !== requestScopeKey ||
      analysisRequestRevisionRef.current !== requestRevision
    ) {
      return;
    }
    const acceptedOperationId =
      result.analysisMode === "deep" ? String(quoteContext?.operationId || "") : "";
    mountedAnalysisRef.current = result;
    mountedAnalysisOperationIdRef.current = acceptedOperationId;
    setAnalysis(result);
    setAnalysisOperationId(acceptedOperationId);
    onAnalysisDraft({
      result,
      scopeKey: requestScopeKey,
      revisionKey: harvestAnalysisRevisionKey(
        result,
        requestScopeKey,
        acceptedOperationId
      ),
      growId,
      ...(acceptedOperationId ? { operationId: acceptedOperationId } : {})
    });
    const modeLabel = result.analysisMode === "deep" ? "Deep review" : "review";
    setFeedback(
      result.photoUsable
        ? `${result.imagesAnalyzed} unique photos or retained frames were inspected in one ${modeLabel} and ${result.aiCreditsUsed} AI credit${result.aiCreditsUsed === 1 ? " was" : "s were"} charged. The clear, cloudy, and amber fields below are filled. Review the evidence and other maturity signals before running the readiness estimate.`
        : [
            `${result.imagesAnalyzed} unique photos or retained frames were inspected in one ${modeLabel} and ${result.aiCreditsUsed} AI credit${result.aiCreditsUsed === 1 ? " was" : "s were"} charged, but the set is not reliable enough to fill trichome percentages.`,
            result.recommendation,
            ...(result.limitations || []),
            ...HARVEST_PHOTO_CHECKLIST
          ]
            .filter(Boolean)
            .join(" ")
    );
  }

  async function analyze() {
    if (
      photoCount < MIN_HARVEST_PHOTOS ||
      analysisBusy ||
      restoringEvidence ||
      evidenceUploadBusy ||
      !videoFrameSelection.ready
    )
      return;
    const quote = deepReviewOperation.quote;
    if (reviewQuoteRequired && !quote) {
      setFeedback(
        "Request the exact server quote first. Quote preparation validates the saved evidence and exact duplicates without sending media to OpenAI or using a credit."
      );
      return;
    }
    if (quote?.analysisMode === "deep") {
      if (!deepReviewOperation.quoteAccepted) {
        setFeedback(
          "Accept the exact Deep review image count, private OpenAI dispatch, and credit total before starting."
        );
        return;
      }
      setFeedback("");
      await deepReviewOperation.start();
      return;
    }

    const requestScopeKey = analysisScopeKey;
    const requestRevision = analysisRequestRevisionRef.current;
    setBusy(true);
    setFeedback("");
    try {
      const result = await analyzeTrichomePhotos(analysisInput);
      acceptAnalysisResult(
        result,
        requestScopeKey,
        requestRevision,
        quote
          ? {
              analysisMode: quote.analysisMode,
              selectedEvidenceCount: quote.selectedEvidenceCount,
              analyzedEvidenceCount: quote.analyzedEvidenceCount,
              batchCount: quote.batchCount,
              creditsQuoted: quote.creditsQuoted,
              manifestDigest: quote.manifestDigest,
              selectedEvidenceDigest: quote.selectedEvidenceDigest,
              analyzedEvidenceDigest: quote.analyzedEvidenceDigest
            }
          : undefined
      );
    } catch (error: any) {
      if (
        analysisScopeKeyRef.current !== requestScopeKey ||
        analysisRequestRevisionRef.current !== requestRevision
      ) {
        return;
      }
      mountedAnalysisRef.current = null;
      mountedAnalysisOperationIdRef.current = "";
      setAnalysis(null);
      setAnalysisOperationId("");
      onAnalysisDraft(null);
      setFeedback(
        harvestPhotoRecoveryMessage(
          error?.message
            ? `Photo analysis did not run: ${error.message}`
            : "Photo analysis did not run."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportSelectedFrames() {
    if (frameExportBusy) return;
    setFrameExportBusy(true);
    setFrameExportFeedback("");
    try {
      const result = await exportSelectedHarvestFrames({
        candidates: frameExportCandidates,
        selectedAssetIds: selectedFrameExportIds,
        workspace: evidenceWorkspace
      });
      setFrameExportFeedback(
        result.method === "web-download"
          ? `Downloaded a ${readableEvidenceBytes(result.exportedBytes)} private package containing only the ${result.exportedCount} selected retained frame${result.exportedCount === 1 ? "" : "s"}. Nothing was published.`
          : `Opened the device share sheet for a ${readableEvidenceBytes(result.exportedBytes)} private package containing only the ${result.exportedCount} selected retained frame${result.exportedCount === 1 ? "" : "s"}. GrowPath cannot observe recipient delivery. Nothing was published in GrowPath.`
      );
    } catch (error: any) {
      setFrameExportFeedback(
        error?.message || "The selected retained frames could not be saved or shared."
      );
    } finally {
      setFrameExportBusy(false);
    }
  }

  function updateFrameExportSelection(nextAssetIds: string[]) {
    const requestedIds = new Set(nextAssetIds.map(String).filter(Boolean));
    const exactSelection = frameExportCandidateIds.filter((id) => requestedIds.has(id));
    if (
      exactSelection.length !== requestedIds.size ||
      exactSelection.length > HARVEST_PRIVATE_FRAME_EXPORT_LIMIT
    ) {
      setFrameExportFeedback(
        exactSelection.length > HARVEST_PRIVATE_FRAME_EXPORT_LIMIT
          ? `Choose up to ${HARVEST_PRIVATE_FRAME_EXPORT_LIMIT} retained frames per private package, then export another package for additional frames.`
          : "The retained frame set changed. Review the exact frames and select them again."
      );
      return;
    }
    setSelectedFrameExportIds(exactSelection);
    setFrameExportFeedback("");
  }

  async function shareSignedResult() {
    if (!analysis || resultShareBusy || !isShareableSignedHarvestResult(analysis)) return;
    setResultShareBusy(true);
    setResultShareFeedback("");
    try {
      const method = await shareSignedHarvestResult(analysis);
      setResultShareFeedback(
        method === "web-clipboard"
          ? "The sanitized signed-result summary was copied. No media, IDs, receipt secrets, or private metadata were included."
          : "Share options opened for the sanitized signed-result summary. GrowPath cannot observe recipient delivery. No media, IDs, receipt secrets, or private metadata were included."
      );
    } catch (error: any) {
      setResultShareFeedback(
        error?.message || "The signed Harvest result could not be shared."
      );
    } finally {
      setResultShareBusy(false);
    }
  }

  function updateFeedDraftViewSelection(nextViewKeys: string[]) {
    if (feedReviewDraft) return;
    const requested = new Set(nextViewKeys.map(String).filter(Boolean));
    const exactSelection = feedDraftEligibleViews
      .map(aiInspectionViewIdentityKey)
      .filter((key) => requested.has(key));
    if (
      exactSelection.length !== requested.size ||
      exactSelection.length > HARVEST_FEED_DRAFT_MAX_VIEWS
    ) {
      setFeedReviewDraftFeedback(
        exactSelection.length > HARVEST_FEED_DRAFT_MAX_VIEWS
          ? `Choose no more than ${HARVEST_FEED_DRAFT_MAX_VIEWS} inspected zoom images for this Feed review draft.`
          : "The signed inspection-view set changed. Review the zoom images and select them again."
      );
      return;
    }
    setSelectedFeedDraftViewKeys(exactSelection);
    setFeedReviewDraftFeedback("");
  }

  async function createFeedReviewDraft() {
    if (
      feedReviewDraftBusy ||
      feedReviewDraft ||
      !feedDraftOperationId ||
      analysis?.analysisMode !== "deep" ||
      !isShareableSignedHarvestResult(analysis) ||
      selectedFeedDraftViews.length < 1 ||
      selectedFeedDraftViews.length > HARVEST_FEED_DRAFT_MAX_VIEWS
    ) {
      return;
    }
    const requestIdentity = feedDraftRequestIdentity;
    const operationId = feedDraftOperationId;
    const controller = new AbortController();
    feedDraftCreateControllerRef.current?.abort();
    feedDraftCreateControllerRef.current = controller;
    setFeedReviewDraftBusy(true);
    setFeedReviewDraftFeedback(
      "Revalidating the signed result and selected zoom images before creating the private Feed review draft..."
    );
    try {
      const packet = await createHarvestFeedReviewDraft(
        operationId,
        evidenceWorkspace,
        selectedFeedDraftViews.map(harvestFeedDraftView),
        { signal: controller.signal }
      );
      if (
        controller.signal.aborted ||
        feedDraftCreateControllerRef.current !== controller ||
        feedDraftRequestIdentityRef.current !== requestIdentity
      ) {
        return;
      }
      setFeedReviewDraft(packet.draft);
      setFeedReviewDraftFeedback(
        packet.idempotentReplay
          ? "The exact private GrowPath Feed review draft already existed and was restored. Nothing was published."
          : "Private GrowPath Feed review draft created. Review the result and selected zooms below before any publication."
      );
    } catch (error: any) {
      if (
        harvestRequestWasCancelled(error, controller.signal) ||
        feedDraftCreateControllerRef.current !== controller ||
        feedDraftRequestIdentityRef.current !== requestIdentity
      ) {
        return;
      }
      setFeedReviewDraftFeedback(
        error?.message || "GrowPath could not create the private Feed review draft."
      );
    } finally {
      if (feedDraftCreateControllerRef.current === controller) {
        feedDraftCreateControllerRef.current = null;
        setFeedReviewDraftBusy(false);
      }
    }
  }

  function confirmDeleteFeedReviewDraft() {
    if (!feedReviewDraft || feedReviewDraftBusy || !feedDraftOperationId) return;
    Alert.alert(
      "Delete private Feed draft?",
      "This removes only the owner-review Feed draft. It does not delete the signed Harvest result, retained source video, or zoom-source photos.",
      [
        { text: "Keep Draft", style: "cancel" },
        {
          text: "Delete Draft",
          style: "destructive",
          onPress: () => void deleteFeedReviewDraft()
        }
      ]
    );
  }

  async function deleteFeedReviewDraft() {
    if (!feedReviewDraft || feedReviewDraftBusy || !feedDraftOperationId) return;
    const requestIdentity = feedDraftRequestIdentity;
    const displayedDraftId = String(feedReviewDraft.id || "").trim();
    const controller = new AbortController();
    feedDraftDeleteControllerRef.current?.abort();
    feedDraftDeleteControllerRef.current = controller;
    setFeedReviewDraftBusy(true);
    setFeedReviewDraftFeedback("Deleting the private Feed review draft...");
    try {
      const deletion = await deleteHarvestFeedReviewDraft(
        feedDraftOperationId,
        evidenceWorkspace,
        { signal: controller.signal }
      );
      if (
        controller.signal.aborted ||
        feedDraftDeleteControllerRef.current !== controller ||
        feedDraftRequestIdentityRef.current !== requestIdentity
      ) {
        return;
      }
      if (
        deletion.draftId !== displayedDraftId ||
        String(feedReviewDraftRef.current?.id || "").trim() !== displayedDraftId
      ) {
        throw new Error(
          "GrowPath confirmed deletion for a different private Feed draft. The displayed draft remains visible until its exact ID is verified."
        );
      }
      setFeedReviewDraft(null);
      setFeedReviewDraftFeedback(
        "The private Feed review draft was deleted. Nothing was published, and the signed Harvest result and source evidence were kept."
      );
    } catch (error: any) {
      if (
        harvestRequestWasCancelled(error, controller.signal) ||
        feedDraftDeleteControllerRef.current !== controller ||
        feedDraftRequestIdentityRef.current !== requestIdentity
      ) {
        return;
      }
      setFeedReviewDraftFeedback(
        error?.message || "GrowPath could not delete the private Feed review draft."
      );
    } finally {
      if (feedDraftDeleteControllerRef.current === controller) {
        feedDraftDeleteControllerRef.current = null;
        setFeedReviewDraftBusy(false);
      }
    }
  }

  async function prepareNewReviewQuote() {
    if (feedReviewDraft) {
      setFeedReviewDraftFeedback(
        "Delete the private GrowPath Feed review draft before preparing a new review. The completed operation remains saved so this draft cannot be orphaned."
      );
      return;
    }
    if (feedDraftLookupBusy || feedReviewDraftBusy || !privateFeedDraftLifecycleSettled) {
      setFeedReviewDraftFeedback(
        "GrowPath must finish checking the completed operation for a private Feed draft before preparing a new review. Its durable operation address has not been cleared."
      );
      return;
    }
    const reset = await deepReviewOperation.resetTerminal();
    if (!reset) return;
    analysisRequestRevisionRef.current += 1;
    mountedAnalysisRef.current = null;
    mountedAnalysisOperationIdRef.current = "";
    setAnalysis(null);
    setAnalysisOperationId("");
    onAnalysisDraft(null);
    setSelectedFeedDraftViewKeys([]);
    setFeedReviewDraft(null);
    setFeedReviewDraftFeedback("");
    setFeedback(
      "GrowPath confirmed there is no private Feed draft before clearing this screen's completed-operation mapping. A saved review remains available from Saved Runs. You can now prepare a new exact quote."
    );
  }

  async function submitCalibrationFeedback() {
    if (!analysis?.analysisId || calibrationBusy) return;
    const choice = HARVEST_CALIBRATION_CHOICES.find(
      (candidate) => candidate.key === calibrationChoice
    );
    if (!choice) {
      setCalibrationStatus("Choose how the estimate compares with what you can see.");
      return;
    }
    const amberText = observedAmberPercent.trim();
    const amberPercent = amberText === "" ? null : Number(amberText);
    if (
      amberPercent !== null &&
      (!Number.isFinite(amberPercent) || amberPercent < 0 || amberPercent > 100)
    ) {
      setCalibrationStatus("Enter an amber estimate from 0 to 100, or leave it blank.");
      return;
    }
    if (
      (choice.key === "amber_higher" || choice.key === "amber_lower") &&
      amberPercent === null
    ) {
      setCalibrationStatus(
        "Add your approximate visible-area amber percentage so the correction is useful."
      );
      return;
    }
    if (calibrationConsent && !calibrationRightsConfirmed) {
      setCalibrationStatus(
        "Confirm that you own these photos or have permission before authorizing calibration use."
      );
      return;
    }

    setCalibrationBusy(true);
    setCalibrationStatus("");
    try {
      await submitHarvestTrichomeFeedback({
        analysisId: analysis.analysisId,
        estimateAlignment: choice.key,
        ...(amberPercent === null
          ? {}
          : { ownerVisibleAmberPercent: Math.round(amberPercent) }),
        basis: calibrationNotes.trim() || undefined,
        consentForModelTraining: calibrationConsent,
        ...(calibrationConsent && calibrationRightsConfirmed
          ? {
              calibrationAuthorization: {
                version: "harvest-trichome-calibration-consent-v1" as const,
                rightsConfirmed: true as const,
                scope: "internal_ai_evaluation_and_calibration" as const,
                publicUseAuthorized: false as const
              }
            }
          : {})
      });
      setCalibrationStatus(
        calibrationConsent
          ? "Correction saved with permission to use it for model calibration. No AI credit was used."
          : "Correction saved for product review only. It will not be used for model training. No AI credit was used."
      );
    } catch (error: any) {
      setCalibrationStatus(
        error?.message
          ? `Correction could not be saved: ${error.message}`
          : "Correction could not be saved. Try again without rerunning the photo review."
      );
    } finally {
      setCalibrationBusy(false);
    }
  }

  const frameSelectionManifest = videoFrameSelection.extraction?.preselection;
  const frameSelectionMutationLocked =
    videoFrameSelection.requestBusy ||
    videoFrameSelection.status === "processing" ||
    videoFrameSelection.verificationPending;
  const activeVideoPlan = harvestVideoReviewPlan({
    status: videoFrameSelection.status,
    chosenCeiling: videoReviewImageCeiling,
    requestedFrameCount: videoFrameSelection.extraction?.requestedFrameCount,
    targetFrameCount: frameSelectionManifest?.targetFrameCount,
    selectedCount: frameSelectionManifest?.selectedCount
  });
  const selectedVideoPlanCeiling = activeVideoPlan.selectedCeiling;
  const videoPlanLocked = Boolean(
    activeVideoPlan.restoreLocked || frameSelectionMutationLocked
  );
  const selectedFrameBytePercent = frameSelectionManifest?.selectedByteLimit
    ? Math.min(
        100,
        Math.round(
          (Number(frameSelectionManifest.selectedBytesTotal || 0) /
            Number(frameSelectionManifest.selectedByteLimit)) *
            100
        )
      )
    : 0;
  const exactReviewQuote = deepReviewOperation.quote;
  const exactQuotedCredits = exactReviewQuote?.creditsQuoted;
  const quoteMissing = reviewQuoteRequired && !exactReviewQuote;
  const deepQuoteUnaccepted = Boolean(
    exactReviewQuote?.analysisMode === "deep" && !deepReviewOperation.quoteAccepted
  );
  const analyzeDisabled = Boolean(
    analysisBusy ||
    restoringEvidence ||
    evidenceUploadBusy ||
    !videoFrameSelection.ready ||
    photoCount < MIN_HARVEST_PHOTOS ||
    quoteMissing ||
    deepQuoteUnaccepted ||
    (!growId && !standaloneCropContextConfirmed) ||
    deepReviewOperation.operation
  );

  return (
    <View style={photoStyles.card}>
      <Text accessibilityRole="header" aria-level={2} style={photoStyles.title}>
        AI trichome evidence review (one readiness input)
      </Text>
      <Text style={photoStyles.help}>
        The free readiness calculator works from observations you enter. Optional AI photo
        review uses 1 AI credit for 4–12 unique images. For a larger selected set, the
        server first removes exact duplicate bytes and returns the exact signed Deep
        review batch and credit quote (maximum 7 credits). Credits are reserved only when
        you press Analyze. A failure proven to precede every provider dispatch refunds the
        full reservation. After dispatch starts, GrowPath never resends the batch; if no
        safe aggregate can be committed, the accepted reservation stays held for support
        reconciliation. Photo review never makes the harvest decision by itself. You can
        add up to {MAX_HARVEST_USER_PHOTOS} direct photos. A private video can be scanned
        for distinct, usable frames within the combined {MAX_HARVEST_PROVIDER_IMAGES}
        -image review ceiling. That ceiling is not a target, and extra images never
        replace the required macro roles.
      </Text>
      {!growId ? (
        <View style={photoStyles.checklist} accessibilityLabel="Standalone crop context">
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={photoStyles.checklistTitle}
          >
            Confirm standalone crop context
          </Text>
          <View style={photoStyles.consentRow}>
            <Switch
              accessibilityLabel="Confirm this standalone evidence is cannabis or hemp flower"
              value={standaloneCropContextConfirmed}
              onValueChange={setStandaloneCropContextConfirmed}
            />
            <Text style={[photoStyles.help, { flex: 1 }]}>
              This evidence is cannabis or hemp flower. This confirmation enables the
              cannabis-specific review without attaching it to a Grow.
            </Text>
          </View>
        </View>
      ) : null}
      <View style={photoStyles.checklist} accessibilityLabel="Harvest photo checklist">
        <Text
          accessibilityRole="header"
          aria-level={3}
          style={photoStyles.checklistTitle}
        >
          Photo checklist before analysis
        </Text>
        {HARVEST_PHOTO_CHECKLIST.map((item, index) => (
          <Text key={item} style={photoStyles.checklistItem}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>
      {workspaceType === "personal" && growId ? (
        <SavedGrowPhotoEvidencePicker
          growId={growId}
          plantId={plantId}
          purpose="harvest"
          value={evidenceAssets}
          onChange={addSavedGrowEvidence}
          maxPhotos={MAX_HARVEST_PROVIDER_IMAGES}
          maxUserPhotos={MAX_HARVEST_USER_PHOTOS}
        />
      ) : null}
      {restoringEvidence ? (
        <Text style={photoStyles.feedback}>Restoring saved harvest evidence...</Text>
      ) : restoreFeedback ? (
        <Text style={photoStyles.feedback}>{restoreFeedback}</Text>
      ) : null}
      {videoFrameSelection.sourceVideo ? (
        <View
          style={photoStyles.frameSelectionPanel}
          accessibilityLabel="Harvest video frame selection"
        >
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={photoStyles.checklistTitle}
          >
            Private video review preparation
          </Text>
          <Text style={photoStyles.help}>
            GrowPath scans roughly one low-resolution candidate per second, up to the
            server&apos;s bounded candidate limit. Blur, severe exposure/glare, decode
            failures, and near-duplicates are rejected before durable storage. Only the
            private source video, compact audit manifest, and retained review frames are
            saved. Rejected candidates are temporary and are not kept as evidence.
          </Text>
          <Text style={photoStyles.help}>
            Choose the retained-image ceiling before extraction. Standard keeps the
            complete review at 12 images or fewer. Deep can retain more only after you
            choose it, and still requires a later exact server quote and explicit credit
            acceptance before OpenAI receives any images.
          </Text>
          <View style={photoStyles.frameSelectionMetrics}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use standard video frame selection"
              accessibilityState={{
                selected: selectedVideoPlanCeiling === 12,
                disabled: videoPlanLocked
              }}
              disabled={videoPlanLocked}
              onPress={() => setVideoReviewImageCeiling(12)}
              style={[
                photoStyles.secondaryButton,
                videoPlanLocked && photoStyles.disabled
              ]}
            >
              <Text style={photoStyles.secondaryButtonText}>
                {selectedVideoPlanCeiling === 12 ? "Selected: " : ""}
                Standard · 12 Total Images
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use Deep video frame selection"
              accessibilityState={{
                selected: selectedVideoPlanCeiling === 80,
                disabled: videoPlanLocked
              }}
              disabled={videoPlanLocked}
              onPress={() => setVideoReviewImageCeiling(80)}
              style={[
                photoStyles.secondaryButton,
                videoPlanLocked && photoStyles.disabled
              ]}
            >
              <Text style={photoStyles.secondaryButtonText}>
                {selectedVideoPlanCeiling === 80 ? "Selected: " : ""}
                Deep · Up to 80 Total Images
              </Text>
            </Pressable>
          </View>
          <Text style={photoStyles.help}>
            The final retained count is chosen for quality, timeline coverage, and
            sequence comparison. Up to{" "}
            {Math.max(0, selectedVideoPlanCeiling - directPhotoCount)} frame slots are
            currently available under the selected {selectedVideoPlanCeiling}-image
            ceiling. A ceiling is not a recommendation.
          </Text>
          {frameSelectionManifest ? (
            <View style={photoStyles.frameSelectionMetrics}>
              <Text style={photoStyles.metricText}>
                Candidates sampled: {frameSelectionManifest.sampledCount} /{" "}
                {frameSelectionManifest.candidateLimit}
              </Text>
              <Text style={photoStyles.metricText}>
                Quality-usable: {frameSelectionManifest.qualityUsableCount} · rejected:{" "}
                {frameSelectionManifest.qualityRejectedCount} · near-duplicates removed:{" "}
                {frameSelectionManifest.duplicateCandidateCount}
              </Text>
              <Text style={photoStyles.metricText}>
                Distinct candidates: {frameSelectionManifest.distinctCandidateCount} ·
                retained frames: {frameSelectionManifest.selectedCount} · timeline buckets
                covered: {frameSelectionManifest.coveredBucketCount}
              </Text>
              <Text style={photoStyles.metricText}>
                Retained-frame storage:{" "}
                {readableEvidenceBytes(frameSelectionManifest.selectedBytesTotal)} /{" "}
                {readableEvidenceBytes(frameSelectionManifest.selectedByteLimit)}{" "}
                {selectedFrameBytePercent
                  ? `(${selectedFrameBytePercent}% of the extraction byte budget)`
                  : ""}
              </Text>
              <Text style={photoStyles.metricText}>
                Sequence frames marked for adjacent comparison are reviewed for
                persistence versus glare but are not counted as independent heads.
              </Text>
            </View>
          ) : (
            <Text style={photoStyles.help}>
              Source video:{" "}
              {readableEvidenceBytes(videoFrameSelection.sourceVideo.fileSizeBytes)}. The
              server applies a separate retained-frame byte budget before saving the
              selected set.
            </Text>
          )}
          {videoFrameSelection.notice ? (
            <Text accessibilityLiveRegion="polite" style={photoStyles.feedback}>
              {videoFrameSelection.notice}
            </Text>
          ) : null}
          {videoFrameSelection.error ? (
            <Text accessibilityRole="alert" style={photoStyles.warning}>
              {videoFrameSelection.error}
            </Text>
          ) : null}
          {!videoFrameSelection.ready ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={videoFrameSelection.actionLabel}
              accessibilityState={{ disabled: videoFrameSelection.actionDisabled }}
              disabled={videoFrameSelection.actionDisabled}
              onPress={videoFrameSelection.action}
              style={[
                photoStyles.secondaryButton,
                videoFrameSelection.actionDisabled && photoStyles.disabled
              ]}
            >
              <Text style={photoStyles.secondaryButtonText}>
                {videoFrameSelection.actionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <MediaEvidencePicker
        maxPhotos={MAX_HARVEST_PROVIDER_IMAGES}
        maxUserPhotos={MAX_HARVEST_USER_PHOTOS}
        allowVideo
        serverFrameExtractionOnly
        maxVideoSeconds={599}
        purpose="harvest"
        aiUsable
        sourceContext={{
          growId: growId || undefined,
          plantId: plantId || undefined,
          facilityId: workspaceType === "facility" ? facilityId : undefined
        }}
        videoWorkspaceType={workspaceType}
        videoWorkspaceId={workspaceId}
        value={evidenceAssets}
        onChange={updateEvidence}
        onBusyChange={setEvidenceUploadBusy}
        disabled={analysisBusy || frameSelectionMutationLocked}
        generatedFramePreviewLimit={HARVEST_FRAME_PREVIEW_LIMIT}
        generatedFramesReadOnly
        generatedFrameExportSelection={{
          eligibleAssetIds: frameExportCandidateIds,
          selectedAssetIds: selectedFrameExportIds,
          onChange: updateFrameExportSelection,
          disabled: frameExportBusy || frameSelectionMutationLocked
        }}
      />
      {frameExportCandidates.length ? (
        <View
          accessibilityLabel="Private retained-frame save and share"
          style={photoStyles.frameSelectionPanel}
        >
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={photoStyles.checklistTitle}
          >
            Save or share selected retained frames
          </Text>
          <Text style={photoStyles.help}>
            Nothing is selected or public by default. Use the checkbox on an exact
            server-retained frame above, then export only those selected frames through an
            authenticated download or your device share sheet. The package never includes
            the source video, rejected or unselected frames, GPS/EXIF, private record IDs,
            storage URLs, or AI receipt secrets, and it does not create a GrowPath post or
            public link. Choose up to {HARVEST_PRIVATE_FRAME_EXPORT_LIMIT} frames per
            package (24 MiB maximum), then repeat with another selection if you want more.
          </Text>
          <Text style={photoStyles.metricText}>
            Selected for this private package: {selectedFrameExportIds.length} of{" "}
            {HARVEST_PRIVATE_FRAME_EXPORT_LIMIT} maximum; {frameExportCandidates.length}{" "}
            retained available
            {selectedFrameExportKnownBytes
              ? ` · ${readableEvidenceBytes(selectedFrameExportKnownBytes)} known retained bytes`
              : ""}
          </Text>
          <View style={photoStyles.frameSelectionMetrics}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear retained video frame export selection"
              disabled={frameExportBusy || !selectedFrameExportIds.length}
              onPress={() => setSelectedFrameExportIds([])}
              style={[
                photoStyles.secondaryButton,
                (frameExportBusy || !selectedFrameExportIds.length) &&
                  photoStyles.disabled
              ]}
            >
              <Text style={photoStyles.secondaryButtonText}>Clear Selection</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save or share selected retained video frames privately"
              disabled={frameExportBusy || !selectedFrameExportIds.length}
              onPress={() => void exportSelectedFrames()}
              style={[
                photoStyles.secondaryButton,
                (frameExportBusy || !selectedFrameExportIds.length) &&
                  photoStyles.disabled
              ]}
            >
              <Text style={photoStyles.secondaryButtonText}>
                {frameExportBusy
                  ? "Preparing Private Package..."
                  : "Save / Share Selected"}
              </Text>
            </Pressable>
          </View>
          {frameExportFeedback ? (
            <Text accessibilityLiveRegion="polite" style={photoStyles.feedback}>
              {frameExportFeedback}
            </Text>
          ) : null}
        </View>
      ) : null}
      {reviewQuoteRequired ? (
        <View
          style={photoStyles.frameSelectionPanel}
          accessibilityLabel="Exact harvest review quote"
        >
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={photoStyles.checklistTitle}
          >
            Exact image and credit quote
          </Text>
          {!exactReviewQuote && !deepReviewOperation.operationActive ? (
            <>
              <Text style={photoStyles.help}>
                GrowPath must first verify the exact saved still/frame manifest and
                exact-byte duplicates. Preparing this quote does not send media to OpenAI
                and does not use a credit.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Get exact harvest review quote"
                accessibilityState={{
                  disabled: Boolean(
                    deepReviewOperation.busy ||
                    !videoFrameSelection.ready ||
                    (!growId && !standaloneCropContextConfirmed)
                  )
                }}
                disabled={Boolean(
                  deepReviewOperation.busy ||
                  !videoFrameSelection.ready ||
                  (!growId && !standaloneCropContextConfirmed)
                )}
                onPress={deepReviewOperation.requestQuote}
                style={[
                  photoStyles.secondaryButton,
                  (deepReviewOperation.busy ||
                    !videoFrameSelection.ready ||
                    (!growId && !standaloneCropContextConfirmed)) &&
                    photoStyles.disabled
                ]}
              >
                <Text style={photoStyles.secondaryButtonText}>
                  {deepReviewOperation.busy === "quoting"
                    ? "Preparing Exact Quote..."
                    : "Get Exact Review Quote"}
                </Text>
              </Pressable>
            </>
          ) : null}
          {exactReviewQuote ? (
            <View style={photoStyles.frameSelectionMetrics}>
              <Text style={photoStyles.metricText}>
                Selected stills/retained frames: {exactReviewQuote.selectedEvidenceCount}
                {exactReviewQuote.sourceVideoSelected
                  ? " · private source video retained as provenance"
                  : ""}
              </Text>
              <Text style={photoStyles.metricText}>
                Unique originals for analysis: {exactReviewQuote.analyzedEvidenceCount} ·
                exact duplicates not resent: {exactReviewQuote.duplicateEvidenceCount}
              </Text>
              <Text style={photoStyles.metricText}>
                {exactReviewQuote.analysisMode === "deep"
                  ? `Deep review: ${exactReviewQuote.batchCount} signed batches · ${exactReviewQuote.creditsQuoted} AI credits`
                  : "Standard review: 1 signed batch · 1 AI credit"}
              </Text>
              <Text style={photoStyles.warning}>
                When you press Analyze, GrowPath will send the
                {` ${exactReviewQuote.analyzedEvidenceCount} `}
                unique still images from this exact selected set privately to OpenAI for
                this Harvest review. The private source video, rejected candidates, and
                exact duplicate bytes are not sent. GPS/EXIF location or capture-date
                metadata and unrelated account data are not sent. Preparing or accepting
                this quote alone sends no media and uses no credit.
              </Text>
              {exactReviewQuote.analysisMode === "deep" && exactReviewQuote.expiresAt ? (
                <Text style={photoStyles.help}>
                  Quote expires {new Date(exactReviewQuote.expiresAt).toLocaleString()}.
                </Text>
              ) : null}
              {exactReviewQuote.analysisMode === "deep" ? (
                <View style={photoStyles.consentRow}>
                  <Switch
                    accessibilityLabel={`Accept ${exactReviewQuote.creditsQuoted}-credit Deep review and private OpenAI image dispatch`}
                    value={deepReviewOperation.quoteAccepted}
                    onValueChange={deepReviewOperation.acceptQuote}
                    disabled={Boolean(
                      deepReviewOperation.busy || deepReviewOperation.operationActive
                    )}
                  />
                  <Text style={photoStyles.consentText}>
                    I accept this exact private image dispatch and
                    {` ${exactReviewQuote.creditsQuoted}-credit `}
                    Deep review. One aggregate result appears only after every signed
                    batch completes. A failure before every provider dispatch refunds the
                    full reservation; after dispatch starts, GrowPath will not resend it
                    and may hold the accepted reservation for support reconciliation.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {deepReviewOperation.operation || deepReviewOperation.recoveryPending ? (
            <View style={photoStyles.frameSelectionMetrics}>
              <Text style={photoStyles.metricText}>
                Durable Deep review:{" "}
                {deepReviewOperation.operation?.status || "recovering saved request"}
                {deepReviewOperation.operation
                  ? ` · ${deepReviewOperation.operation.completedBatches || 0} of ${deepReviewOperation.operation.batchCount} batches complete`
                  : ""}
              </Text>
              <UnsavedHarvestDeepResultDiscard
                operation={deepReviewOperation.operation}
                busy={Boolean(deepReviewOperation.busy)}
                onDiscard={deepReviewOperation.discardSucceeded}
              />
              {!deepReviewOperation.terminalResetAllowed ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Check Deep review progress"
                  disabled={Boolean(deepReviewOperation.busy)}
                  onPress={deepReviewOperation.refresh}
                  style={[
                    photoStyles.secondaryButton,
                    deepReviewOperation.busy && photoStyles.disabled
                  ]}
                >
                  <Text style={photoStyles.secondaryButtonText}>
                    {deepReviewOperation.busy === "polling"
                      ? "Checking Deep Review..."
                      : deepReviewOperation.recoveryPending &&
                          !deepReviewOperation.operation
                        ? "Recover / Retry Same Accepted Review"
                        : "Check Deep Review Progress"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Prepare a new harvest review quote"
                  disabled={prepareNewReviewBlocked}
                  onPress={() => void prepareNewReviewQuote()}
                  style={[
                    photoStyles.secondaryButton,
                    prepareNewReviewBlocked && photoStyles.disabled
                  ]}
                >
                  <Text style={photoStyles.secondaryButtonText}>
                    Prepare a New Review Quote
                  </Text>
                </Pressable>
              )}
              {deepReviewOperation.terminalResetAllowed && prepareNewReviewBlocked ? (
                <Text style={photoStyles.help}>
                  {feedReviewDraft
                    ? "Delete the existing private Feed review draft first. GrowPath keeps the completed operation address until that exact draft is gone."
                    : "GrowPath is checking this completed operation for a private Feed review draft. Prepare New Review stays unavailable until that check finishes."}
                </Text>
              ) : null}
            </View>
          ) : null}
          {deepReviewOperation.notice ? (
            <Text accessibilityLiveRegion="polite" style={photoStyles.feedback}>
              {deepReviewOperation.notice}
            </Text>
          ) : null}
          {deepReviewOperation.error ? (
            <Text accessibilityRole="alert" style={photoStyles.warning}>
              {deepReviewOperation.error}
            </Text>
          ) : null}
        </View>
      ) : null}
      <TextInput
        accessibilityLabel="Harvest photo notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional but helpful: Photo 1 top macro, Photo 2 middle macro, Photo 3 lower macro, Photo 4 context; include lens/magnification and lighting"
        placeholderTextColor={palette.textMuted}
        editable={!analysisBusy}
        style={photoStyles.input}
      />
      <Pressable
        accessibilityLabel="Analyze harvest trichome photo"
        onPress={analyze}
        disabled={analyzeDisabled}
        style={[photoStyles.button, analyzeDisabled && photoStyles.disabled]}
      >
        <Text style={photoStyles.buttonText}>
          {analysisBusy
            ? exactReviewQuote?.analysisMode === "deep"
              ? "Running Deep Review..."
              : "Inspecting Photos..."
            : reviewQuoteRequired && !exactReviewQuote
              ? "Analyze Photos / Frames (Exact Quote Required)"
              : `${exactReviewQuote?.analysisMode === "deep" ? "Start Accepted Deep Review" : "Analyze Photos / Frames"} (${exactQuotedCredits ?? 1} AI Credit${(exactQuotedCredits ?? 1) === 1 ? "" : "s"})`}
        </Text>
      </Pressable>
      {!growId ? (
        <Text style={photoStyles.feedback}>
          Standalone review: upload the required photos now. Attaching a grow is optional
          and only adds saved history and linked actions.
        </Text>
      ) : null}
      {!photoCount ? (
        <Text style={photoStyles.warning}>
          No trichome evidence is ready. Add three sharp macro bud-site samples and one
          wider context photo. Ordinary whole-plant photos cannot support
          clear/cloudy/amber percentages.
        </Text>
      ) : photoCount < MIN_HARVEST_PHOTOS ? (
        <Text style={photoStyles.warning}>
          Add {MIN_HARVEST_PHOTOS - photoCount} more photo
          {MIN_HARVEST_PHOTOS - photoCount === 1 ? "" : "s"}. The required set is three
          sharp macros from top, middle, and lower bud sites plus one wider bud-context
          photo. Analysis is blocked, so no AI credit will be used yet.
        </Text>
      ) : null}
      {feedback ? <Text style={photoStyles.feedback}>{feedback}</Text> : null}
      {analysis ? (
        <View
          accessibilityLabel="Harvest photo analysis result"
          style={photoStyles.analysis}
        >
          <Text style={photoStyles.analysisTitle}>
            {analysis.photoUsable
              ? "Qualified macro evidence"
              : analysis.visibleSampleEstimateUsable
                ? "Visible-area estimate — review before using"
                : "Better photos needed — no sampled-head estimate"}
          </Text>
          <Text style={photoStyles.feedback}>
            Image quality: {analysis.imageQuality} · Confidence:{" "}
            {Math.round(analysis.confidence * 100)}%
          </Text>
          <Text style={photoStyles.feedback}>
            Inspected by {analysis.providerLabel} ({analysis.providerModel}) · photos or
            retained frames: {analysis.imagesAnalyzed}
          </Text>
          {analysis.batchSummaries?.length ? (
            <Text style={photoStyles.feedback}>
              Provider batches: {analysis.batchSummaries.length}. GrowPath reconciled them
              into this one evidence-bound review and one aggregate receipt. The charged
              credit total below covers the complete review.
            </Text>
          ) : null}
          {typeof analysis.diagnosticViewsAnalyzed === "number" ? (
            <Text style={photoStyles.feedback}>
              Enlarged diagnostic views inspected: {analysis.diagnosticViewsAnalyzed}.
              These supplement the original-resolution photos and are not extra samples.
            </Text>
          ) : null}
          {analysis.imageDetail ? (
            <Text style={photoStyles.feedback}>
              Provider image detail: {analysis.imageDetail}
            </Text>
          ) : null}
          <Text style={photoStyles.feedback}>
            AI credit: {analysis.aiCreditsUsed} charged
            {typeof analysis.aiTokensRemaining === "number"
              ? ` · ${analysis.aiTokensRemaining} remaining`
              : ""}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share signed Harvest review summary"
            accessibilityHint="Shares a sanitized readable summary only. It does not share images, private IDs, or receipt secrets."
            disabled={resultShareBusy || !isShareableSignedHarvestResult(analysis)}
            onPress={() => void shareSignedResult()}
            style={[
              photoStyles.secondaryButton,
              (resultShareBusy || !isShareableSignedHarvestResult(analysis)) &&
                photoStyles.disabled
            ]}
          >
            <Text style={photoStyles.secondaryButtonText}>
              {resultShareBusy ? "Opening Share Options..." : "Share Signed Summary"}
            </Text>
          </Pressable>
          <Text style={photoStyles.help}>
            This explicit share contains a sanitized readable summary only. It does not
            include images, the source video, notes, location/date metadata, private IDs,
            provider IDs, signatures, digests, or storage URLs, and it does not publish a
            GrowPath record.
          </Text>
          {resultShareFeedback ? (
            <Text accessibilityLiveRegion="polite" style={photoStyles.feedback}>
              {resultShareFeedback}
            </Text>
          ) : null}
          {analysis.inspectionViews?.length ? (
            <EvidenceReviewPanel
              review={{
                requested: true,
                performed: true,
                photoCount: analysis.imagesAnalyzed,
                photosAnalyzed: analysis.imagesAnalyzed,
                quality: analysis.imageQuality,
                confidence:
                  analysis.confidence >= 0.75
                    ? "high"
                    : analysis.confidence >= 0.45
                      ? "medium"
                      : "low",
                providerLabel: analysis.providerLabel,
                evidenceUsed: [
                  `${analysis.imagesAnalyzed} authenticated private still image${
                    analysis.imagesAnalyzed === 1 ? "" : "s"
                  } inspected; private evidence identifiers are intentionally hidden`
                ],
                counterEvidence: [],
                missingInformation: [],
                requiredNextPhotos: [],
                limitations: analysis.limitations || [],
                inspectionViews: analysis.inspectionViews
              }}
              inspectionWorkspace={evidenceWorkspace}
              feedDraftSelection={
                analysis.analysisMode === "deep" && feedDraftOperationId
                  ? {
                      selectedViewKeys: selectedFeedDraftViewKeys,
                      maxSelected: HARVEST_FEED_DRAFT_MAX_VIEWS,
                      disabled: feedReviewDraftBusy || Boolean(feedReviewDraft),
                      onChange: updateFeedDraftViewSelection
                    }
                  : undefined
              }
            />
          ) : null}
          {analysis.analysisMode === "deep" && feedDraftOperationId ? (
            <View
              accessibilityLabel="GrowPath Feed Harvest review draft"
              style={photoStyles.qualityChecks}
            >
              <Text style={photoStyles.checklistTitle}>GrowPath Feed review draft</Text>
              <Text style={photoStyles.help}>
                Choose 1–{HARVEST_FEED_DRAFT_MAX_VIEWS} useful inspected zoom images
                above. GrowPath revalidates this signed aggregate and regenerates each
                selected crop from its protected original. The source video, GPS/EXIF,
                private notes, storage links, provider IDs, receipt values, and unrelated
                data are excluded. Creating this draft does not publish it.
              </Text>
              <Text style={photoStyles.feedback}>
                Selected zoom images: {selectedFeedDraftViews.length} of{" "}
                {HARVEST_FEED_DRAFT_MAX_VIEWS}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create private GrowPath Feed review draft"
                accessibilityHint="Creates an owner-only draft for review and does not publish it."
                disabled={
                  feedReviewDraftBusy ||
                  Boolean(feedReviewDraft) ||
                  selectedFeedDraftViews.length < 1
                }
                onPress={() => void createFeedReviewDraft()}
                style={[
                  photoStyles.secondaryButton,
                  (feedReviewDraftBusy ||
                    Boolean(feedReviewDraft) ||
                    selectedFeedDraftViews.length < 1) &&
                    photoStyles.disabled
                ]}
              >
                <Text style={photoStyles.secondaryButtonText}>
                  {feedReviewDraft
                    ? "Private Feed Draft Ready"
                    : feedReviewDraftBusy
                      ? "Creating Private Feed Draft..."
                      : "Create Private Feed Review Draft"}
                </Text>
              </Pressable>
              {feedReviewDraft ? (
                <View accessibilityLabel="Private Harvest Feed draft preview">
                  <Text style={photoStyles.analysisTitle}>{feedReviewDraft.title}</Text>
                  <Text style={photoStyles.feedback}>{feedReviewDraft.body}</Text>
                  <Text style={photoStyles.help}>
                    Draft · owner review only · {feedReviewDraft.selectedViewCount}{" "}
                    selected supplemental zoom image
                    {feedReviewDraft.selectedViewCount === 1 ? "" : "s"}. These images do
                    not count as independent samples. Nothing has been posted publicly or
                    sent to Facebook.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete private GrowPath Feed review draft"
                    accessibilityHint="Asks for confirmation, then deletes only this private owner-review draft."
                    disabled={feedReviewDraftBusy}
                    onPress={confirmDeleteFeedReviewDraft}
                    style={[
                      photoStyles.secondaryButton,
                      feedReviewDraftBusy && photoStyles.disabled
                    ]}
                  >
                    <Text style={photoStyles.secondaryButtonText}>
                      Delete Private Feed Draft
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {feedReviewDraftFeedback ? (
                <Text accessibilityLiveRegion="polite" style={photoStyles.feedback}>
                  {feedReviewDraftFeedback}
                </Text>
              ) : null}
            </View>
          ) : null}
          {analysis.photoUsable ? (
            <Text style={photoStyles.feedback}>
              AI estimate: {Math.round(Number(analysis.cloudy) * 100)}% cloudy,{" "}
              {Math.round(Number(analysis.amber) * 100)}% amber,{" "}
              {Math.round(Number(analysis.clear) * 100)}% clear.
            </Text>
          ) : null}
          {analysis.visibleSampleEstimateUsable ? (
            <View style={photoStyles.qualityChecks}>
              <Text style={photoStyles.checklistTitle}>
                Visible sampled-head evidence
              </Text>
              <Text style={photoStyles.feedback}>
                {Math.round(Number(analysis.sampleClear) * 100)}% clear ·{" "}
                {Math.round(Number(analysis.sampleCloudy) * 100)}% cloudy ·{" "}
                {Math.round(
                  Number(analysis.sampleAmberMin ?? analysis.sampleAmber) * 100
                )}
                % directly confirmed amber · up to{" "}
                {Math.round(
                  Number(analysis.sampleAmberMax ?? analysis.sampleAmber) * 100
                )}
                % possible amber total ·{" "}
                {Math.round(Number(analysis.sampleCloudyOrGlare) * 100)}% cloudy or glare
              </Text>
              {Number(analysis.sampleAmberOrWarmLight) > 0 ? (
                <Text style={photoStyles.warning}>
                  The possible-amber upper bound includes{" "}
                  {Math.round(Number(analysis.sampleAmberOrWarmLight) * 100)}% of resolved
                  yellow, orange, or brown heads that the current lighting could not
                  separate from a warm cast. Those heads are not counted as confirmed
                  amber.
                </Text>
              ) : null}
              <Text style={photoStyles.warning}>
                Directly confirmed amber is a strict evidence floor, not the tool&apos;s
                claim that the photographed sample is probably that low. The possible
                total includes every resolved colored head that current lighting leaves
                ambiguous; review the two values with the lighting note and per-photo
                breakdown.
              </Text>
              {Number(analysis.visibleSampleHeadCount) > 0 ? (
                <Text style={photoStyles.feedback}>
                  Counted heads: {analysis.visibleSampleHeadCount} · Counting confidence:{" "}
                  {analysis.visibleSampleCountingConfidence || "low"} · Percentages
                  calculated from the per-photo tallies
                </Text>
              ) : null}
              <Text style={photoStyles.warning}>
                This estimates only the intact heads visible in the inspected photo areas.
                It is never a whole-plant percentage and does not prove that other bud
                sites match.
              </Text>
              {analysis.sampleEstimateBasis ? (
                <Text style={photoStyles.feedback}>
                  Basis: {analysis.sampleEstimateBasis}
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={photoStyles.feedback}>
            Amber visibility:{" "}
            {(analysis.amberVisibility || "uncertain").replaceAll("_", " ")}
            {analysis.amberEvidenceBasis ? ` · ${analysis.amberEvidenceBasis}` : ""}
          </Text>
          <Text style={photoStyles.feedback}>
            Cloudiness observation:{" "}
            {(analysis.cloudinessObservation || "uncertain").replaceAll("_", " ")}
            {typeof analysis.cloudinessConfidence === "number"
              ? ` · ${Math.round(analysis.cloudinessConfidence * 100)}% confidence`
              : ""}
            {analysis.cloudinessBasis ? ` · ${analysis.cloudinessBasis}` : ""}
          </Text>
          <Text style={photoStyles.feedback}>
            Gland-head development:{" "}
            {(analysis.headDevelopmentObservation || "uncertain").replaceAll("_", " ")}
            {analysis.headDevelopmentSignals?.length
              ? ` · ${analysis.headDevelopmentSignals.map(harvestHeadDevelopmentSignalLabel).join(", ")}`
              : ""}
            {analysis.headDevelopmentBasis ? ` · ${analysis.headDevelopmentBasis}` : ""}
          </Text>
          <Text style={photoStyles.warning}>
            Head development supports the review but does not prove potency, chemistry, a
            harvest date, or whole-plant maturity.
          </Text>
          {analysis.qualityChecks ? (
            <View style={photoStyles.qualityChecks}>
              <Text style={photoStyles.checklistTitle}>Set quality checks</Text>
              <Text style={photoStyles.feedback}>
                Focus: {analysis.qualityChecks.focus} · Glare:{" "}
                {analysis.qualityChecks.glare} · Lighting:{" "}
                {analysis.qualityChecks.lighting}
              </Text>
              <Text style={photoStyles.feedback}>
                Visible head detail: {analysis.qualityChecks.headVisibility} · Site
                coverage: {analysis.qualityChecks.roleCoverage}
              </Text>
            </View>
          ) : null}
          {analysis.imageFindings?.length ? (
            <View style={photoStyles.qualityChecks}>
              <Text style={photoStyles.checklistTitle}>Per-photo zoom review</Text>
              {analysis.imageFindings.map((finding) => (
                <Text
                  key={`${finding.imageIndex}-${finding.role}`}
                  style={
                    finding.usableForDistribution
                      ? photoStyles.feedback
                      : photoStyles.warning
                  }
                >
                  Photo {finding.imageIndex}: {finding.role.replaceAll("_", " ")} ·{" "}
                  {finding.focus} focus · {finding.glare} glare ·{" "}
                  {finding.visibleHeadDetail} head detail
                  {finding.trichomeRichRegion
                    ? ` · best region: ${finding.trichomeRichRegion}`
                    : ""}
                  {finding.excludedReason ? ` · excluded: ${finding.excludedReason}` : ""}
                  {trichomeHeadTallyLabel(finding)}
                </Text>
              ))}
              {inspectedBreakdown.length ? (
                <View>
                  <Text style={photoStyles.checklistTitle}>
                    Counts and ranges by inspected photo area
                  </Text>
                  {inspectedBreakdown.map((estimate) => (
                    <View key={`sampled-area-${estimate.imageIndex}`}>
                      <Text style={photoStyles.feedback}>
                        {inspectedPhotoEstimateHeader(estimate)}
                      </Text>
                      <Text style={photoStyles.feedback}>
                        {inspectedPhotoEstimatePercentages(estimate)}
                      </Text>
                      <Text style={photoStyles.feedback}>
                        {inspectedPhotoEstimateCounts(estimate)}
                      </Text>
                    </View>
                  ))}
                  {strongestAmberSignal ? (
                    <Text style={photoStyles.warning}>{strongestAmberSignal}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
          <View
            accessibilityLabel="Correct Harvest Readiness trichome evidence"
            style={photoStyles.qualityChecks}
          >
            <Text style={photoStyles.checklistTitle}>Help correct this estimate</Text>
            <Text style={photoStyles.feedback}>
              Compare only the intact heads visible in these photographed areas. Your
              correction stays separate from the AI result and does not change the saved
              readiness calculation.
            </Text>
            <View style={photoStyles.choiceRow}>
              {HARVEST_CALIBRATION_CHOICES.map((choice) => {
                const selected = calibrationChoice === choice.key;
                return (
                  <Pressable
                    key={choice.key}
                    accessibilityLabel={choice.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setCalibrationChoice(choice.key);
                      setCalibrationStatus("");
                    }}
                    style={[
                      photoStyles.choiceButton,
                      selected && photoStyles.choiceSelected
                    ]}
                  >
                    <Text
                      style={[
                        photoStyles.choiceText,
                        selected && photoStyles.choiceTextSelected
                      ]}
                    >
                      {choice.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              accessibilityLabel="Your visible-area amber estimate percent"
              value={observedAmberPercent}
              onChangeText={setObservedAmberPercent}
              keyboardType="numeric"
              placeholder="Your approximate visible-area amber %, for example 30"
              placeholderTextColor={palette.textMuted}
              style={photoStyles.input}
            />
            <TextInput
              accessibilityLabel="Why the Harvest estimate needs correction"
              value={calibrationNotes}
              onChangeText={setCalibrationNotes}
              multiline
              placeholder="Optional: what you can resolve, lighting, glare, or sample area"
              placeholderTextColor={palette.textMuted}
              style={photoStyles.input}
            />
            <View style={photoStyles.consentRow}>
              <Switch
                accessibilityLabel="Allow correction to improve model calibration"
                value={calibrationConsent}
                onValueChange={(enabled) => {
                  setCalibrationConsent(enabled);
                  if (!enabled) setCalibrationRightsConfirmed(false);
                  setCalibrationStatus("");
                }}
                trackColor={{ false: palette.border, true: palette.accentSoft }}
                thumbColor={calibrationConsent ? palette.accent : palette.textMuted}
              />
              <Text style={photoStyles.consentText}>
                Allow this correction and its linked review evidence to be used to improve
                GrowPath model calibration. Off by default.
              </Text>
            </View>
            {calibrationConsent ? (
              <View style={photoStyles.consentRow}>
                <Switch
                  accessibilityLabel="Confirm rights for Harvest calibration photos"
                  value={calibrationRightsConfirmed}
                  onValueChange={(confirmed) => {
                    setCalibrationRightsConfirmed(confirmed);
                    setCalibrationStatus("");
                  }}
                  trackColor={{ false: palette.border, true: palette.accentSoft }}
                  thumbColor={
                    calibrationRightsConfirmed ? palette.accent : palette.textMuted
                  }
                />
                <Text style={photoStyles.consentText}>
                  I own these photos or have permission to let GrowPath use the exact
                  photos and this correction for private internal AI evaluation and
                  calibration. This does not authorize public display.
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityLabel="Save Harvest estimate correction"
              onPress={submitCalibrationFeedback}
              disabled={calibrationBusy}
              style={[photoStyles.button, calibrationBusy && photoStyles.disabled]}
            >
              <Text style={photoStyles.buttonText}>
                {calibrationBusy
                  ? "Saving Correction..."
                  : "Save Correction (No AI Credit)"}
              </Text>
            </Pressable>
            {calibrationStatus ? (
              <Text style={photoStyles.feedback}>{calibrationStatus}</Text>
            ) : null}
          </View>
          {analysis.recommendation ? (
            <Text style={photoStyles.recommendation}>{analysis.recommendation}</Text>
          ) : null}
          {analysis.photoUsable ? (
            <Text style={photoStyles.recommendation}>
              The fields below are filled. Review the remaining maturity signals, then run
              the rule-based readiness estimate.
            </Text>
          ) : null}
          {(analysis.visibleTraits || []).map((item, index) => (
            <Text key={`trait-${index}`} style={photoStyles.feedback}>
              Visible: {item}
            </Text>
          ))}
          {(analysis.evidence || []).map((item, index) => (
            <Text key={`evidence-${index}`} style={photoStyles.feedback}>
              Evidence: {item}
            </Text>
          ))}
          {(analysis.limitations || []).map((item, index) => (
            <Text key={`limitation-${index}`} style={photoStyles.warning}>
              Limitation: {item}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function harvestCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "harvest_readiness",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function readinessTaskPlan(outputs: Record<string, any>, payload: Record<string, any>) {
  const readinessStatus = String(outputs.readinessStatus || "");
  const hasQualifiedTrichomeDistribution =
    outputs.trichomeObservation?.evidenceStatus === "entered" &&
    ["clearPercent", "cloudyPercent", "amberPercent"].every((key) =>
      Number.isFinite(Number(outputs.trichomeObservation?.[key]))
    );
  const hasNumericWindow =
    outputs.estimatedWindow &&
    typeof outputs.estimatedWindow === "object" &&
    Number.isFinite(Number(outputs.estimatedWindow.startDay)) &&
    Number.isFinite(Number(outputs.estimatedWindow.targetDay));
  if (
    readinessStatus === "insufficient_evidence" ||
    readinessStatus === "timing_review_window" ||
    !hasNumericWindow ||
    !hasQualifiedTrichomeDistribution
  ) {
    const range = outputs.harvestWindowReview?.range;
    const planningRange =
      range?.startDate && range?.endDate
        ? ` A user-timing planning range of ${range.startDate} to ${range.endDate} is available, but it is not trichome-derived.`
        : range?.startDay != null && range?.endDay != null
          ? ` A breeder-centered planning range of flower day ${range.startDay} to ${range.endDay} is available, but it is not trichome-derived.`
          : "";
    return [
      {
        title: "Capture representative trichome macros",
        priority: "high" as const,
        dueDate: tomorrow(1),
        ...harvestCalendarMetadata("trichome_photo_capture"),
        description: `Capture sharp neutral-light calyx macros from top, middle, and lower bud sites plus a wider context view. The current evidence does not support an automatic harvest decision.${planningRange}`
      },
      {
        title: "Complete harvest maturity observations",
        priority: "medium" as const,
        dueDate: tomorrow(1),
        ...harvestCalendarMetadata("harvest_evidence_review"),
        description:
          "Record flower day, breeder timing as context, pistil pattern, bud swell, aroma trend, sample locations, and the intended effect goal before calculating again."
      }
    ];
  }
  const flowerDay = numberOrFallback(payload.flowerDay, 0);
  const startDay = numberOrFallback(outputs.estimatedWindow?.startDay, flowerDay + 3);
  const targetDay = numberOrFallback(
    outputs.estimatedWindow?.targetDay,
    outputs.harvestTask?.dueInDays
      ? flowerDay + Number(outputs.harvestTask.dueInDays)
      : flowerDay + 7
  );
  const recheckDueInDays = numberOrFallback(outputs.harvestTask?.dueInDays, 3);
  const windowStartDueInDays = Math.max(1, Math.round(startDay - flowerDay));
  const targetDueInDays = Math.max(
    windowStartDueInDays,
    Math.round(targetDay - flowerDay)
  );
  const readiness = String(outputs.readinessStatus || "harvest readiness").replaceAll(
    "_",
    " "
  );
  const warningText =
    Array.isArray(outputs.warnings) && outputs.warnings.length
      ? `\nWarnings: ${outputs.warnings.join("; ")}`
      : "";

  return [
    {
      title: outputs.harvestTask?.title || "Recheck harvest readiness",
      priority: outputs.harvestTask?.priority || "medium",
      dueDate: tomorrow(recheckDueInDays),
      ...harvestCalendarMetadata("harvest_readiness_recheck"),
      description: [
        `Current readiness: ${readiness}.`,
        "Recheck trichomes, pistils, aroma, bud swell, and whole-plant maturity.",
        `Sample location: ${payload.sampleLocation || "mixed bud sites"}.`,
        warningText.trim()
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: "Capture top and lower trichome photos",
      priority: "medium" as const,
      dueDate: tomorrow(recheckDueInDays),
      ...harvestCalendarMetadata("trichome_photo_capture"),
      description:
        "Take clear photos from top and lower buds so harvest timing is not based on one sample site."
    },
    {
      title: "Make harvest window decision",
      priority: "high" as const,
      dueDate: tomorrow(windowStartDueInDays),
      ...harvestCalendarMetadata("harvest_window_decision"),
      description: [
        `Estimated window starts around flower day ${startDay}.`,
        `Target day is ${targetDay} for goal: ${payload.userGoal || "balanced"}.`,
        "Decide whether to harvest all at once, delay, or partial harvest tops before lowers."
      ].join("\n")
    },
    {
      title: "Prepare dry/cure setup",
      priority: "high" as const,
      dueDate: tomorrow(Math.max(1, targetDueInDays - 1)),
      ...harvestCalendarMetadata("dry_cure_setup"),
      description:
        "Prepare dry space targets, jars/bags, labels, and post-harvest notes before cutting plants."
    }
  ];
}

function harvestReviewNotes(outputs: Record<string, any>, payload: Record<string, any>) {
  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  return [
    `Readiness: ${String(outputs.readinessStatus || "unknown").replaceAll("_", " ")}.`,
    outputs.estimatedWindow
      ? outputs.estimatedWindow.startDate && outputs.estimatedWindow.endDate
        ? `User-timing planning range: ${outputs.estimatedWindow.startDate} to ${outputs.estimatedWindow.endDate}, centered on ${outputs.estimatedWindow.targetDate}.`
        : `Window: flower day ${outputs.estimatedWindow.startDay ?? "-"} to ${
            outputs.estimatedWindow.endDay ?? "-"
          }, target ${outputs.estimatedWindow.targetDay ?? "-"}.`
      : "",
    `Trichomes: cloudy ${payload.cloudyPercent || "-"}%, amber ${
      payload.amberPercent || "-"
    }%, clear ${payload.clearPercent || "-"}%.`,
    `Sample: ${payload.sampleLocation || "mixed bud sites"}.`,
    `Goal: ${payload.userGoal || "balanced"}.`,
    warnings.length ? `Warnings: ${warnings.join("; ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function harvestReviewRecord(
  outputs: Record<string, any>,
  payload: Record<string, any>,
  toolRunId: string
): DryCureRecordInput {
  return {
    recordedAt: new Date().toISOString(),
    stage: "quality_review",
    qualityNotes: harvestReviewNotes(outputs, payload),
    linkedToolRunId: toolRunId
  };
}

export default function HarvestReadinessToolRoute({
  backFallbackHref = "/home/personal/tools",
  workspaceType = "personal",
  workspaceId
}: {
  backFallbackHref?: string;
  workspaceType?: VideoWorkspaceType;
  workspaceId?: string;
} = {}) {
  const routeParams = useLocalSearchParams<{
    retryToolRunId?: string | string[];
  }>();
  const retryToolRunId = Array.isArray(routeParams.retryToolRunId)
    ? routeParams.retryToolRunId[0] || ""
    : routeParams.retryToolRunId || "";
  const [visionDraft, setVisionDraft] = useState<HarvestAnalysisDraft | null>(null);
  const [activeAnalysisScopeKey, setActiveAnalysisScopeKey] = useState("");
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const [activeGrowId, setActiveGrowId] = useState("");
  const [harvestBatches, setHarvestBatches] = useState<HarvestBatch[]>([]);
  const [harvestBatchesLoading, setHarvestBatchesLoading] = useState(false);
  const observeGrowId = useCallback((growId: string) => {
    setActiveGrowId((current) => (current === growId ? current : growId));
  }, []);
  useEffect(() => {
    let active = true;
    if (workspaceType !== "personal" || !activeGrowId) {
      setHarvestBatches([]);
      setHarvestBatchesLoading(false);
      return () => {
        active = false;
      };
    }
    setHarvestBatches([]);
    setHarvestBatchesLoading(true);
    void listHarvestBatches({ growId: activeGrowId }).then((batches) => {
      if (!active) return;
      setHarvestBatches(batches);
      setHarvestBatchesLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeGrowId, workspaceType]);
  const harvestBatchOptions = useMemo(
    () => [
      {
        value: "",
        label: !activeGrowId
          ? "Select a grow first"
          : harvestBatchesLoading
            ? "Loading harvest batches..."
            : harvestBatches.length
              ? "Do not link a harvest batch"
              : "No harvest batches found for this grow",
        description: !activeGrowId
          ? "Harvest batches are scoped to the selected grow."
          : harvestBatches.length
            ? "The result will still save to Saved Runs and can create follow-up tasks."
            : "Run the readiness estimate without a batch, or create a harvest batch from the grow workflow when harvest begins."
      },
      ...harvestBatches.map((batch) => ({
        value: batch.id,
        label: [batch.name, batch.batchCode ? `(${batch.batchCode})` : ""]
          .filter(Boolean)
          .join(" "),
        description: [
          batch.status ? `Status: ${batch.status}` : "",
          batch.harvestedAt ? `Harvested: ${String(batch.harvestedAt).slice(0, 10)}` : ""
        ]
          .filter(Boolean)
          .join(" · ")
      }))
    ],
    [activeGrowId, harvestBatches, harvestBatchesLoading]
  );
  const vision = visionDraft?.result || null;
  const harvestEvidence = providerEvidencePayload(evidenceAssets);
  const externalHarvestDraft = useMemo(
    () =>
      visionDraft
        ? {
            scopeKey: visionDraft.scopeKey,
            revisionKey: visionDraft.revisionKey,
            growId: visionDraft.growId,
            values: visionDraft.result.photoUsable
              ? {
                  cloudyPercent: harvestPercentageDraft(visionDraft.result.cloudy),
                  amberPercent: harvestPercentageDraft(visionDraft.result.amber),
                  clearPercent: harvestPercentageDraft(visionDraft.result.clear)
                }
              : {
                  cloudyPercent: "",
                  amberPercent: "",
                  clearPercent: ""
                },
            metadata: {
              photoAnalysis: {
                ...visionDraft.result,
                performed: true,
                ...(visionDraft.operationId
                  ? { operationId: visionDraft.operationId }
                  : {})
              }
            }
          }
        : null,
    [visionDraft]
  );
  return (
    <BackendCalculatorToolScreen
      backFallbackHref={backFallbackHref}
      externalAiDraftScopeKey={activeAnalysisScopeKey}
      externalAiDraft={externalHarvestDraft}
      onGrowIdChange={observeGrowId}
      resetFieldsOnContextChange={HARVEST_CONTEXT_SCOPED_FIELDS}
      tool="harvest-readiness"
      growOptional
      toolKey="harvest-readiness"
      title="Harvest Readiness Estimate"
      subtitle="Review breeder timing, flower day, macro trichome evidence, pistils, bud swell, aroma trend, and whole-plant maturity together. Unknown values stay blank. A photo estimate is never a harvest order."
      aiCreditMessage="The readiness calculator is free. Fill from grow uses 1 AI credit. Photo review uses 1 credit for 4–12 unique images. Larger selected sets receive an exact server-signed Deep review batch and credit quote (maximum 7). Failures proven to occur before provider dispatch are refunded; after dispatch, GrowPath never resends the batch and may hold the accepted reservation for support reconciliation instead of exposing a partial result."
      aiPrefill={{
        buttonLabel: "Fill readiness review from grow",
        clearUnfilled: true,
        preserveAllExistingFields: true,
        normalizeFieldValue: ({ fieldKey }) =>
          ["cloudyPercent", "amberPercent", "clearPercent"].includes(fieldKey)
            ? ""
            : undefined,
        buildMessage: () =>
          `Prefill a Harvest Readiness review using the selected grow and plant's saved timeline, breeder/cultivar information, logs, photos and prior vision results, environment, tasks, diagnoses, and harvest records. Return JSON only with exactly these keys: {"flowerDay":"string","breederFlowerTime":"string","approximateHarvestDate":"string","cloudyPercent":"string","amberPercent":"string","clearPercent":"string","pistilStatus":"string","budSwellStatus":"string","sampleLocation":"string","aromaIntensity":"string","userGoal":"string","additionalInformation":"string"}. Fill approximateHarvestDate only from an explicit saved user date, formatted YYYY-MM-DD; never invent one from breeder timing. Never choose a harvest batch; the user selects an owned batch separately. Never infer trichome percentages from ordinary plant photos; fill them only from a saved usable macro-photo analysis. If current media is missing, blurry, lacks visible trichome heads, or covers too few bud sites, leave those percentages blank and explain exactly which better photos are needed in additionalInformation. Leave unknown observations blank rather than inventing them.`
      }}
      formHeader={({
        growId,
        plantId,
        workspaceType: activeWorkspaceType,
        facilityId
      }) => {
        const activeWorkspaceId =
          activeWorkspaceType === "facility" ? facilityId || workspaceId : workspaceId;
        return (
          <HarvestPhotoAnalyzer
            growId={growId}
            plantId={plantId}
            evidenceAssets={evidenceAssets}
            onEvidenceAssetsChange={setEvidenceAssets}
            initialAnalysis={vision}
            initialAnalysisOperationId={visionDraft?.operationId}
            onAnalysisDraft={setVisionDraft}
            onScopeKeyChange={setActiveAnalysisScopeKey}
            workspaceType={activeWorkspaceType}
            workspaceId={activeWorkspaceId}
            facilityId={
              activeWorkspaceType === "facility" ? facilityId || workspaceId : undefined
            }
            retryToolRunId={retryToolRunId}
          />
        );
      }}
      fields={[
        {
          key: "flowerDay",
          label: "Flower day",
          defaultValue: "",
          keyboardType: "numeric",
          placeholder: "For example: 56",
          helpText: "Count from the actual flip/flower record; leave blank if unknown."
        },
        {
          key: "breederFlowerTime",
          label: "Breeder timeline day (for example 65)",
          defaultValue: "",
          keyboardType: "numeric",
          helpText: "Reference only—not proof that this phenotype is ready."
        },
        {
          key: "approximateHarvestDate",
          label: "Your approximate harvest date (optional)",
          defaultValue: "",
          inputType: "date",
          helpText:
            "This becomes the center of a low-confidence planning range, not an automatic harvest date."
        },
        {
          key: "cloudyPercent",
          label: "Cloudy %",
          defaultValue: "",
          keyboardType: "numeric",
          helpText:
            "Use qualified macro observations. Leave blank when heads are not sharp."
        },
        {
          key: "amberPercent",
          label: "Amber %",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "clearPercent",
          label: "Clear %",
          defaultValue: "",
          keyboardType: "numeric"
        },
        {
          key: "pistilStatus",
          label: "Hair / pistil status (fresh, dying, dark, receded)",
          defaultValue: "",
          placeholder: "Describe what you actually observe"
        },
        {
          key: "budSwellStatus",
          label: "Bud structure (still developing or fully finished)",
          defaultValue: "",
          placeholder: "Still developing, mostly swollen, uneven..."
        },
        {
          key: "sampleLocation",
          label: "Trichome sample location",
          defaultValue: "",
          placeholder: "Top, middle, and lower calyx samples"
        },
        ...(workspaceType === "personal"
          ? [
              {
                key: "harvestBatchId",
                label: "Harvest batch write-back (optional)",
                defaultValue: "",
                helpText:
                  "Select an owned batch from this grow. After the estimate is saved, the Save Harvest Review action appends its review and ToolRun link to that batch.",
                options: harvestBatchOptions
              }
            ]
          : []),
        {
          key: "aromaIntensity",
          label: "Aroma trend (building, peak, or dropping)",
          defaultValue: "",
          placeholder: "Building, stable peak, dropping, unknown"
        },
        {
          key: "userGoal",
          label: "Effect goal (saved as context; not scored yet)",
          defaultValue: "",
          placeholder: "Optional context"
        },
        {
          key: "additionalInformation",
          label: "Additional observations or questions (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext, workspaceType, facilityId }) => ({
        growId,
        workspaceType,
        ...(facilityId ? { facilityId, workspaceId: facilityId } : {}),
        ...plantContext.toolRunContext,
        ...values,
        budSwell: values.budSwellStatus,
        smellNotes: values.aromaIntensity,
        trichomeSource: vision?.photoUsable ? "ai_photo_estimate" : "manual_entry",
        evidenceAssetIds: harvestEvidence.evidenceAssetIds,
        mediaEvidence: harvestEvidence.media,
        photoAnalysis: vision
          ? {
              ...vision,
              performed: true,
              ...(visionDraft?.operationId
                ? { operationId: visionDraft.operationId }
                : {})
            }
          : undefined,
        harvestBatchId: String(values.harvestBatchId || "").trim() || undefined,
        additionalInformation: values.additionalInformation.trim() || undefined
      })}
      buildMetrics={(outputs) => [
        { key: "status", label: "Readiness", value: outputs.readinessStatus },
        {
          key: "window",
          label: "Estimated window",
          value:
            typeof outputs.estimatedWindow === "string"
              ? outputs.estimatedWindow.replaceAll("_", " ")
              : outputs.estimatedWindow?.startDate && outputs.estimatedWindow?.endDate
                ? `${outputs.estimatedWindow.startDate} to ${outputs.estimatedWindow.endDate}`
                : undefined
        },
        { key: "start", label: "Start day", value: outputs.estimatedWindow?.startDay },
        {
          key: "target",
          label: "Target day",
          value: outputs.estimatedWindow?.targetDay
        },
        { key: "end", label: "End day", value: outputs.estimatedWindow?.endDay },
        {
          key: "range-boundary",
          label: "Range meaning",
          value: outputs.harvestWindowReview?.boundary
        },
        {
          key: "pistils",
          label: "Pistils",
          value: outputs.wholePlantMaturity?.pistilStatus
        },
        {
          key: "swell",
          label: "Bud structure",
          value: outputs.wholePlantMaturity?.budSwellStatus
        },
        {
          key: "breeder-reference",
          label: "Breeder timeline",
          value: outputs.breederTimelineInterpretation
        },
        {
          key: "trichome-advice",
          label: "Trichome advice",
          value: outputs.trichomeInterpretation
        },
        {
          key: "trichome-source",
          label: "Trichome values source",
          value:
            outputs.trichomeSource === "ai_photo_estimate"
              ? `AI photo estimate (${Math.round(
                  Number(outputs.photoAnalysis?.confidence || 0) * 100
                )}% confidence)`
              : outputs.photoAnalysis?.visibleSampleEstimateUsable
                ? `AI counted-area estimate (${
                    Number(outputs.photoAnalysis.visibleSampleHeadCount) > 0
                      ? `${outputs.photoAnalysis.visibleSampleHeadCount} visible heads`
                      : "provider-estimated visible sample"
                  }; ${outputs.photoAnalysis.visibleSampleCountingConfidence || "low"} counting confidence). Representative top, middle, and lower percentages remain manual or missing.`
                : "Manual or missing; photos were not used for percentages"
        },
        {
          key: "photo-review",
          label: "Photo review",
          value: outputs.photoAnalysis?.performed
            ? `${outputs.photoAnalysis.imagesAnalyzed || 0} inspected · ${
                outputs.photoAnalysis.imageQuality || "quality unknown"
              } · ${outputs.photoAnalysis.providerLabel || "provider unknown"} (${
                outputs.photoAnalysis.providerModel || "model unknown"
              })`
            : "Not run"
        },
        {
          key: "photo-credit",
          label: "Photo AI credit",
          value: outputs.photoAnalysis?.performed
            ? `${outputs.photoAnalysis.aiCreditsUsed ?? "-"} charged · ${
                outputs.photoAnalysis.aiTokensRemaining ?? "-"
              } remaining`
            : "Not used"
        },
        {
          key: "aroma-advice",
          label: "Smell / flavor",
          value: outputs.aromaFlavorInterpretation
        }
      ]}
      buildNotices={(outputs) => {
        const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
        const review =
          outputs.harvestWindowReview && typeof outputs.harvestWindowReview === "object"
            ? outputs.harvestWindowReview
            : {};
        const photo = outputs.photoAnalysis;
        return [
          ...(Array.isArray(review.reasonsWindowMayBeOpen)
            ? review.reasonsWindowMayBeOpen.map((message: string, index: number) => ({
                key: `window-open-${index}`,
                severity: "info" as const,
                message: `Reason the window may be open: ${message}`
              }))
            : []),
          ...(Array.isArray(review.reasonsToWait)
            ? review.reasonsToWait.map((message: string, index: number) => ({
                key: `window-wait-${index}`,
                severity: "medium" as const,
                message: `Reason to wait: ${message}`
              }))
            : []),
          ...(Array.isArray(review.missingEvidence) && review.missingEvidence.length
            ? [
                {
                  key: "window-missing-evidence",
                  severity: "medium" as const,
                  message: `Still needed: ${review.missingEvidence.join("; ")}.`
                }
              ]
            : []),
          ...(photo?.performed
            ? [
                {
                  key: "photo-analysis-status",
                  severity: photo.photoUsable ? ("info" as const) : ("medium" as const),
                  message: photo.photoUsable
                    ? `${photo.providerLabel || "AI image review"} inspected ${
                        photo.imagesAnalyzed || 0
                      } photos. Treat the distribution as a visual estimate and confirm across the whole plant.`
                    : `The image review ran, but no percentages were accepted. ${
                        photo.recommendation || HARVEST_PHOTO_CHECKLIST.join(" ")
                      }`
                },
                ...(Array.isArray(photo.limitations)
                  ? photo.limitations.map((message: string, index: number) => ({
                      key: `photo-limitation-${index}`,
                      severity: "medium" as const,
                      message
                    }))
                  : [])
              ]
            : []),
          ...warnings.map((message: string, index: number) => ({
            key: `warning-${index}`,
            severity: "medium" as const,
            message
          }))
        ];
      }}
      defaultLogTitle={(outputs) =>
        `Harvest readiness: ${outputs.readinessStatus || "check"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.harvestTask?.title || "Recheck harvest readiness",
        priority: outputs.harvestTask?.priority || "medium",
        dueDate: tomorrow(outputs.harvestTask?.dueInDays || 3),
        ...harvestCalendarMetadata("harvest_readiness_recheck"),
        description:
          "Recheck trichomes, pistils, aroma, bud swell, and whole-plant maturity."
      })}
      buildActions={({
        outputs,
        payload,
        toolRun,
        growId,
        plantContext,
        workspaceType
      }) =>
        workspaceType === "personal"
          ? [
              {
                key: "create-harvest-readiness-task-plan",
                label: "Create Harvest Follow-up Tasks",
                variant: "secondary",
                pendingLabel: "Creating...",
                disabled: !growId,
                successMessage: "Created harvest follow-up tasks.",
                onPress: async () => {
                  const result = await saveToolRunAndCreateTasks({
                    growId,
                    ...plantContext.toolRunContext,
                    toolKey: "harvest-readiness",
                    toolRunId: toolRun?.id || toolRun?._id,
                    input: payload,
                    output: outputs,
                    tasks: readinessTaskPlan(outputs, payload)
                  });
                  if (!result.ok) throw new Error(result.error);
                }
              },
              {
                key: "save-harvest-review",
                label: "Save Harvest Review",
                variant: "secondary",
                pendingLabel: "Saving...",
                disabled: !growId || !payload.harvestBatchId,
                successMessage: "Saved harvest review to batch.",
                onPress: async () => {
                  const harvestBatchId = String(payload.harvestBatchId || "").trim();
                  const linkedToolRunId = String(
                    toolRun?.id || toolRun?._id || ""
                  ).trim();
                  if (!harvestBatchId) throw new Error("Harvest batch ID is required.");
                  if (!linkedToolRunId) throw new Error("A saved ToolRun is required.");
                  const batch = await getHarvestBatch(harvestBatchId);
                  if (!batch) throw new Error("Harvest batch not found.");
                  const existingRecords = Array.isArray(batch.dryCureRecords)
                    ? batch.dryCureRecords
                    : [];
                  const existingRunIds = Array.isArray(batch.linkedToolRunIds)
                    ? batch.linkedToolRunIds
                    : [];
                  const updated = await updateHarvestBatch(harvestBatchId, {
                    dryCureRecords: [
                      ...existingRecords,
                      harvestReviewRecord(outputs, payload, linkedToolRunId)
                    ],
                    qualityNotes: harvestReviewNotes(outputs, payload),
                    linkedToolRunIds: Array.from(
                      new Set([...existingRunIds, linkedToolRunId])
                    )
                  });
                  if (!updated) throw new Error("Unable to update harvest batch.");
                }
              }
            ]
          : []
      }
    />
  );
}

export const createHarvestPhotoStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    card: {
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      gap: 10
    },
    title: { fontSize: 17, fontWeight: "800", color: palette.text },
    help: { color: palette.textMuted, lineHeight: 19 },
    checklist: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      padding: 10,
      gap: 5
    },
    checklistTitle: { color: palette.text, fontWeight: "800" },
    checklistItem: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    frameSelectionPanel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10
    },
    frameSelectionMetrics: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      gap: 4,
      padding: 9
    },
    metricText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    previewWrap: { flexBasis: 150, flexGrow: 1, maxWidth: 240, minWidth: 130 },
    preview: {
      width: "100%",
      height: 150,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong
    },
    removeButton: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 5,
      paddingVertical: 7
    },
    removeText: { color: palette.danger, fontSize: 12, fontWeight: "800" },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      color: palette.text,
      padding: 10
    },
    button: {
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      padding: 12,
      alignItems: "center"
    },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.text, fontWeight: "800" },
    disabled: { opacity: 0.45 },
    warning: { color: palette.warning, fontWeight: "700" },
    feedback: { color: palette.textMuted },
    analysis: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      gap: 6,
      paddingTop: 10
    },
    analysisTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    qualityChecks: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 10
    },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choiceButton: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    choiceSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    choiceText: { color: palette.text, fontWeight: "700" },
    choiceTextSelected: { color: palette.accentText },
    consentRow: { alignItems: "center", flexDirection: "row", gap: 10 },
    consentText: { color: palette.textMuted, flex: 1, lineHeight: 18 },
    recommendation: { color: palette.text, fontWeight: "700", lineHeight: 19 }
  });
