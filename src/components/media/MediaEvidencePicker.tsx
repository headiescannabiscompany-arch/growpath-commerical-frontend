import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  createEvidenceAsset,
  deleteEvidenceAsset,
  isTerminalEvidenceRegistrationError
} from "@/api/evidence";
import {
  abortEvidenceUpload,
  getEvidenceUploadPlayback,
  uploadEvidenceMedia
} from "@/api/uploads";
import { abortVideoUpload, uploadVideoFile, type VideoWorkspaceType } from "@/api/videos";
import {
  assessEvidencePhoto,
  PHOTO_CAPTURE_GUIDANCE
} from "@/features/personal/diagnosis/photoEvidenceQuality";
import {
  extractVideoFrameCandidates,
  type VideoFrameCandidate
} from "@/features/personal/harvest/videoFrameExtraction";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import type {
  EvidenceAsset,
  EvidenceAssetCreateInput,
  EvidenceLinks,
  EvidencePurpose,
  EvidenceSource
} from "@/types/evidence";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  maxPhotos?: number;
  allowVideo?: boolean;
  extractFramesFromVideo?: boolean;
  /** Save a private source video only; a separate durable server job extracts frames. */
  serverFrameExtractionOnly?: boolean;
  maxExtractedVideoFrames?: number;
  maxVideoSeconds?: number;
  aiUsable?: boolean;
  purpose: EvidencePurpose;
  sourceContext?: EvidenceLinks;
  value?: EvidenceAsset[];
  onChange?: (assets: EvidenceAsset[]) => void;
  titleHeadingLevel?: 2 | 3;
  videoWorkspaceType?: VideoWorkspaceType;
  videoWorkspaceId?: string;
  onBusyChange?: (busy: boolean) => void;
  /** Prevent adding, retrying, or removing evidence while a consuming action runs. */
  disabled?: boolean;
  /** Existing Saved Run assets that Remove should only deselect, never delete. */
  retainOnRemoveAssetIds?: readonly string[];
};

function localId() {
  return `evidence_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function durationSeconds(asset: ImagePicker.ImagePickerAsset) {
  const duration = Number(asset.duration || 0);
  if (!Number.isFinite(duration) || duration <= 0) return undefined;
  // Expo native reports milliseconds. Its web picker reads HTML video metadata,
  // whose duration is already seconds.
  return Platform.OS === "web" ? duration : duration / 1000;
}

function readableDuration(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  if (!minutes) return `${remainder} seconds`;
  return `${minutes} minute${minutes === 1 ? "" : "s"}${
    remainder ? ` ${remainder} seconds` : ""
  }`;
}

function uploadErrorMessage(error: any, assetType: EvidenceAsset["assetType"]) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").trim();
  const tooLarge =
    error?.status === 413 ||
    code.includes("TOO_LARGE") ||
    code.includes("STORAGE_LIMIT") ||
    /file too large|exceeds?.*(?:limit|storage)|storage is full/i.test(message);

  if (tooLarge) {
    return assetType === "video"
      ? message ||
          "This video exceeds the available storage. Choose a shorter or lower-resolution video, then retry."
      : "This photo is still too large after GrowPath prepared it. Crop it or choose the phone's Medium or Large photo size, then retry.";
  }
  if (code === "TIMEOUT" || /timed out/i.test(message)) {
    return `${assetType === "video" ? "The video" : "The photo"} upload took too long on this connection. Try Wi-Fi or a stronger signal, then tap Retry.`;
  }
  if (
    code === "NETWORK_ERROR" ||
    code === "OFFLINE" ||
    code.includes("UPLOAD_NETWORK") ||
    /unable to reach|connection|network|offline|interrupted/i.test(message)
  ) {
    return `${assetType === "video" ? "The video" : "The photo"} upload lost its connection. Check Wi-Fi or cellular signal, then tap Retry.`;
  }
  return message || "Unable to upload evidence. Tap Retry to try again.";
}

function toLocalAsset(
  asset: ImagePicker.ImagePickerAsset,
  purpose: EvidencePurpose,
  sourceContext: EvidenceLinks,
  source: EvidenceSource,
  aiUsable: boolean,
  expectedAssetType?: "photo" | "video"
): EvidenceAsset {
  const assetType = expectedAssetType || (asset.type === "video" ? "video" : "photo");
  const local: EvidenceAsset = {
    id: localId(),
    ...sourceContext,
    assetType,
    originalUri: asset.uri,
    mimeType: asset.mimeType || undefined,
    fileName: asset.fileName || undefined,
    fileSizeBytes: asset.fileSize || undefined,
    width: asset.width || undefined,
    height: asset.height || undefined,
    durationSeconds: assetType === "video" ? durationSeconds(asset) : undefined,
    source,
    purpose,
    uploadStatus: "local",
    aiUsable,
    qualityWarnings: []
  };
  if (assetType === "photo") {
    const assessment = assessEvidencePhoto(local, purpose);
    local.qualityWarnings = assessment.warnings;
    if (!assessment.accepted) {
      local.uploadStatus = "failed";
      local.error = assessment.error || "This photo cannot be used for plant review.";
    }
  }
  return local;
}

function toVideoFrameAsset(
  frame: VideoFrameCandidate,
  purpose: EvidencePurpose,
  sourceContext: EvidenceLinks,
  aiUsable: boolean,
  sourceVideoEvidenceAssetId: string
): EvidenceAsset {
  const local: EvidenceAsset = {
    id: localId(),
    ...sourceContext,
    sourceVideoEvidenceAssetId,
    assetType: "photo",
    originalUri: frame.uri,
    mimeType: frame.mimeType,
    fileName: frame.fileName,
    width: frame.width,
    height: frame.height,
    source: "generated",
    purpose,
    uploadStatus: "local",
    aiUsable,
    qualityWarnings: [
      `Extracted from the source video at ${frame.timeSeconds.toFixed(
        1
      )} seconds. Confirm the diagnostic plant structure, focus, color, and glare before analysis.`
    ]
  };
  const assessment = assessEvidencePhoto(local, purpose);
  local.qualityWarnings = [
    ...local.qualityWarnings,
    ...assessment.warnings.filter((warning) => !local.qualityWarnings.includes(warning))
  ];
  if (!assessment.accepted) {
    local.uploadStatus = "failed";
    local.error = assessment.error || "This frame cannot be used for plant review.";
  }
  return local;
}

export default function MediaEvidencePicker({
  maxPhotos = 10,
  allowVideo = false,
  extractFramesFromVideo = false,
  serverFrameExtractionOnly = false,
  maxExtractedVideoFrames = 6,
  maxVideoSeconds = 30,
  aiUsable = false,
  purpose,
  sourceContext = {},
  value,
  onChange,
  titleHeadingLevel,
  videoWorkspaceType,
  videoWorkspaceId,
  onBusyChange,
  disabled = false,
  retainOnRemoveAssetIds = []
}: Props) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const [internalAssets, setInternalAssets] = useState<EvidenceAsset[]>(value || []);
  const [videoFeedback, setVideoFeedback] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [protectedPreviewUrls, setProtectedPreviewUrls] = useState<
    Record<string, string>
  >({});
  const [retryableAssetIds, setRetryableAssetIds] = useState<Set<string>>(
    () => new Set()
  );
  const [activeJobIds, setActiveJobIds] = useState<Set<string>>(() => new Set());
  const localWebFiles = useRef(new Map<string, Blob>());
  const localPreviewUris = useRef(new Map<string, string>());
  const protectedPreviewUrlsRef = useRef<Record<string, string>>({});
  const assetsRef = useRef<EvidenceAsset[]>(value || internalAssets);
  const uploadControllers = useRef(new Map<string, AbortController>());
  const removedAssetIds = useRef(new Set<string>());
  const pendingDurableUploads = useRef(new Map<string, any>());
  const pendingUploadReservations = useRef(new Map<string, any>());
  const registrationStartedAssetIds = useRef(new Set<string>());
  const pendingRegistrationInputs = useRef(new Map<string, EvidenceAssetCreateInput>());
  const pickerActive = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const disposed = useRef(false);
  const protectedPreviewExpiries = useRef<Record<string, number>>({});
  const protectedPreviewRefreshTimers = useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  );
  const assets = value || internalAssets;
  assetsRef.current = assets;
  const photoCount = assets.filter((asset) => asset.assetType === "photo").length;
  const videoCount = assets.filter((asset) => asset.assetType === "video").length;
  const busy =
    activeJobIds.size > 0 || assets.some((asset) => asset.uploadStatus === "uploading");
  const captureGuidance = PHOTO_CAPTURE_GUIDANCE[purpose] || [];
  const uploadWorkspace = useMemo(() => {
    const workspaceType =
      videoWorkspaceType || (sourceContext.facilityId ? "facility" : "personal");
    if (workspaceType === "facility") {
      const facilityId = String(
        videoWorkspaceId || sourceContext.facilityId || ""
      ).trim();
      return {
        workspaceType: "facility" as const,
        ...(facilityId ? { workspaceId: facilityId, facilityId } : {})
      };
    }
    if (workspaceType === "commercial") {
      const workspaceId = String(videoWorkspaceId || "").trim();
      return {
        workspaceType: "commercial" as const,
        ...(workspaceId ? { workspaceId } : {})
      };
    }
    return { workspaceType: "personal" as const };
  }, [sourceContext.facilityId, videoWorkspaceId, videoWorkspaceType]);
  const retainOnRemoveAssetIdSet = useMemo(
    () =>
      new Set(
        retainOnRemoveAssetIds.map((id) => String(id || "").trim()).filter(Boolean)
      ),
    [retainOnRemoveAssetIds]
  );
  const protectedPreviewInputKey = useMemo(
    () =>
      assets
        .filter(
          (asset) =>
            asset.assetType === "photo" &&
            asset.uploadStatus === "uploaded" &&
            /\/api\/evidence-assets\/uploads\/[^/]+\/object(?:[?#].*)?$/i.test(
              String(asset.durableUrl || asset.originalUri || "")
            )
        )
        .map((asset) => `${asset.id}:${asset.durableUrl || asset.originalUri}`)
        .join("|"),
    [assets]
  );

  useEffect(
    () => () => {
      disposed.current = true;
    },
    []
  );

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    let active = true;
    const refreshTimers = protectedPreviewRefreshTimers.current;
    const clearRefreshTimer = (assetId: string) => {
      const timer = refreshTimers.get(assetId);
      if (timer) clearTimeout(timer);
      refreshTimers.delete(assetId);
    };
    const refresh = async (assetId: string, protectedAssetId: string) => {
      clearRefreshTimer(assetId);
      try {
        const { playbackUrl, expiresInSeconds } = await getEvidenceUploadPlayback(
          protectedAssetId,
          uploadWorkspace
        );
        if (!active || disposed.current || !playbackUrl) return;
        const lifetimeMs = Math.max(0, expiresInSeconds * 1000);
        protectedPreviewUrlsRef.current = {
          ...protectedPreviewUrlsRef.current,
          [assetId]: playbackUrl
        };
        protectedPreviewExpiries.current[assetId] = Date.now() + lifetimeMs;
        setProtectedPreviewUrls(protectedPreviewUrlsRef.current);
        if (lifetimeMs > 0) {
          // Refresh at least five seconds, and normally one minute, before expiry.
          const marginMs = Math.min(60000, Math.max(5000, lifetimeMs * 0.1));
          const delayMs = Math.max(1000, lifetimeMs - marginMs);
          refreshTimers.set(
            assetId,
            setTimeout(() => void refresh(assetId, protectedAssetId), delayMs)
          );
        }
      } catch {
        // Keep the local preview (when available) and retry while this asset is mounted.
        if (active && !disposed.current) {
          refreshTimers.set(
            assetId,
            setTimeout(() => void refresh(assetId, protectedAssetId), 15000)
          );
        }
      }
    };

    for (const asset of assetsRef.current) {
      if (asset.assetType !== "photo" || asset.uploadStatus !== "uploaded") continue;
      const durableUrl = String(asset.durableUrl || asset.originalUri || "");
      const match = durableUrl.match(
        /\/api\/evidence-assets\/uploads\/([^/]+)\/object(?:[?#].*)?$/i
      );
      if (!match) continue;
      const expiresAt = protectedPreviewExpiries.current[asset.id] || 0;
      if (!protectedPreviewUrlsRef.current[asset.id] || expiresAt - Date.now() <= 60000) {
        void refresh(asset.id, decodeURIComponent(match[1]));
      } else {
        clearRefreshTimer(asset.id);
        refreshTimers.set(
          asset.id,
          setTimeout(
            () => void refresh(asset.id, decodeURIComponent(match[1])),
            Math.max(1000, expiresAt - Date.now() - 60000)
          )
        );
      }
    }
    return () => {
      active = false;
      for (const timer of refreshTimers.values()) {
        clearTimeout(timer);
      }
      refreshTimers.clear();
    };
  }, [protectedPreviewInputKey, uploadWorkspace]);

  useEffect(
    () => () => {
      for (const controller of uploadControllers.current.values()) controller.abort();
      uploadControllers.current.clear();
      for (const [assetId, uploaded] of pendingDurableUploads.current.entries()) {
        // Registration may already have committed even if navigation canceled the
        // response. Deleting only the object would leave a broken EvidenceAsset row.
        if (registrationStartedAssetIds.current.has(assetId)) continue;
        const asset = assetsRef.current.find((candidate) => candidate.id === assetId);
        if (!uploaded?.assetId || !asset) continue;
        if (asset.assetType === "video") {
          void abortVideoUpload(String(uploaded.assetId), uploadWorkspace, {
            clientUploadKey: asset.id,
            timeoutMs: 5000
          }).catch(() => undefined);
        } else {
          void abortEvidenceUpload(String(uploaded.assetId), uploadWorkspace).catch(
            () => undefined
          );
        }
      }
      pendingDurableUploads.current.clear();
      registrationStartedAssetIds.current.clear();
      pendingRegistrationInputs.current.clear();
      for (const reservation of pendingUploadReservations.current.values()) {
        if (!reservation?.assetId) continue;
        if (reservation.assetType === "video") {
          void abortVideoUpload(String(reservation.assetId), uploadWorkspace, {
            clientUploadKey: reservation.clientUploadKey,
            timeoutMs: 5000
          }).catch(() => undefined);
        } else {
          void abortEvidenceUpload(String(reservation.assetId), uploadWorkspace).catch(
            () => undefined
          );
        }
      }
      pendingUploadReservations.current.clear();
      for (const uri of localPreviewUris.current.values()) {
        if (
          Platform.OS === "web" &&
          uri.startsWith("blob:") &&
          typeof URL !== "undefined" &&
          typeof URL.revokeObjectURL === "function"
        ) {
          URL.revokeObjectURL(uri);
        }
      }
      localPreviewUris.current.clear();
      for (const timer of protectedPreviewRefreshTimers.current.values()) {
        clearTimeout(timer);
      }
      protectedPreviewRefreshTimers.current.clear();
    },
    [uploadWorkspace]
  );

  const summary = useMemo(
    () =>
      `${photoCount}/${maxPhotos} photos${allowVideo ? ` · ${videoCount}/1 video` : ""}`,
    [allowVideo, maxPhotos, photoCount, videoCount]
  );

  function commit(next: EvidenceAsset[]) {
    if (disposed.current) return;
    assetsRef.current = next;
    setInternalAssets(next);
    onChange?.(next);
  }

  function updateAsset(assetId: string, update: (asset: EvidenceAsset) => EvidenceAsset) {
    const next = assetsRef.current.map((asset) =>
      asset.id === assetId ? update(asset) : asset
    );
    commit(next);
    return next;
  }

  function markJobActive(assetId: string, active: boolean) {
    if (disposed.current) return;
    setActiveJobIds((current) => {
      const next = new Set(current);
      if (active) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }

  function markRetryable(assetId: string, retryable: boolean) {
    if (disposed.current) return;
    setRetryableAssetIds((current) => {
      const next = new Set(current);
      if (retryable) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }

  function clearProgress(assetId: string) {
    if (disposed.current) return;
    setUploadProgress((current) => {
      if (!(assetId in current)) return current;
      const next = { ...current };
      delete next[assetId];
      return next;
    });
  }

  async function uploadEvidenceVideo(
    local: EvidenceAsset,
    controller: AbortController | undefined
  ) {
    let timedOut = false;
    let stalled = false;
    let noProgressTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const armNoProgressWatchdog = () => {
      if (!controller) return;
      if (noProgressTimeoutId) clearTimeout(noProgressTimeoutId);
      noProgressTimeoutId = setTimeout(() => {
        stalled = true;
        controller.abort();
      }, 90 * 1000);
    };
    const timeoutId = controller
      ? setTimeout(
          () => {
            timedOut = true;
            controller.abort();
          },
          // A short 4K iPhone clip can still be 60-100 MB. Keep the no-progress
          // watchdog at 90 seconds, but allow a continuously advancing LTE upload
          // enough total time to finish its resumable parts.
          15 * 60 * 1000
        )
      : null;
    armNoProgressWatchdog();
    try {
      const uploaded = await uploadVideoFile(
        {
          uri: local.originalUri,
          file: localWebFiles.current.get(local.id),
          fileName: local.fileName,
          fileSize: local.fileSizeBytes,
          mimeType: local.mimeType
        },
        uploadWorkspace,
        (fraction) => {
          armNoProgressWatchdog();
          if (disposed.current) return;
          setUploadProgress((progress) => ({
            ...progress,
            [local.id]: Math.max(0, Math.min(100, Math.round(fraction * 100)))
          }));
        },
        {
          signal: controller?.signal,
          clientUploadKey: local.id,
          onReservation: (reservation) => {
            const tracked = {
              ...reservation,
              assetType: "video",
              clientUploadKey: local.id
            };
            if (disposed.current && reservation.assetId) {
              void abortVideoUpload(String(reservation.assetId), uploadWorkspace, {
                clientUploadKey: local.id,
                timeoutMs: 5000
              }).catch(() => undefined);
              return;
            }
            pendingUploadReservations.current.set(local.id, tracked);
          }
        }
      );
      pendingUploadReservations.current.delete(local.id);
      return uploaded;
    } catch (error) {
      if (timedOut || stalled) {
        const timeoutError = new Error(
          stalled
            ? "The video upload stopped making progress."
            : "The video upload timed out."
        ) as Error & {
          code?: string;
        };
        timeoutError.code = "TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (noProgressTimeoutId) clearTimeout(noProgressTimeoutId);
    }
  }

  async function releasePendingMedia(local: EvidenceAsset, uploaded: any) {
    if (!uploaded?.assetId) return;
    if (local.assetType === "video") {
      await abortVideoUpload(String(uploaded.assetId), uploadWorkspace, {
        clientUploadKey: local.id,
        timeoutMs: 5000
      }).catch(() => undefined);
      return;
    }
    await abortEvidenceUpload(String(uploaded.assetId), uploadWorkspace).catch(
      () => undefined
    );
  }

  async function uploadEvidencePhoto(
    local: EvidenceAsset,
    controller: AbortController | undefined
  ) {
    let timedOut = false;
    let stalled = false;
    let noProgressTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const armNoProgressWatchdog = () => {
      if (!controller) return;
      if (noProgressTimeoutId) clearTimeout(noProgressTimeoutId);
      noProgressTimeoutId = setTimeout(() => {
        stalled = true;
        controller.abort();
      }, 75 * 1000);
    };
    const timeoutId = controller
      ? setTimeout(
          () => {
            timedOut = true;
            controller.abort();
          },
          5 * 60 * 1000
        )
      : null;
    armNoProgressWatchdog();
    try {
      const uploaded = await uploadEvidenceMedia({
        assetType: "photo",
        clientUploadKey: local.id,
        uri: local.originalUri,
        file: localWebFiles.current.get(local.id),
        name: local.fileName,
        mimeType: local.mimeType,
        fileSizeBytes: local.fileSizeBytes,
        width: local.width,
        height: local.height,
        ...uploadWorkspace,
        signal: controller?.signal,
        onProgress: (fraction: number) => {
          armNoProgressWatchdog();
          if (disposed.current) return;
          setUploadProgress((progress) => ({
            ...progress,
            [local.id]: Math.max(0, Math.min(100, Math.round(fraction * 100)))
          }));
        },
        onReservation: (reservation: any) => {
          const tracked = {
            ...reservation,
            assetType: "photo",
            clientUploadKey: local.id
          };
          if (disposed.current && reservation?.assetId) {
            void abortEvidenceUpload(String(reservation.assetId), uploadWorkspace).catch(
              () => undefined
            );
            return;
          }
          pendingUploadReservations.current.set(local.id, tracked);
        }
      });
      pendingUploadReservations.current.delete(local.id);
      return uploaded;
    } catch (error) {
      if (timedOut || stalled) {
        const timeoutError = new Error(
          stalled
            ? "The photo upload stopped making progress."
            : "The photo upload timed out."
        ) as Error & {
          code?: string;
        };
        timeoutError.code = "TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (noProgressTimeoutId) clearTimeout(noProgressTimeoutId);
    }
  }

  async function uploadSelected(selected: EvidenceAsset[], retrying = false) {
    if (disposed.current) return assetsRef.current;
    const batchJobId = `batch_${localId()}`;
    markJobActive(batchJobId, true);
    try {
      const current = [...assetsRef.current];
      for (const local of selected) {
        if (!current.some((asset) => asset.id === local.id)) current.push(local);
        if (!localPreviewUris.current.has(local.id)) {
          localPreviewUris.current.set(local.id, local.originalUri);
        }
      }
      commit(current);
      for (const local of selected) {
        if (disposed.current) break;
        if (removedAssetIds.current.has(local.id)) continue;
        if (local.uploadStatus === "failed" && !retrying) continue;
        markJobActive(local.id, true);
        updateAsset(local.id, (asset) => ({
          ...asset,
          uploadStatus: "uploading",
          error: undefined
        }));
        markRetryable(local.id, false);
        const controller =
          typeof AbortController !== "undefined" ? new AbortController() : undefined;
        if (controller) uploadControllers.current.set(local.id, controller);
        try {
          let uploaded = pendingDurableUploads.current.get(local.id);
          if (!uploaded) {
            uploaded =
              local.assetType === "video"
                ? await uploadEvidenceVideo(local, controller)
                : await uploadEvidencePhoto(local, controller);
            if (!uploaded?.url) throw new Error("Evidence upload did not return a URL.");
            pendingDurableUploads.current.set(local.id, uploaded);
          }
          if (disposed.current || removedAssetIds.current.has(local.id)) {
            pendingDurableUploads.current.delete(local.id);
            void releasePendingMedia(local, uploaded);
            continue;
          }
          const {
            error: _localError,
            workspaceType: _localWorkspaceType,
            workspaceId: _localWorkspaceId,
            facilityId: _localFacilityId,
            ...cleanLocal
          } = local;
          const registrationInput: EvidenceAssetCreateInput = {
            ...cleanLocal,
            ...uploadWorkspace,
            clientUploadKey: local.id,
            originalUri: uploaded.url,
            durableUrl: uploaded.url,
            mimeType: uploaded.mimeType || local.mimeType,
            fileName: uploaded.fileName || local.fileName,
            fileSizeBytes: uploaded.bytes || local.fileSizeBytes,
            uploadStatus: "uploaded"
          };
          pendingRegistrationInputs.current.set(local.id, registrationInput);
          registrationStartedAssetIds.current.add(local.id);
          const saved = await createEvidenceAsset(registrationInput, {
            signal: controller?.signal
          });
          // Once the record exists, the backend owns object lifecycle. Never delete the
          // raw object independently or the saved row can point at missing media.
          registrationStartedAssetIds.current.delete(local.id);
          pendingRegistrationInputs.current.delete(local.id);
          pendingDurableUploads.current.delete(local.id);
          pendingUploadReservations.current.delete(local.id);
          const durableSaved = {
            ...saved,
            id: local.id,
            _id: saved._id || saved.id,
            originalUri: saved.durableUrl || uploaded.url
          };
          if (removedAssetIds.current.has(local.id)) {
            const persistedId = String(saved?._id || saved?.id || "");
            if (persistedId) {
              void deleteEvidenceAsset(persistedId, uploadWorkspace, {
                timeoutMs: 5000
              }).catch(() => {
                if (disposed.current) return;
                removedAssetIds.current.delete(local.id);
                commit([
                  ...assetsRef.current,
                  {
                    ...durableSaved,
                    error:
                      "GrowPath could not remove this saved evidence. It has been restored; check your connection and try again."
                  }
                ]);
              });
            }
            continue;
          }
          if (disposed.current) {
            continue;
          }
          localWebFiles.current.delete(local.id);
          clearProgress(local.id);
          updateAsset(local.id, () => durableSaved);
        } catch (error: any) {
          if (disposed.current || removedAssetIds.current.has(local.id)) continue;
          if (isTerminalEvidenceRegistrationError(error)) {
            registrationStartedAssetIds.current.delete(local.id);
            pendingRegistrationInputs.current.delete(local.id);
          }
          const uploaded = pendingDurableUploads.current.get(local.id);
          updateAsset(local.id, (asset) => ({
            ...asset,
            uploadStatus: "failed",
            error: uploaded
              ? "The file uploaded, but GrowPath could not finish saving it. Tap Retry; the file will not upload again."
              : uploadErrorMessage(error, local.assetType)
          }));
          markRetryable(local.id, true);
          clearProgress(local.id);
        } finally {
          uploadControllers.current.delete(local.id);
          markJobActive(local.id, false);
        }
      }
    } finally {
      markJobActive(batchJobId, false);
    }
    return assetsRef.current;
  }

  async function choosePhotos() {
    const remaining = Math.max(0, maxPhotos - photoCount);
    if (!remaining || busy || disabledRef.current || pickerActive.current) return;
    const pickerJobId = "picker_photos";
    pickerActive.current = true;
    markJobActive(pickerJobId, true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (disposed.current || !permission.granted) return;
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.85
      });
      if (disposed.current || disabledRef.current || picked.canceled) return;
      const selected = (picked.assets || [])
        .slice(0, remaining)
        .map((asset) =>
          toLocalAsset(asset, purpose, sourceContext, "library", aiUsable, "photo")
        );
      if (Platform.OS === "web") {
        selected.forEach((local, index) => {
          const file = picked.assets?.[index]?.file;
          if (file) localWebFiles.current.set(local.id, file);
        });
      }
      await uploadSelected(selected);
    } finally {
      pickerActive.current = false;
      markJobActive(pickerJobId, false);
    }
  }

  async function chooseVideo() {
    if (!allowVideo || videoCount || busy || disabledRef.current || pickerActive.current)
      return;
    const pickerJobId = "picker_video";
    pickerActive.current = true;
    markJobActive(pickerJobId, true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (disposed.current || !permission.granted) return;
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        videoMaxDuration: maxVideoSeconds,
        quality: 0.8
      });
      if (
        disposed.current ||
        disabledRef.current ||
        picked.canceled ||
        !picked.assets?.[0]
      )
        return;
      const local = toLocalAsset(
        picked.assets[0],
        purpose,
        sourceContext,
        "library",
        extractFramesFromVideo || serverFrameExtractionOnly ? false : aiUsable,
        "video"
      );
      if (!local.durationSeconds) {
        local.uploadStatus = "failed";
        local.error =
          "GrowPath could not read this video's duration. Trim or export the video, then select it again.";
        commit([...assetsRef.current, local]);
        return;
      }
      if (local.durationSeconds > maxVideoSeconds) {
        local.uploadStatus = "failed";
        local.error = `Video must be ${readableDuration(maxVideoSeconds)} or shorter.`;
        commit([...assetsRef.current, local]);
        return;
      }
      if (Platform.OS === "web" && picked.assets[0].file) {
        localWebFiles.current.set(local.id, picked.assets[0].file);
      }
      if (!disposed.current) setVideoFeedback("");
      const withVideo = await uploadSelected([local]);
      if (disposed.current) return;
      const savedVideo = withVideo.find((asset) => asset.id === local.id);
      if (
        serverFrameExtractionOnly &&
        savedVideo?.uploadStatus === "uploaded" &&
        !disposed.current &&
        !removedAssetIds.current.has(local.id)
      ) {
        setVideoFeedback(
          "Private source video uploaded. Use the separate Extract Video Frames action to start or restore the durable server job; this device did not create or upload local frames."
        );
        return;
      }
      if (
        !extractFramesFromVideo ||
        savedVideo?.uploadStatus !== "uploaded" ||
        disposed.current ||
        removedAssetIds.current.has(local.id)
      ) {
        return;
      }
      const sourceVideoEvidenceAssetId = String(savedVideo?._id || "").trim();
      if (!sourceVideoEvidenceAssetId) {
        setVideoFeedback(
          "The source video was saved without a durable evidence reference, so GrowPath did not extract frames. Retry the video or add sharp photos instead."
        );
        return;
      }

      const availablePhotoSlots = Math.max(
        0,
        maxPhotos -
          assetsRef.current.filter((asset) => asset.assetType === "photo").length
      );
      if (!availablePhotoSlots) {
        if (!disposed.current) {
          setVideoFeedback(
            "The source video was saved, but no frame slots remain. Remove a photo before extracting video frames."
          );
        }
        return;
      }
      markJobActive(local.id, true);
      try {
        if (!disposed.current) {
          setVideoFeedback("Reading candidate frames from the source video...");
        }
        const frames = await extractVideoFrameCandidates({
          uri: local.originalUri,
          durationSeconds: local.durationSeconds,
          maxFrames: Math.min(maxExtractedVideoFrames, availablePhotoSlots)
        });
        if (disposed.current || removedAssetIds.current.has(local.id)) return;
        const frameAssets = frames.map((frame) =>
          toVideoFrameAsset(
            frame,
            purpose,
            sourceContext,
            aiUsable,
            sourceVideoEvidenceAssetId
          )
        );
        const frameUploadResults = await uploadSelected(frameAssets);
        if (disposed.current || removedAssetIds.current.has(local.id)) return;
        const uploadedFrameCount = frameAssets.filter(
          (frame) =>
            frameUploadResults.find((asset) => asset.id === frame.id)?.uploadStatus ===
            "uploaded"
        ).length;
        const failedFrameCount = frameAssets.length - uploadedFrameCount;
        if (!disposed.current) {
          if (uploadedFrameCount === frameAssets.length) {
            setVideoFeedback(
              `${uploadedFrameCount} still frame${
                uploadedFrameCount === 1 ? "" : "s"
              } extracted and uploaded for image review. Review them like ordinary photos; frames hidden by glare or blur will be excluded by the AI review.`
            );
          } else if (uploadedFrameCount > 0) {
            setVideoFeedback(
              `${uploadedFrameCount} of ${frameAssets.length} extracted still frames uploaded for image review. ${failedFrameCount} frame${
                failedFrameCount === 1 ? "" : "s"
              } failed; tap Retry on each failed frame or add sharp photos instead.`
            );
          } else {
            setVideoFeedback(
              `The source video was saved, but none of its ${frameAssets.length} extracted still frame${
                frameAssets.length === 1 ? "" : "s"
              } uploaded for image review. Tap Retry on each failed frame or add sharp photos instead.`
            );
          }
        }
      } catch (error: any) {
        if (!disposed.current && !removedAssetIds.current.has(local.id)) {
          setVideoFeedback(
            `The source video was saved, but its still frames could not be extracted. ${
              error?.message || "Add sharp photos from the video instead."
            }`
          );
        }
      } finally {
        markJobActive(local.id, false);
      }
    } finally {
      pickerActive.current = false;
      markJobActive(pickerJobId, false);
    }
  }

  async function retryUpload(asset: EvidenceAsset) {
    if (busy || disabledRef.current || !retryableAssetIds.has(asset.id)) return;
    await uploadSelected([asset], true);
  }

  async function reconcileAndDeleteAmbiguousRegistration(
    asset: EvidenceAsset,
    uploaded: any,
    registrationInput: EvidenceAssetCreateInput
  ) {
    let saved: EvidenceAsset;
    try {
      saved = await createEvidenceAsset(registrationInput);
    } catch (error) {
      if (isTerminalEvidenceRegistrationError(error)) {
        await releasePendingMedia(asset, uploaded);
      }
      // Ambiguous failures keep the protected object intact. The same stable key can
      // reconcile later, while backend expiry handles abandoned pending reservations.
      return;
    }

    const persistedId = String(saved?._id || saved?.id || "");
    if (!persistedId) return;
    try {
      await deleteEvidenceAsset(persistedId, uploadWorkspace, {
        timeoutMs: 5000
      });
    } catch {
      if (disposed.current) return;
      removedAssetIds.current.delete(asset.id);
      commit([
        ...assetsRef.current,
        {
          ...saved,
          id: asset.id,
          _id: saved._id || saved.id,
          originalUri: saved.durableUrl || uploaded.url,
          error:
            "GrowPath could not remove this saved evidence. It has been restored; check your connection and try again."
        }
      ]);
    }
  }

  function removeAsset(
    asset: EvidenceAsset,
    options: {
      cascadeGeneratedFrames?: boolean;
      restoreOnDeleteFailure?: boolean;
    } = {}
  ) {
    if (disabledRef.current) return;
    const cascadeGeneratedFrames = options.cascadeGeneratedFrames !== false;
    const restoreOnDeleteFailure = options.restoreOnDeleteFailure !== false;
    if (cascadeGeneratedFrames && asset.assetType === "video") {
      const sourceIds = new Set(
        [asset.id, asset._id].map((id) => String(id || "").trim()).filter(Boolean)
      );
      assetsRef.current
        .filter(
          (candidate) =>
            candidate.assetType === "photo" &&
            candidate.source === "generated" &&
            sourceIds.has(String(candidate.sourceVideoEvidenceAssetId || "").trim())
        )
        .forEach((frame) =>
          removeAsset(frame, {
            cascadeGeneratedFrames: false,
            // The source-video delete is authoritative and cascades its generated
            // children on the server. Never put a child frame back into the active
            // review after the user removed its source video.
            restoreOnDeleteFailure: false
          })
        );
    }
    const originalIndex = assetsRef.current.findIndex((item) => item.id === asset.id);
    const persistedId = String(asset._id || "");
    const retainDurableRecord = [asset.id, asset._id].some((id) =>
      retainOnRemoveAssetIdSet.has(String(id || "").trim())
    );
    removedAssetIds.current.add(asset.id);
    uploadControllers.current.get(asset.id)?.abort();
    uploadControllers.current.delete(asset.id);
    const uploaded = pendingDurableUploads.current.get(asset.id);
    const registrationInput = pendingRegistrationInputs.current.get(asset.id);
    const registrationIsAmbiguous = registrationStartedAssetIds.current.has(asset.id);
    pendingDurableUploads.current.delete(asset.id);
    pendingRegistrationInputs.current.delete(asset.id);
    registrationStartedAssetIds.current.delete(asset.id);
    if (uploaded) {
      if (registrationIsAmbiguous && registrationInput) {
        void reconcileAndDeleteAmbiguousRegistration(asset, uploaded, registrationInput);
      } else {
        void releasePendingMedia(asset, uploaded);
      }
    }
    const reservation = pendingUploadReservations.current.get(asset.id);
    pendingUploadReservations.current.delete(asset.id);
    if (reservation?.assetId) {
      if (reservation.assetType === "video") {
        void abortVideoUpload(String(reservation.assetId), uploadWorkspace, {
          clientUploadKey: reservation.clientUploadKey || asset.id,
          timeoutMs: 5000
        }).catch(() => undefined);
      } else {
        void abortEvidenceUpload(String(reservation.assetId), uploadWorkspace).catch(
          () => undefined
        );
      }
    }
    localWebFiles.current.delete(asset.id);
    localPreviewUris.current.delete(asset.id);
    protectedPreviewUrlsRef.current = Object.fromEntries(
      Object.entries(protectedPreviewUrlsRef.current).filter(([id]) => id !== asset.id)
    );
    delete protectedPreviewExpiries.current[asset.id];
    const previewRefreshTimer = protectedPreviewRefreshTimers.current.get(asset.id);
    if (previewRefreshTimer) clearTimeout(previewRefreshTimer);
    protectedPreviewRefreshTimers.current.delete(asset.id);
    setProtectedPreviewUrls(protectedPreviewUrlsRef.current);
    markRetryable(asset.id, false);
    clearProgress(asset.id);
    if (
      Platform.OS === "web" &&
      asset.source === "generated" &&
      asset.originalUri.startsWith("blob:") &&
      typeof URL !== "undefined" &&
      typeof URL.revokeObjectURL === "function"
    ) {
      URL.revokeObjectURL(asset.originalUri);
    }
    commit(assetsRef.current.filter((item) => item.id !== asset.id));
    if (persistedId && !retainDurableRecord) {
      void deleteEvidenceAsset(persistedId, uploadWorkspace, { timeoutMs: 5000 }).catch(
        () => {
          if (disposed.current) return;
          if (!restoreOnDeleteFailure) return;
          removedAssetIds.current.delete(asset.id);
          const restored = {
            ...asset,
            error:
              "GrowPath could not remove this saved evidence. It has been restored; check your connection and try again."
          };
          const next = [...assetsRef.current];
          next.splice(Math.max(0, Math.min(originalIndex, next.length)), 0, restored);
          commit(next);
        }
      );
    }
  }

  return (
    <View style={styles.container} accessibilityLabel="Media evidence picker">
      <View style={styles.header}>
        <Text
          accessibilityRole={titleHeadingLevel ? "header" : undefined}
          aria-level={titleHeadingLevel}
          style={styles.title}
        >
          Photos and video evidence
        </Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <Text style={styles.help}>
        {aiUsable
          ? "Adding media approves AI use for this workflow only. It is not used for model training. Failed uploads are never sent to AI analysis."
          : "Upload clear, durable evidence. Failed uploads are never sent to AI analysis."}
      </Text>
      {allowVideo && serverFrameExtractionOnly ? (
        <Text style={styles.help}>
          The video is saved as private source evidence with AI use disabled. This device
          does not create or upload local still frames. After upload, use the separate
          Extract Video Frames action to run the durable server job, then GrowPath
          verifies the exact saved frame set before image review.
        </Text>
      ) : allowVideo && extractFramesFromVideo ? (
        <Text style={styles.help}>
          A video is kept as private evidence. GrowPath samples up to{" "}
          {Math.min(maxExtractedVideoFrames, maxPhotos)} timestamped still frames across
          the video. Each sampled frame is uploaded for image review; AI then evaluates
          focus, lighting, glare, and diagnostic detail and can exclude unusable frames.
          It does not guess from motion or rebuild detail hidden by blur or glare.
        </Text>
      ) : null}
      {captureGuidance.length ? (
        <View style={styles.guidance} accessibilityLabel={`${purpose} photo checklist`}>
          <Text accessibilityRole="header" aria-level={3} style={styles.guidanceTitle}>
            Photos that make the review stronger
          </Text>
          {captureGuidance.map((item, index) => (
            <Text key={item} style={styles.guidanceItem}>
              {index + 1}. {item}
            </Text>
          ))}
          <Text style={styles.guidanceNote}>
            Photo count alone does not prove complete evidence. GrowPath can reject
            obviously tiny or invalid files before upload. Blur, focus, lighting, glare,
            target detail, and whether every required view is present are confirmed during
            image review.
          </Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add evidence photos"
          accessibilityState={{ disabled: disabled || busy || photoCount >= maxPhotos }}
          disabled={disabled || busy || photoCount >= maxPhotos}
          onPress={choosePhotos}
          style={[
            styles.button,
            (disabled || busy || photoCount >= maxPhotos) && styles.disabled
          ]}
        >
          <Text style={styles.buttonText}>Add Photos</Text>
        </Pressable>
        {allowVideo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add evidence video"
            accessibilityState={{ disabled: disabled || busy || videoCount >= 1 }}
            disabled={disabled || busy || videoCount >= 1}
            onPress={chooseVideo}
            style={[
              styles.button,
              (disabled || busy || videoCount >= 1) && styles.disabled
            ]}
          >
            <Text style={styles.buttonText}>Add Video</Text>
          </Pressable>
        ) : null}
      </View>
      {videoFeedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.videoFeedback}>
          {videoFeedback}
        </Text>
      ) : null}
      <View style={styles.grid}>
        {assets.map((asset, index) => (
          <View key={asset.id} style={styles.asset}>
            {asset.assetType === "photo" ? (
              <Image
                source={{
                  uri:
                    protectedPreviewUrls[asset.id] ||
                    localPreviewUris.current.get(asset.id) ||
                    resolveImageUri(asset.originalUri || asset.durableUrl)
                }}
                style={styles.preview}
                accessibilityLabel={`Evidence photo ${index + 1}`}
              />
            ) : (
              <View style={[styles.preview, styles.videoPreview]}>
                <Text style={styles.videoText}>Video</Text>
                <Text style={styles.videoMeta}>
                  {Math.round(asset.durationSeconds || 0)} sec
                </Text>
              </View>
            )}
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {asset.uploadStatus === "uploading" &&
              uploadProgress[asset.id] !== undefined
                ? `Uploading ${uploadProgress[asset.id]}%`
                : asset.uploadStatus}
            </Text>
            {(asset.qualityWarnings || []).map((warning) => (
              <Text key={warning} style={styles.warning}>
                Photo check: {warning}
              </Text>
            ))}
            {asset.error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {asset.error}
              </Text>
            ) : null}
            {retryableAssetIds.has(asset.id) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retry evidence ${asset.id}`}
                accessibilityState={{ disabled: disabled || busy }}
                disabled={disabled || busy}
                onPress={() => void retryUpload(asset)}
                style={[styles.retry, (disabled || busy) && styles.disabled]}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove evidence ${asset.id}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => removeAsset(asset)}
              style={[styles.remove, disabled && styles.disabled]}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    header: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    title: { color: palette.text, fontSize: 16, fontWeight: "800" },
    summary: { color: palette.textMuted, fontWeight: "700" },
    help: { color: palette.textMuted, lineHeight: 18 },
    guidance: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 10
    },
    guidanceTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
    guidanceItem: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    guidanceNote: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 3
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    disabled: { opacity: 0.45 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    asset: { minWidth: 130, width: 150 },
    preview: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      height: 110
    },
    videoPreview: { alignItems: "center", justifyContent: "center" },
    videoText: { color: palette.text, fontWeight: "800" },
    videoMeta: { color: palette.textMuted, marginTop: 4 },
    videoFeedback: { color: palette.textMuted, lineHeight: 18 },
    status: {
      color: palette.textMuted,
      fontSize: 12,
      marginTop: 4,
      textTransform: "capitalize"
    },
    error: { color: palette.danger, fontSize: 12, marginTop: 3 },
    warning: { color: palette.warning, fontSize: 12, marginTop: 3 },
    retry: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      marginTop: 6,
      minHeight: 44,
      paddingVertical: 7
    },
    retryText: { color: palette.text, fontWeight: "800" },
    remove: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      paddingVertical: 7
    },
    removeText: { color: palette.danger, fontWeight: "700" }
  });
