import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { GrowPathVideo } from "@/api/videos";
import { formatBytes, formatDuration } from "@/features/videos/videoPresentation";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
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

export const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
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
    placeholderText: { color: palette.heroText, fontSize: 22, fontWeight: "800" },
    copy: { gap: 7, padding: 13 },
    titleRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between"
    },
    title: { color: palette.text, flex: 1, fontSize: 17, fontWeight: "800" },
    status: {
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      color: palette.info,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 4
    },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    description: { color: palette.text, lineHeight: 19 },
    storage: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.link, fontWeight: "800" },
    dangerButton: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    dangerText: { color: palette.danger, fontWeight: "800" }
  });
