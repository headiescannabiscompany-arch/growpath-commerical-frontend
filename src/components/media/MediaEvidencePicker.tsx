import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { createEvidenceAsset } from "@/api/evidence";
import { uploadEvidenceMedia } from "@/api/uploads";
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
  maxVideoSeconds?: number;
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

function toLocalAsset(
  asset: ImagePicker.ImagePickerAsset,
  purpose: EvidencePurpose,
  sourceContext: EvidenceLinks,
  source: EvidenceSource
): EvidenceAsset {
  const assetType = asset.type === "video" ? "video" : "photo";
  return {
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
    qualityWarnings: []
  };
}

export default function MediaEvidencePicker({
  maxPhotos = 10,
  allowVideo = false,
  maxVideoSeconds = 30,
  purpose,
  sourceContext = {},
  value,
  onChange
}: Props) {
  const [internalAssets, setInternalAssets] = useState<EvidenceAsset[]>(value || []);
  const assets = value || internalAssets;
  const photoCount = assets.filter((asset) => asset.assetType === "photo").length;
  const videoCount = assets.filter((asset) => asset.assetType === "video").length;
  const busy = assets.some((asset) => asset.uploadStatus === "uploading");

  const summary = useMemo(
    () =>
      `${photoCount}/${maxPhotos} photos${allowVideo ? ` · ${videoCount}/1 video` : ""}`,
    [allowVideo, maxPhotos, photoCount, videoCount]
  );

  function commit(next: EvidenceAsset[]) {
    setInternalAssets(next);
    onChange?.(next);
  }

  async function uploadSelected(selected: EvidenceAsset[]) {
    let current = [...assets, ...selected];
    commit(current);
    for (const local of selected) {
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
          durableUrl: uploaded.url,
          mimeType: uploaded.mimeType || local.mimeType,
          uploadStatus: "uploaded"
        });
        current = current.map((asset) => (asset.id === local.id ? saved : asset));
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
      }
    }
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
      .map((asset) => toLocalAsset(asset, purpose, sourceContext, "library"));
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
    const local = toLocalAsset(picked.assets[0], purpose, sourceContext, "library");
    if ((local.durationSeconds || 0) > maxVideoSeconds) {
      local.uploadStatus = "failed";
      local.error = `Video must be ${maxVideoSeconds} seconds or shorter.`;
      commit([...assets, local]);
      return;
    }
    await uploadSelected([local]);
  }

  return (
    <View style={styles.container} accessibilityLabel="Media evidence picker">
      <View style={styles.header}>
        <Text style={styles.title}>Photos and video evidence</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <Text style={styles.help}>
        Upload clear, durable evidence. Failed uploads are never sent to AI analysis.
      </Text>
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

const styles = StyleSheet.create({
  container: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  summary: { color: "#475569", fontWeight: "700" },
  help: { color: "#64748B", lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  asset: { minWidth: 130, width: 150 },
  preview: { backgroundColor: "#E2E8F0", borderRadius: radius.card, height: 110 },
  videoPreview: { alignItems: "center", justifyContent: "center" },
  videoText: { color: "#0F172A", fontWeight: "800" },
  videoMeta: { color: "#475569", marginTop: 4 },
  status: { color: "#475569", fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  error: { color: "#B91C1C", fontSize: 12, marginTop: 3 },
  remove: { alignItems: "center", paddingVertical: 7 },
  removeText: { color: "#991B1B", fontWeight: "700" }
});
