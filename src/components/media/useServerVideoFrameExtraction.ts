import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  extractEvidenceVideoFrames,
  getEvidenceAssetsByIds,
  getEvidenceVideoFrameExtraction,
  type EvidenceFrameExtraction,
  type EvidenceFrameExtractionResult,
  type EvidenceWorkspaceScope,
  type ExtractEvidenceVideoFramesInput
} from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";

const POLL_DELAYS_MS = [1500, 3000, 5000, 8000, 12000, 20000, 30000];
const MAX_AUTOMATIC_POLLS = 20;
const EXACT_RELOAD_BATCH_SIZE = 50;

type ServerExtractionPurpose = NonNullable<ExtractEvidenceVideoFramesInput["purpose"]>;

export type VerifiedServerFrameExtraction = {
  sourceId: string;
  version: string;
  attemptCount: number;
  frameIds: string[];
};

type Options = {
  assets: EvidenceAsset[];
  onChange: (assets: EvidenceAsset[]) => void;
  workspace: EvidenceWorkspaceScope;
  purpose: ServerExtractionPurpose;
  growId?: string;
  plantId?: string;
  /** Combined user-photo plus retained-frame ceiling. */
  maxProviderReadyPhotos: number;
  disabled?: boolean;
  workflowLabel: string;
};

function normalizedId(value: unknown) {
  return String(value || "").trim();
}

function persistedAssetId(asset: EvidenceAsset | null | undefined) {
  return normalizedId(asset?._id || asset?.id);
}

function generatedFramesForSource(assets: EvidenceAsset[], sourceId: string) {
  return assets.filter(
    (asset) =>
      asset.assetType === "photo" &&
      asset.source === "generated" &&
      normalizedId(asset.sourceVideoEvidenceAssetId) === sourceId
  );
}

function normalizedPersistedExtraction(
  record: EvidenceAsset["frameExtraction"]
): EvidenceFrameExtraction | null {
  if (!record) return null;
  const rawAttempt = Number(record.attemptCount || 0);
  return {
    status: record.status,
    attemptCount: Number.isFinite(rawAttempt) ? Math.max(0, Math.trunc(rawAttempt)) : 0,
    requestedFrameCount: Number.isFinite(Number(record.requestedFrameCount))
      ? Math.max(1, Math.min(80, Math.trunc(Number(record.requestedFrameCount))))
      : undefined,
    version: record.version,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    error: record.error || record.errorMessage,
    errorCode: record.errorCode,
    retryable: record.retryable ?? record.status !== "completed",
    cleanupPending: record.cleanupPending === true,
    partialFrameCount: Number.isFinite(Number(record.partialFrameCount))
      ? Math.max(0, Math.trunc(Number(record.partialFrameCount)))
      : undefined,
    frames: []
  };
}

export function isProtectedRetainedFrameSet(
  extraction: EvidenceFrameExtraction | null | undefined
) {
  return Boolean(
    extraction?.status === "partial" &&
    extraction.cleanupPending === true &&
    extraction.errorCode === "EVIDENCE_FRAME_SET_RETAINED"
  );
}

export function serverVideoFrameActionBeginsNewJob(
  status: EvidenceFrameExtraction["status"],
  extraction: EvidenceFrameExtraction | null | undefined
) {
  return (
    status === "idle" ||
    status === "failed" ||
    (status === "partial" && !isProtectedRetainedFrameSet(extraction))
  );
}

export function serverVideoProviderReadyAssets(
  assets: EvidenceAsset[],
  verified: VerifiedServerFrameExtraction | null
) {
  const withoutGeneratedFrames = assets.filter((asset) => asset.source !== "generated");
  if (!verified) return withoutGeneratedFrames;

  const generatedById = new Map<string, EvidenceAsset[]>();
  for (const asset of assets) {
    if (asset.assetType !== "photo" || asset.source !== "generated") continue;
    const id = persistedAssetId(asset);
    if (!id) continue;
    generatedById.set(id, [...(generatedById.get(id) || []), asset]);
  }

  const canonicalFrames: EvidenceAsset[] = [];
  for (const [expectedIndex, frameId] of verified.frameIds.entries()) {
    const matches = generatedById.get(frameId) || [];
    if (matches.length !== 1) return withoutGeneratedFrames;
    const frame = matches[0];
    if (
      normalizedId(frame.sourceVideoEvidenceAssetId) !== verified.sourceId ||
      normalizedId(frame.frameExtractionVersion) !== verified.version ||
      frame.frameExtractionAttempt !== verified.attemptCount ||
      frame.frameIndex !== expectedIndex ||
      frame.uploadStatus !== "uploaded" ||
      !normalizedId(frame.durableUrl) ||
      frame.aiUsable !== true
    ) {
      return withoutGeneratedFrames;
    }
    canonicalFrames.push(frame);
  }
  return [...withoutGeneratedFrames, ...canonicalFrames];
}

async function loadExactAssets(
  ids: string[],
  workspace: EvidenceWorkspaceScope,
  signal: AbortSignal
) {
  const rows: EvidenceAsset[] = [];
  for (let start = 0; start < ids.length; start += EXACT_RELOAD_BATCH_SIZE) {
    rows.push(
      ...(await getEvidenceAssetsByIds(
        ids.slice(start, start + EXACT_RELOAD_BATCH_SIZE),
        workspace,
        { signal }
      ))
    );
  }
  return rows;
}

export function useServerVideoFrameExtraction({
  assets,
  onChange,
  workspace,
  purpose,
  growId = "",
  plantId = "",
  maxProviderReadyPhotos,
  disabled = false,
  workflowLabel
}: Options) {
  const sourceVideo =
    assets.find((asset) => asset.assetType === "video" && asset.purpose === purpose) ||
    null;
  const sourceId = persistedAssetId(sourceVideo);
  const workspaceKey = [
    workspace.workspaceType,
    workspace.workspaceId || "self",
    workspace.facilityId || "no-facility",
    purpose,
    growId || "no-grow",
    plantId || "no-plant"
  ].join("::");
  const sourceKey = sourceId ? `${workspaceKey}::${sourceId}` : "";

  const [extraction, setExtraction] = useState<EvidenceFrameExtraction | null>(null);
  const [stateSourceKey, setStateSourceKey] = useState("");
  const [verified, setVerified] = useState<VerifiedServerFrameExtraction | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [autoPoll, setAutoPoll] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const mountedRef = useRef(true);
  const assetsRef = useRef(assets);
  const onChangeRef = useRef(onChange);
  const sourceKeyRef = useRef(sourceKey);
  const sourceVideoRef = useRef(sourceVideo);
  const requestTokenRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const pollAttemptRef = useRef(0);
  const syncRef = useRef<((begin: boolean) => Promise<void>) | null>(null);
  assetsRef.current = assets;
  onChangeRef.current = onChange;
  sourceKeyRef.current = sourceKey;
  sourceVideoRef.current = sourceVideo;

  const localExtraction = stateSourceKey === sourceKey ? extraction : null;
  const persistedExtraction = normalizedPersistedExtraction(sourceVideo?.frameExtraction);
  const effectiveExtraction = localExtraction || persistedExtraction;
  const status = effectiveExtraction?.status || "idle";
  const selectedFrames = useMemo(
    () => (sourceId ? generatedFramesForSource(assets, sourceId) : []),
    [assets, sourceId]
  );
  const providerReadyAssets = useMemo(
    () => serverVideoProviderReadyAssets(assets, verified),
    [assets, verified]
  );
  const verifiedFrameCount = verified
    ? providerReadyAssets.filter((asset) => asset.source === "generated").length
    : 0;
  const ready =
    !sourceVideo || Boolean(verified && verifiedFrameCount === verified.frameIds.length);
  const busy = Boolean(
    sourceVideo &&
    (requestBusy || status === "processing" || verificationPending || !ready)
  );

  const unavailableReason = sourceVideo
    ? sourceVideo.uploadStatus === "failed"
      ? "The private source-video upload failed. Retry or remove it before selecting frames."
      : sourceVideo.uploadStatus !== "uploaded"
        ? "Wait for the private source-video upload to finish before selecting frames."
        : !normalizedId(sourceVideo.durableUrl)
          ? "The private source video is missing its durable saved file. Remove it and add it again."
          : sourceVideo.purpose !== purpose
            ? `This video is not linked to ${workflowLabel}. Remove it and add it again from this screen.`
            : ""
    : "";

  const requestIsCurrent = useCallback(
    (token: number, expectedSourceKey: string) =>
      mountedRef.current &&
      requestTokenRef.current === token &&
      sourceKeyRef.current === expectedSourceKey,
    []
  );

  const verifyAndMerge = useCallback(
    async (
      result: EvidenceFrameExtractionResult,
      guard: {
        token: number;
        sourceKey: string;
        sourceId: string;
        workspace: EvidenceWorkspaceScope;
        signal: AbortSignal;
        lineage: { purpose: string; growId: string; plantId: string };
      }
    ) => {
      if (!requestIsCurrent(guard.token, guard.sourceKey)) return null;
      const responseSourceId = persistedAssetId(result.sourceVideo);
      const returnedFrameIds = result.extraction.frames.map(persistedAssetId);
      const version = normalizedId(result.extraction.version);
      const manifest = result.extraction.preselection;
      const manifestMatchesReturnedSet = Boolean(
        manifest &&
        normalizedId(manifest.policyVersion) &&
        manifest.selectedCount === returnedFrameIds.length &&
        manifest.targetFrameCount <= maxProviderReadyPhotos &&
        manifest.selectedBytesTotal >= 0 &&
        manifest.selectedByteLimit > 0 &&
        manifest.selectedBytesTotal <= manifest.selectedByteLimit &&
        manifest.selected.length === returnedFrameIds.length &&
        manifest.selected.every(
          (entry, index) =>
            entry.frameIndex === index &&
            normalizedId(entry.evidenceAssetId) === returnedFrameIds[index] &&
            !(entry.sequenceRole === "adjacent" && entry.countingEligible)
        )
      );
      if (
        result.extraction.status !== "completed" ||
        responseSourceId !== guard.sourceId ||
        !version ||
        !returnedFrameIds.length ||
        returnedFrameIds.some((id) => !id) ||
        new Set(returnedFrameIds).size !== returnedFrameIds.length ||
        returnedFrameIds.length > maxProviderReadyPhotos ||
        !manifestMatchesReturnedSet
      ) {
        throw new Error(
          "GrowPath did not return one complete, bounded, versioned frame set with its selection manifest. Retry the saved video or add sharp photos instead."
        );
      }

      const exactIds = [guard.sourceId, ...returnedFrameIds];
      const refreshed = await loadExactAssets(exactIds, guard.workspace, guard.signal);
      if (!requestIsCurrent(guard.token, guard.sourceKey)) return null;
      const refreshedById = new Map(
        refreshed.map((asset) => [persistedAssetId(asset), asset])
      );
      const exactRows = exactIds
        .map((id) => refreshedById.get(id))
        .filter((asset): asset is EvidenceAsset => Boolean(asset));
      if (exactRows.length !== exactIds.length) {
        throw new Error(
          "Frame selection finished, but the complete saved frame set could not be reloaded. Restore the frames again before analysis."
        );
      }

      const refreshedSource = exactRows[0];
      const refreshedFrames = exactRows.slice(1);
      const sourceExtraction = refreshedSource.frameExtraction;
      const sourceFrameIds = (sourceExtraction?.frameAssetIds || []).map(String);
      const extractionAttempt = Number(result.extraction.attemptCount);
      const sourceAttempt = Number(sourceExtraction?.attemptCount);
      const lineageMatches =
        refreshedSource.assetType === "video" &&
        normalizedId(refreshedSource.purpose) === guard.lineage.purpose &&
        normalizedId(refreshedSource.growId) === guard.lineage.growId &&
        normalizedId(refreshedSource.plantId) === guard.lineage.plantId;
      const orderedIdsMatch =
        sourceFrameIds.length === returnedFrameIds.length &&
        sourceFrameIds.every((id, index) => id === returnedFrameIds[index]);
      const framesMatch = refreshedFrames.every(
        (frame, index) =>
          persistedAssetId(frame) === returnedFrameIds[index] &&
          frame.assetType === "photo" &&
          frame.source === "generated" &&
          normalizedId(frame.sourceVideoEvidenceAssetId) === guard.sourceId &&
          normalizedId(frame.purpose) === guard.lineage.purpose &&
          normalizedId(frame.growId) === guard.lineage.growId &&
          normalizedId(frame.plantId) === guard.lineage.plantId &&
          normalizedId(frame.frameExtractionVersion) === version &&
          frame.frameExtractionAttempt === extractionAttempt &&
          frame.frameIndex === index &&
          frame.uploadStatus === "uploaded" &&
          Boolean(normalizedId(frame.durableUrl)) &&
          frame.aiUsable === true
      );
      const sourceManifest = sourceExtraction?.preselection;
      const sourceManifestMatches = Boolean(
        sourceManifest &&
        normalizedId(sourceManifest.policyVersion) ===
          normalizedId(manifest?.policyVersion) &&
        sourceManifest.selectedCount === returnedFrameIds.length &&
        sourceManifest.selected.length === returnedFrameIds.length &&
        sourceManifest.selected.every(
          (entry, index) =>
            entry.frameIndex === index &&
            normalizedId(entry.evidenceAssetId) === returnedFrameIds[index]
        )
      );
      if (
        sourceExtraction?.status !== "completed" ||
        normalizedId(sourceExtraction.version) !== version ||
        !Number.isInteger(extractionAttempt) ||
        extractionAttempt < 1 ||
        sourceAttempt !== extractionAttempt ||
        !orderedIdsMatch ||
        !sourceManifestMatches ||
        !lineageMatches ||
        !framesMatch
      ) {
        throw new Error(
          `The saved source video and frame set did not pass version, order, upload, or ${workflowLabel} lineage checks.`
        );
      }

      const current = assetsRef.current;
      const otherPhotoCount = current.filter(
        (asset) =>
          asset.assetType === "photo" &&
          !(
            asset.source === "generated" &&
            normalizedId(asset.sourceVideoEvidenceAssetId) === guard.sourceId
          )
      ).length;
      if (otherPhotoCount + refreshedFrames.length > maxProviderReadyPhotos) {
        throw new Error(
          `The selected set would exceed the ${maxProviderReadyPhotos}-image review ceiling. Remove photos, then restore the saved frame set again.`
        );
      }
      if (!requestIsCurrent(guard.token, guard.sourceKey)) return null;

      const sourceAliases = new Set(
        [guard.sourceId, sourceVideoRef.current?.id, sourceVideoRef.current?._id]
          .map(normalizedId)
          .filter(Boolean)
      );
      const next = [
        ...current.filter((asset) => {
          const id = persistedAssetId(asset);
          const linkedSource = normalizedId(asset.sourceVideoEvidenceAssetId);
          return !sourceAliases.has(id) && !sourceAliases.has(linkedSource);
        }),
        refreshedSource,
        ...refreshedFrames
      ];
      onChangeRef.current(next);
      setNotice(
        `${refreshedFrames.length} server-selected frame${
          refreshedFrames.length === 1 ? " is" : "s are"
        } retained and ready for review. The private source video is provenance only and is not sent as motion analysis.`
      );
      return {
        sourceId: guard.sourceId,
        version,
        attemptCount: extractionAttempt,
        frameIds: returnedFrameIds
      } satisfies VerifiedServerFrameExtraction;
    },
    [maxProviderReadyPhotos, requestIsCurrent, workflowLabel]
  );

  const sync = useCallback(
    async (begin: boolean) => {
      const requestSource = sourceVideoRef.current;
      const requestSourceId = persistedAssetId(requestSource);
      const requestSourceKey = sourceKeyRef.current;
      if (!requestSource || !requestSourceId || !requestSourceKey || requestBusy) return;
      if (unavailableReason) {
        setError(unavailableReason);
        return;
      }

      const lineage = {
        purpose: normalizedId(requestSource.purpose),
        growId: normalizedId(requestSource.growId),
        plantId: normalizedId(requestSource.plantId)
      };
      if (
        lineage.purpose !== purpose ||
        lineage.growId !== normalizedId(growId) ||
        lineage.plantId !== normalizedId(plantId)
      ) {
        setError(
          `This private video is not scoped to the current ${workflowLabel} context. Remove it and add it again.`
        );
        return;
      }

      const otherReadyPhotos = assetsRef.current.filter(
        (asset) =>
          asset.assetType === "photo" &&
          asset.uploadStatus === "uploaded" &&
          Boolean(normalizedId(asset.durableUrl)) &&
          asset.aiUsable === true &&
          !(
            asset.source === "generated" &&
            normalizedId(asset.sourceVideoEvidenceAssetId) === requestSourceId
          )
      ).length;
      const availableFrameSlots = Math.max(0, maxProviderReadyPhotos - otherReadyPhotos);
      if (begin && !availableFrameSlots) {
        setError(
          `All ${maxProviderReadyPhotos} image-review slots are already in use. Remove a photo before selecting video frames.`
        );
        return;
      }

      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      const token = requestTokenRef.current + 1;
      requestTokenRef.current = token;
      setStateSourceKey(requestSourceKey);
      setRequestBusy(true);
      setError("");
      if (begin) {
        pollAttemptRef.current = 0;
        setVerified(null);
        setVerificationPending(false);
      }
      setNotice(
        begin
          ? "GrowPath is scanning the private video, rejecting unusable and duplicate candidates, and retaining only a bounded review set. The durable job continues if you leave this page."
          : "Checking the saved video-frame selection status..."
      );
      let validating = false;
      try {
        const result = begin
          ? await extractEvidenceVideoFrames(
              requestSourceId,
              {
                ...workspace,
                maxFrames: availableFrameSlots,
                purpose,
                ...(lineage.growId ? { growId: lineage.growId } : {}),
                ...(lineage.plantId ? { plantId: lineage.plantId } : {})
              },
              { signal: controller.signal }
            )
          : await getEvidenceVideoFrameExtraction(requestSourceId, workspace, {
              signal: controller.signal
            });
        if (!requestIsCurrent(token, requestSourceKey)) return;
        setExtraction(result.extraction);
        setStateSourceKey(requestSourceKey);
        if (result.extraction.status === "processing") {
          if (!begin) pollAttemptRef.current += 1;
          setVerificationPending(false);
          setAutoPoll(true);
          setNotice(
            `Video review preparation is processing on GrowPath${
              result.extraction.attemptCount
                ? ` (attempt ${result.extraction.attemptCount})`
                : ""
            }. Analysis stays disabled until the exact retained set is uploaded and verified.`
          );
          return;
        }

        setAutoPoll(false);
        if (result.extraction.status === "completed") {
          validating = true;
          setVerificationPending(true);
          setNotice(
            "Frame selection completed. GrowPath is verifying the exact saved version, order, lineage, and uploads before analysis."
          );
          const exact = await verifyAndMerge(result, {
            token,
            sourceKey: requestSourceKey,
            sourceId: requestSourceId,
            workspace,
            signal: controller.signal,
            lineage
          });
          if (!exact || !requestIsCurrent(token, requestSourceKey)) return;
          setVerified(exact);
          setVerificationPending(false);
          pollAttemptRef.current = 0;
          return;
        }

        setVerified(null);
        setVerificationPending(false);
        if (
          result.extraction.status === "failed" ||
          result.extraction.status === "partial"
        ) {
          setNotice("");
          setError(
            result.extraction.error ||
              "GrowPath could not complete the retained frame set. Retry the saved video or add sharp photos instead."
          );
        } else {
          setNotice(
            "The private source video is saved. Start server frame selection before analysis."
          );
        }
      } catch (caught: any) {
        const aborted =
          controller.signal.aborted ||
          caught?.name === "AbortError" ||
          String(caught?.code || "").toUpperCase() === "ABORT_ERR";
        if (aborted || !requestIsCurrent(token, requestSourceKey)) return;
        setAutoPoll(false);
        if (validating) setVerificationPending(true);
        setError(
          caught?.message ||
            "GrowPath could not check the saved frame-selection job. Try again without reuploading the video."
        );
      } finally {
        if (requestIsCurrent(token, requestSourceKey)) {
          setRequestBusy(false);
          if (requestControllerRef.current === controller) {
            requestControllerRef.current = null;
          }
        }
      }
    },
    [
      growId,
      maxProviderReadyPhotos,
      plantId,
      purpose,
      requestBusy,
      requestIsCurrent,
      unavailableReason,
      verifyAndMerge,
      workflowLabel,
      workspace
    ]
  );
  syncRef.current = sync;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestTokenRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sourceExtraction = sourceVideoRef.current?.frameExtraction;
    requestTokenRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    pollAttemptRef.current = 0;
    setStateSourceKey(sourceKey);
    setExtraction(normalizedPersistedExtraction(sourceExtraction));
    setVerified(null);
    setRequestBusy(false);
    setAutoPoll(false);
    setNotice("");
    setError("");
    setVerificationPending(false);
    if (!sourceKey || !sourceExtraction) return;
    if (sourceExtraction.status === "processing") {
      setAutoPoll(true);
      setNotice(
        "Video review preparation is still processing on GrowPath. This page will check the durable job automatically."
      );
    } else if (sourceExtraction.status === "completed") {
      setVerificationPending(true);
      setNotice(
        "GrowPath previously completed frame selection. Restoring and verifying the exact saved set now."
      );
      const timer = setTimeout(() => void syncRef.current?.(false), 0);
      return () => clearTimeout(timer);
    } else if (
      sourceExtraction.status === "failed" ||
      sourceExtraction.status === "partial"
    ) {
      setError(
        sourceExtraction.error ||
          sourceExtraction.errorMessage ||
          "Video frame selection needs to be retried."
      );
    }
  }, [sourceKey]);

  useEffect(() => {
    if (!autoPoll || status !== "processing" || requestBusy || !sourceId) return;
    if (pollAttemptRef.current >= MAX_AUTOMATIC_POLLS) {
      setAutoPoll(false);
      setNotice(
        "Video review preparation is still processing. Automatic checks paused; use Check Frame Progress later. The server job will continue."
      );
      return;
    }
    const delay =
      POLL_DELAYS_MS[Math.min(pollAttemptRef.current, POLL_DELAYS_MS.length - 1)];
    const timer = setTimeout(() => void syncRef.current?.(false), delay);
    return () => clearTimeout(timer);
  }, [autoPoll, requestBusy, sourceId, status]);

  const nonRetryable = Boolean(
    (status === "failed" || status === "partial") &&
    effectiveExtraction?.retryable === false
  );
  const protectedRetainedFrameSet = isProtectedRetainedFrameSet(effectiveExtraction);
  const actionDisabled = Boolean(
    disabled || requestBusy || unavailableReason || nonRetryable
  );
  const actionLabel = requestBusy
    ? "Checking Video Frames..."
    : unavailableReason
      ? "Video Frames Unavailable"
      : nonRetryable
        ? "Video Frames Cannot Be Retried"
        : protectedRetainedFrameSet
          ? "Check Retained Frame Cleanup"
          : verificationPending || status === "completed"
            ? "Restore Selected Video Frames"
            : status === "processing"
              ? "Check Frame Progress"
              : status === "failed" || status === "partial"
                ? "Retry Video Frame Selection"
                : "Select Best Video Frames";
  const actionBeginsNewJob = serverVideoFrameActionBeginsNewJob(
    status,
    effectiveExtraction
  );

  return {
    sourceVideo,
    sourceId,
    selectedFrames,
    extraction: effectiveExtraction,
    status,
    verified,
    providerReadyAssets,
    ready,
    busy,
    requestBusy,
    verificationPending,
    notice,
    error,
    unavailableReason,
    actionDisabled,
    actionLabel,
    action: () => sync(actionBeginsNewJob)
  };
}
