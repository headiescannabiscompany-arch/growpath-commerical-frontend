import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  getHarvestBatch,
  listHarvestBatches,
  updateHarvestBatch,
  type DryCureRecordInput,
  type HarvestBatch
} from "@/api/harvestBatches";
import {
  analyzeTrichomePhotos,
  isSupportedHarvestReviewPolicy,
  submitHarvestTrichomeFeedback,
  type TrichomeVisionResult
} from "@/api/harvestVision";
import type { VideoWorkspaceType } from "@/api/videos";
import { listEvidenceAssets, providerEvidencePayload } from "@/api/evidence";
import { getToolRun, type ToolRun } from "@/api/toolRuns";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import SavedGrowPhotoEvidencePicker from "@/components/media/SavedGrowPhotoEvidencePicker";
import { PLANT_REVIEW_PHOTO_LIMIT } from "@/features/personal/diagnosis/photoEvidenceQuality";
import {
  inspectedPhotoEstimateCounts,
  inspectedPhotoEstimateHeader,
  inspectedPhotoEstimatePercentages,
  inspectedPhotoEstimates,
  strongestInspectedAmberSignal
} from "@/features/personal/tools/harvestVisibleSample";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import type { EvidenceAsset } from "@/types/evidence";

const MIN_HARVEST_PHOTOS = 4;
const HARVEST_CONTEXT_SCOPED_FIELDS = ["harvestBatchId"];

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
  "A short video can supply candidate still frames, but each extracted frame must independently pass the same focus, glare, and bud-site checks.",
  "Photo count is not coverage: even 12 wide photos cannot replace three true macros where individual intact gland heads are visible."
];

type HarvestAnalysisDraft = {
  result: TrichomeVisionResult;
  scopeKey: string;
  revisionKey: string;
  growId: string;
};

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

function savedHarvestAnalysis(run: ToolRun | null): TrichomeVisionResult | null {
  const outputs = (run?.outputs || run?.result || {}) as Record<string, any>;
  const photoAnalysis = outputs.photoAnalysis;
  if (!photoAnalysis || typeof photoAnalysis !== "object") return null;

  const receipt =
    photoAnalysis.analysisReceipt && typeof photoAnalysis.analysisReceipt === "object"
      ? photoAnalysis.analysisReceipt
      : {
          aiUsageEventId: photoAnalysis.aiUsageEventId,
          normalizedHarvestResultDigest: photoAnalysis.normalizedHarvestResultDigest,
          evidenceFingerprint: photoAnalysis.evidenceFingerprint,
          reviewPolicyVersion: photoAnalysis.reviewPolicyVersion
        };
  const securelyAttested = Boolean(
    typeof photoAnalysis.photoUsable === "boolean" &&
    String(photoAnalysis.analysisId || "").trim() &&
    String(receipt?.aiUsageEventId || "").trim() &&
    /^[a-f0-9]{64}$/i.test(String(receipt?.normalizedHarvestResultDigest || "").trim()) &&
    String(receipt?.evidenceFingerprint || "").trim() &&
    isSupportedHarvestReviewPolicy(receipt?.reviewPolicyVersion)
  );
  return securelyAttested
    ? ({ ...photoAnalysis, analysisReceipt: receipt } as TrichomeVisionResult)
    : null;
}

function harvestAnalysisScopeKey(input: {
  workspaceType: VideoWorkspaceType;
  workspaceId?: string;
  facilityId?: string;
  growId: string;
  plantId: string;
  evidenceAssetIds: string[];
}) {
  const evidenceKey = [...input.evidenceAssetIds]
    .map(String)
    .filter(Boolean)
    .sort()
    .join(",");
  return [
    input.workspaceType,
    String(input.workspaceId || "self"),
    String(input.facilityId || "no-facility"),
    String(input.growId || "no-grow"),
    String(input.plantId || "no-plant"),
    evidenceKey || "no-evidence"
  ].join("::");
}

function harvestAnalysisRevisionKey(result: TrichomeVisionResult, scopeKey: string) {
  const receipt = result.analysisReceipt;
  return [
    scopeKey,
    String(result.analysisId || "no-analysis-id"),
    String(receipt?.aiUsageEventId || "no-usage-event"),
    String(receipt?.normalizedHarvestResultDigest || "no-result-digest"),
    String(receipt?.evidenceFingerprint || "no-evidence-fingerprint"),
    String(receipt?.reviewPolicyVersion || "no-review-policy")
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

function HarvestPhotoAnalyzer({
  growId,
  plantId,
  evidenceAssets,
  onEvidenceAssetsChange,
  initialAnalysis,
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
  const [feedback, setFeedback] = useState("");
  const [restoreFeedback, setRestoreFeedback] = useState("");
  const [restoringEvidence, setRestoringEvidence] = useState(false);
  const [analysis, setAnalysis] = useState<TrichomeVisionResult | null>(initialAnalysis);
  const [calibrationChoice, setCalibrationChoice] = useState("");
  const [observedAmberPercent, setObservedAmberPercent] = useState("");
  const [calibrationNotes, setCalibrationNotes] = useState("");
  const [calibrationConsent, setCalibrationConsent] = useState(false);
  const [calibrationRightsConfirmed, setCalibrationRightsConfirmed] = useState(false);
  const [calibrationBusy, setCalibrationBusy] = useState(false);
  const [calibrationStatus, setCalibrationStatus] = useState("");
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
  const evidence = providerEvidencePayload(evidenceAssets);
  const photoCount = evidence.images.length;
  const evidenceAssetKey = evidence.evidenceAssetIds.map(String).sort().join("|");
  const analysisScopeKey = harvestAnalysisScopeKey({
    workspaceType,
    workspaceId,
    facilityId,
    growId,
    plantId,
    evidenceAssetIds: evidence.evidenceAssetIds
  });
  const analysisScopeKeyRef = useRef(analysisScopeKey);
  const previousAnalysisScopeKeyRef = useRef(analysisScopeKey);
  const analysisRequestRevisionRef = useRef(0);
  const growRequired = workspaceType !== "personal";
  analysisScopeKeyRef.current = analysisScopeKey;

  useEffect(() => {
    onScopeKeyChange(analysisScopeKey);
  }, [analysisScopeKey, evidenceAssetKey, onScopeKeyChange]);

  useEffect(() => {
    if (previousAnalysisScopeKeyRef.current === analysisScopeKey) return;
    previousAnalysisScopeKeyRef.current = analysisScopeKey;
    analysisRequestRevisionRef.current += 1;
    setAnalysis(null);
    onAnalysisDraft(null);
  }, [analysisScopeKey, onAnalysisDraft]);

  useEffect(() => {
    setCalibrationChoice("");
    setObservedAmberPercent("");
    setCalibrationNotes("");
    setCalibrationConsent(false);
    setCalibrationRightsConfirmed(false);
    setCalibrationStatus("");
  }, [analysis?.analysisId]);

  useEffect(() => {
    let active = true;
    const growChanged = previousGrowIdRef.current !== growId;
    previousGrowIdRef.current = growId;
    if (growChanged || !mountedAnalysisRef.current) {
      if (growChanged) analysisRequestRevisionRef.current += 1;
      setAnalysis(null);
      onAnalysisDraft(null);
    } else {
      setAnalysis(mountedAnalysisRef.current);
    }
    setRestoreFeedback("");

    if (!growId) {
      onEvidenceAssetsChange([]);
      setRestoringEvidence(false);
      return () => {
        active = false;
      };
    }

    setRestoringEvidence(true);
    const assetsPromise = listEvidenceAssets({
      growId,
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
        const savedPhotos = eligibleAssets
          .filter(
            (asset: EvidenceAsset) =>
              asset.purpose === "harvest" &&
              asset.assetType === "photo" &&
              asset.uploadStatus === "uploaded" &&
              Boolean(asset.durableUrl)
          )
          .slice(0, PLANT_REVIEW_PHOTO_LIMIT);
        const savedVideo = eligibleAssets.find(
          (asset: EvidenceAsset) =>
            asset.purpose === "harvest" &&
            asset.assetType === "video" &&
            asset.uploadStatus === "uploaded" &&
            Boolean(asset.durableUrl)
        );
        const restored = savedVideo ? [...savedPhotos, savedVideo] : savedPhotos;

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
            }${savedVideo ? " and 1 source video" : ""} for this grow.`
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
      !growId ||
      !currentEvidenceAssetIds.length
    ) {
      return () => {
        active = false;
      };
    }

    void getToolRun(retryToolRunId)
      .then((retryRun) => {
        if (!active) return;
        const restoredAnalysis = savedHarvestAnalysis(retryRun);
        if (!restoredAnalysis) return;

        const retainedIds = new Set(savedHarvestEvidenceIds(retryRun));
        const currentIds = new Set(currentEvidenceAssetIds);
        if (
          !retainedIds.size ||
          !Array.from(retainedIds).every((id) => currentIds.has(id))
        ) {
          return;
        }
        if (analysis?.analysisId === restoredAnalysis.analysisId) return;

        const restoredScopeKey = harvestAnalysisScopeKey({
          workspaceType,
          workspaceId,
          facilityId,
          growId,
          plantId,
          evidenceAssetIds: currentEvidenceAssetIds
        });
        mountedAnalysisRef.current = restoredAnalysis;
        setAnalysis(restoredAnalysis);
        onAnalysisDraft({
          result: restoredAnalysis,
          scopeKey: restoredScopeKey,
          revisionKey: harvestAnalysisRevisionKey(restoredAnalysis, restoredScopeKey),
          growId
        });
        setRestoreFeedback(
          (current) =>
            `${current ? `${current} ` : ""}Restored the signed photo analysis for zero-credit review.`
        );
      })
      .catch(() => {
        // The exact evidence remains available even when the signed result cannot be replayed.
      });

    return () => {
      active = false;
    };
  }, [
    analysis?.analysisId,
    evidenceAssetKey,
    facilityId,
    growId,
    onAnalysisDraft,
    plantId,
    retryToolRunId,
    workspaceId,
    workspaceType
  ]);

  function updateEvidence(next: EvidenceAsset[]) {
    analysisRequestRevisionRef.current += 1;
    onEvidenceAssetsChange(next);
    setAnalysis(null);
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
    setAnalysis(null);
    onAnalysisDraft(null);
    setFeedback(
      "Saved grow photo added. Confirm it is a sharp macro or context view before analysis."
    );
  };

  async function analyze() {
    if (
      (growRequired && !growId) ||
      photoCount < MIN_HARVEST_PHOTOS ||
      busy ||
      restoringEvidence
    )
      return;
    const requestScopeKey = analysisScopeKey;
    const requestRevision = analysisRequestRevisionRef.current;
    setBusy(true);
    setFeedback("");
    try {
      const result = await analyzeTrichomePhotos({
        growId: growId || undefined,
        plantId: plantId || undefined,
        // The receipt is bound to the exact selected set, including a private source
        // video and every linked extracted frame. The backend filters provider inputs
        // down to authorized photos/frames after validating this complete set.
        evidenceAssetIds: evidence.evidenceAssetIds,
        workspaceType,
        workspaceId,
        facilityId,
        sampleLocation: "mixed_bud_sites",
        notes: notes.trim() || undefined
      });
      const expectedAnalyzedIds = [...evidence.imageEvidenceAssetIds].map(String).sort();
      const actualAnalyzedIds = [...(result.evidenceUsed || [])].map(String).sort();
      const receipt = result.analysisReceipt;
      const receiptMatchesEvidence =
        Boolean(receipt) &&
        expectedAnalyzedIds.length === actualAnalyzedIds.length &&
        expectedAnalyzedIds.every((id, index) => id === actualAnalyzedIds[index]) &&
        receipt?.evidenceFingerprint === expectedAnalyzedIds.join("|") &&
        result.imagesAnalyzed === expectedAnalyzedIds.length &&
        isSupportedHarvestReviewPolicy(receipt?.reviewPolicyVersion) &&
        receipt?.aiUsageEventId === result.analysisId;
      if (!receiptMatchesEvidence) {
        throw new Error(
          "The photo review returned an evidence receipt that does not match this exact photo and video-frame set. No trichome fields were filled."
        );
      }
      if (
        analysisScopeKeyRef.current !== requestScopeKey ||
        analysisRequestRevisionRef.current !== requestRevision
      ) {
        return;
      }
      setAnalysis(result);
      onAnalysisDraft({
        result,
        scopeKey: requestScopeKey,
        revisionKey: harvestAnalysisRevisionKey(result, requestScopeKey),
        growId
      });
      setFeedback(
        result.photoUsable
          ? `${result.imagesAnalyzed} photos were inspected and 1 AI credit was charged. The clear, cloudy, and amber fields below are filled. Review the evidence and other maturity signals before running the readiness estimate.`
          : [
              `${result.imagesAnalyzed} photos were inspected and 1 AI credit was charged, but the set is not reliable enough to fill trichome percentages.`,
              result.recommendation,
              ...(result.limitations || []),
              ...HARVEST_PHOTO_CHECKLIST
            ]
              .filter(Boolean)
              .join(" ")
      );
    } catch (error: any) {
      if (
        analysisScopeKeyRef.current !== requestScopeKey ||
        analysisRequestRevisionRef.current !== requestRevision
      ) {
        return;
      }
      setAnalysis(null);
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

  return (
    <View style={photoStyles.card}>
      <Text accessibilityRole="header" aria-level={2} style={photoStyles.title}>
        AI trichome photo estimate (optional)
      </Text>
      <Text style={photoStyles.help}>
        The free readiness calculator works from observations you enter. Optional AI photo
        review costs 1 AI credit only after a complete four-photo set is submitted. A
        provider failure is refunded automatically. Photo review never makes the harvest
        decision by itself. You can add up to {PLANT_REVIEW_PHOTO_LIMIT} photos when extra
        top, middle, lower, or zoomed-out samples are needed, but the extra photo count
        does not replace the required macro roles.
      </Text>
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
          maxPhotos={PLANT_REVIEW_PHOTO_LIMIT}
        />
      ) : null}
      {restoringEvidence ? (
        <Text style={photoStyles.feedback}>Restoring saved harvest evidence...</Text>
      ) : restoreFeedback ? (
        <Text style={photoStyles.feedback}>{restoreFeedback}</Text>
      ) : null}
      <MediaEvidencePicker
        maxPhotos={PLANT_REVIEW_PHOTO_LIMIT}
        allowVideo
        extractFramesFromVideo
        maxExtractedVideoFrames={12}
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
      />
      <TextInput
        accessibilityLabel="Harvest photo notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional but helpful: Photo 1 top macro, Photo 2 middle macro, Photo 3 lower macro, Photo 4 context; include lens/magnification and lighting"
        placeholderTextColor={palette.textMuted}
        style={photoStyles.input}
      />
      <Pressable
        accessibilityLabel="Analyze harvest trichome photo"
        onPress={analyze}
        disabled={
          busy ||
          restoringEvidence ||
          (growRequired && !growId) ||
          photoCount < MIN_HARVEST_PHOTOS
        }
        style={[
          photoStyles.button,
          (busy ||
            restoringEvidence ||
            (growRequired && !growId) ||
            photoCount < MIN_HARVEST_PHOTOS) &&
            photoStyles.disabled
        ]}
      >
        <Text style={photoStyles.buttonText}>
          {busy ? "Inspecting Photos..." : "Analyze Photos / Frames (1 AI Credit)"}
        </Text>
      </Pressable>
      {!growId && growRequired ? (
        <Text style={photoStyles.warning}>
          Select an authorized shared grow before analyzing photos in this workspace.
        </Text>
      ) : !growId ? (
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
            Inspected by {analysis.providerLabel} ({analysis.providerModel}) · Photos:{" "}
            {analysis.imagesAnalyzed}
          </Text>
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
          <Text style={photoStyles.feedback}>
            Review ID: {analysis.analysisId || "not provided"}
          </Text>
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
              ? ` · ${analysis.headDevelopmentSignals.map((signal) => signal.replaceAll("_", " ")).join(", ")}`
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
            accessibilityLabel="Correct Harvest trichome estimate"
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
          {analysis.evidenceUsed?.length ? (
            <Text style={photoStyles.feedback}>
              Evidence IDs: {analysis.evidenceUsed.join(", ")}
            </Text>
          ) : null}
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
                performed: true
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
      growOptional={workspaceType === "personal"}
      toolKey="harvest-readiness"
      title="Harvest Readiness Estimate"
      subtitle="Review breeder timing, flower day, macro trichome evidence, pistils, bud swell, aroma trend, and whole-plant maturity together. Unknown values stay blank. A photo estimate is never a harvest order."
      aiCreditMessage="The readiness calculator is free. Fill from grow and Analyze Photo Set are separate optional AI actions; each successful action uses 1 AI credit, and provider failures are refunded."
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
              performed: true
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
          key: "photo-review-id",
          label: "Photo review ID",
          value: outputs.photoAnalysis?.analysisId || undefined
        },
        {
          key: "photo-evidence-ids",
          label: "Photo evidence IDs",
          value: Array.isArray(outputs.photoAnalysis?.evidenceUsed)
            ? outputs.photoAnalysis.evidenceUsed.join(", ")
            : undefined
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
