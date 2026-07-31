import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { createEvidenceAsset } from "@/api/evidence";
import { uploadEvidenceMedia } from "@/api/uploads";
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
  EvidenceLinks,
  EvidencePurpose,
  EvidenceSource
} from "@/types/evidence";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  maxPhotos?: number;
  allowVideo?: boolean;
  extractFramesFromVideo?: boolean;
  maxExtractedVideoFrames?: number;
  maxVideoSeconds?: number;
  aiUsable?: boolean;
  purpose: EvidencePurpose;
  sourceContext?: EvidenceLinks;
  value?: EvidenceAsset[];
  onChange?: (assets: EvidenceAsset[]) => void;
};

function localId() {
  return `evidence_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function durationSeconds(asset: ImagePicker.ImagePickerAsset) {
  const duration = Number(asset.duration || 0);
  return duration > 1000 ? duration / 1000 : duration;
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

function toLocalAsset(
  asset: ImagePicker.ImagePickerAsset,
  purpose: EvidencePurpose,
  sourceContext: EvidenceLinks,
  source: EvidenceSource,
  aiUsable: boolean
): EvidenceAsset {
  const assetType = asset.type === "video" ? "video" : "photo";
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
  aiUsable: boolean
): EvidenceAsset {
  const local: EvidenceAsset = {
    id: localId(),
    ...sourceContext,
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
      )} seconds. Confirm the bud-site role, focus, and glare before analysis.`
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
  maxExtractedVideoFrames = 6,
  maxVideoSeconds = 30,
  aiUsable = false,
  purpose,
  sourceContext = {},
  value,
  onChange
}: Props) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const [internalAssets, setInternalAssets] = useState<EvidenceAsset[]>(value || []);
  const [videoFeedback, setVideoFeedback] = useState("");
  const assets = value || internalAssets;
  const photoCount = assets.filter((asset) => asset.assetType === "photo").length;
  const videoCount = assets.filter((asset) => asset.assetType === "video").length;
  const busy = assets.some((asset) => asset.uploadStatus === "uploading");
  const captureGuidance = PHOTO_CAPTURE_GUIDANCE[purpose] || [];

  const summary = useMemo(
    () =>
      `${photoCount}/${maxPhotos} photos${allowVideo ? ` · ${videoCount}/1 video` : ""}`,
    [allowVideo, maxPhotos, photoCount, videoCount]
  );

  function commit(next: EvidenceAsset[]) {
    setInternalAssets(next);
    onChange?.(next);
  }

  async function uploadSelected(
    selected: EvidenceAsset[],
    baseAssets: EvidenceAsset[] = assets
  ) {
    let current = [...baseAssets, ...selected];
    commit(current);
    for (const local of selected) {
      if (local.uploadStatus === "failed") continue;
      current = current.map((asset) =>
        asset.id === local.id ? { ...asset, uploadStatus: "uploading" } : asset
      );
      commit(current);
      try {
        const uploaded = await uploadEvidenceMedia({
          uri: local.originalUri,
          name: local.fileName,
          mimeType: local.mimeType
        });
        if (!uploaded?.url) throw new Error("Evidence upload did not return a URL.");
        const saved = await createEvidenceAsset({
          ...local,
          ...(local.source === "generated" ? { originalUri: uploaded.url } : {}),
          durableUrl: uploaded.url,
          mimeType: uploaded.mimeType || local.mimeType,
          uploadStatus: "uploaded"
        });
        const durableSaved =
          local.source === "generated"
            ? { ...saved, originalUri: saved.durableUrl || uploaded.url }
            : saved;
        current = current.map((asset) => (asset.id === local.id ? durableSaved : asset));
        commit(current);
      } catch (error: any) {
        current = current.map((asset) =>
          asset.id === local.id
            ? {
                ...asset,
                uploadStatus: "failed",
                error: error?.message || "Unable to upload evidence."
              }
            : asset
        );
        commit(current);
      } finally {
        if (
          Platform.OS === "web" &&
          local.source === "generated" &&
          local.originalUri.startsWith("blob:") &&
          typeof URL !== "undefined" &&
          typeof URL.revokeObjectURL === "function"
        ) {
          URL.revokeObjectURL(local.originalUri);
        }
      }
    }
    return current;
  }

  async function choosePhotos() {
    const remaining = Math.max(0, maxPhotos - photoCount);
    if (!remaining || busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.9
    });
    if (picked.canceled) return;
    const selected = (picked.assets || [])
      .slice(0, remaining)
      .map((asset) => toLocalAsset(asset, purpose, sourceContext, "library", aiUsable));
    await uploadSelected(selected);
  }

  async function chooseVideo() {
    if (!allowVideo || videoCount || busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      videoMaxDuration: maxVideoSeconds,
      quality: 0.8
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const local = toLocalAsset(
      picked.assets[0],
      purpose,
      sourceContext,
      "library",
      extractFramesFromVideo ? false : aiUsable
    );
    if ((local.durationSeconds || 0) > maxVideoSeconds) {
      local.uploadStatus = "failed";
      local.error = `Video must be ${readableDuration(maxVideoSeconds)} or shorter.`;
      commit([...assets, local]);
      return;
    }
    setVideoFeedback("");
    const withVideo = await uploadSelected([local]);
    if (
      !extractFramesFromVideo ||
      withVideo[withVideo.length - 1]?.uploadStatus === "failed"
    ) {
      return;
    }

    const availablePhotoSlots = Math.max(0, maxPhotos - photoCount);
    if (!availablePhotoSlots) {
      setVideoFeedback(
        "The source video was saved, but no frame slots remain. Remove a photo before extracting video frames."
      );
      return;
    }
    try {
      setVideoFeedback("Reading candidate frames from the source video...");
      const frames = await extractVideoFrameCandidates({
        uri: local.originalUri,
        durationSeconds: local.durationSeconds || 0,
        maxFrames: Math.min(maxExtractedVideoFrames, availablePhotoSlots)
      });
      const frameAssets = frames.map((frame) =>
        toVideoFrameAsset(frame, purpose, sourceContext, aiUsable)
      );
      await uploadSelected(frameAssets, withVideo);
      setVideoFeedback(
        `${frameAssets.length} still frame${
          frameAssets.length === 1 ? "" : "s"
        } extracted. Review them like ordinary photos; frames hidden by glare or blur will be excluded by the AI review.`
      );
    } catch (error: any) {
      setVideoFeedback(
        `The source video was saved, but its still frames could not be extracted. ${
          error?.message || "Add sharp photos from the video instead."
        }`
      );
    }
  }

  return (
    <View style={styles.container} accessibilityLabel="Media evidence picker">
      <View style={styles.header}>
        <Text style={styles.title}>Photos and video evidence</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <Text style={styles.help}>
        {aiUsable
          ? "Adding media approves AI use for this workflow only. It is not used for model training. Failed uploads are never sent to AI analysis."
          : "Upload clear, durable evidence. Failed uploads are never sent to AI analysis."}
      </Text>
      {allowVideo && extractFramesFromVideo ? (
        <Text style={styles.help}>
          A video is kept as private evidence. GrowPath samples up to{" "}
          {Math.min(maxExtractedVideoFrames, maxPhotos)} timestamped still frames across
          the video for image review. It keeps only sharp, glare-free gland-head evidence;
          the AI does not guess from motion or rebuild detail hidden by blur or glare.
        </Text>
      ) : null}
      {captureGuidance.length ? (
        <View style={styles.guidance} accessibilityLabel={`${purpose} photo checklist`}>
          <Text style={styles.guidanceTitle}>Photos that make the review stronger</Text>
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
          disabled={busy || photoCount >= maxPhotos}
          onPress={choosePhotos}
          style={[styles.button, (busy || photoCount >= maxPhotos) && styles.disabled]}
        >
          <Text style={styles.buttonText}>Add Photos</Text>
        </Pressable>
        {allowVideo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add evidence video"
            disabled={busy || videoCount >= 1}
            onPress={chooseVideo}
            style={[styles.button, (busy || videoCount >= 1) && styles.disabled]}
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
                source={{ uri: resolveImageUri(asset.originalUri || asset.durableUrl) }}
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
            <Text style={styles.status}>{asset.uploadStatus}</Text>
            {(asset.qualityWarnings || []).map((warning) => (
              <Text key={warning} style={styles.warning}>
                Photo check: {warning}
              </Text>
            ))}
            {asset.error ? <Text style={styles.error}>{asset.error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove evidence ${asset.id}`}
              onPress={() => commit(assets.filter((item) => item.id !== asset.id))}
              style={styles.remove}
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
      backgroundColor: palette.accent,
      borderRadius: radius.card,
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
    remove: { alignItems: "center", paddingVertical: 7 },
    removeText: { color: palette.danger, fontWeight: "700" }
  });
