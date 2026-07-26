import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { GrowPathVideo } from "@/api/videos";
import { formatBytes, formatDuration } from "@/features/videos/videoPresentation";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

type Props = {
  video: GrowPathVideo;
  compact?: boolean;
  ownerControls?: boolean;
  busy?: boolean;
  onEdit?: (video: GrowPathVideo) => void;
  onTogglePublished?: (video: GrowPathVideo) => void;
  onDelete?: (video: GrowPathVideo) => void;
};

function readable(value: string) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function VideoCard({
  video,
  compact = false,
  ownerControls = false,
  busy = false,
  onEdit,
  onTogglePublished,
  onDelete
}: Props) {
  const router = useRouter();
  const thumbnail = resolveImageUri(
    video.thumbnailUrl || video.mediaSource?.thumbnailUrl || ""
  );
  const duration = formatDuration(video.durationSeconds);
  const meta = [
    video.owner?.displayName,
    duration,
    readable(video.visibility),
    video.cannabisSpecific ? "Cannabis/hemp context" : ""
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.card, compact && styles.compact]}>
      {thumbnail ? (
        <Image
          accessibilityLabel={`${video.title} thumbnail`}
          resizeMode="cover"
          source={{ uri: thumbnail }}
          style={styles.thumbnail}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Video</Text>
        </View>
      )}
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          {ownerControls ? (
            <Text style={styles.status}>{readable(video.status)}</Text>
          ) : null}
        </View>
        {meta ? (
          <Text style={styles.meta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
        {video.description ? (
          <Text style={styles.description} numberOfLines={compact ? 2 : 3}>
            {video.description}
          </Text>
        ) : null}
        {ownerControls && Number(video.storageBytes || 0) > 0 ? (
          <Text style={styles.storage}>
            GrowPath storage: {formatBytes(video.storageBytes)}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel={`Open video ${video.title}`}
            accessibilityRole="button"
            onPress={() => router.push(`/videos/${encodeURIComponent(video.id)}` as any)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Watch</Text>
          </Pressable>
          {ownerControls && onEdit ? (
            <Pressable
              accessibilityLabel={`Edit video ${video.title}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onEdit(video)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Edit</Text>
            </Pressable>
          ) : null}
          {ownerControls && onTogglePublished ? (
            <Pressable
              accessibilityLabel={`${video.status === "published" ? "Unpublish" : "Publish"} video ${video.title}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onTogglePublished(video)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>
                {video.status === "published" ? "Unpublish" : "Publish"}
              </Text>
            </Pressable>
          ) : null}
          {ownerControls && onDelete ? (
            <Pressable
              accessibilityLabel={`Remove video ${video.title}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onDelete(video)}
              style={styles.dangerButton}
            >
              <Text style={styles.dangerText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: "hidden"
  },
  compact: { width: 285 },
  thumbnail: { backgroundColor: "#0F172A", height: 160, width: "100%" },
  placeholder: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    height: 160,
    justifyContent: "center"
  },
  placeholderText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  copy: { gap: 7, padding: 13 },
  titleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  title: { color: "#0F172A", flex: 1, fontSize: 17, fontWeight: "800" },
  status: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#075985",
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  meta: { color: "#64748B", fontSize: 12, lineHeight: 17 },
  description: { color: "#334155", lineHeight: 19 },
  storage: { color: "#475569", fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    borderColor: "#94A3B8",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryText: { color: "#334155", fontWeight: "800" },
  dangerButton: {
    borderColor: "#DC2626",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  dangerText: { color: "#B91C1C", fontWeight: "800" }
});
