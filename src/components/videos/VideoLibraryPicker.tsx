import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { GrowPathVideo, listVideoLibrary, VideoWorkspaceType } from "@/api/videos";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type VideoLibraryScope = "workspace" | "mine" | "published" | "drafts";

const SCOPE_OPTIONS: Array<{ value: VideoLibraryScope; label: string }> = [
  { value: "workspace", label: "Workspace library" },
  { value: "mine", label: "My uploads" },
  { value: "published", label: "Published" },
  { value: "drafts", label: "Drafts" }
];

type Props = {
  selectedId?: string;
  disabled?: boolean;
  onSelect: (video: GrowPathVideo | null) => void;
};

export default function VideoLibraryPicker({
  selectedId = "",
  disabled = false,
  onSelect
}: Props) {
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const workspaceType = entitlements.mode as VideoWorkspaceType;
  const [videos, setVideos] = useState<GrowPathVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<VideoLibraryScope>("workspace");
  const currentUserId = useMemo(
    () => String(auth.user?.id || auth.user?._id || ""),
    [auth.user]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listVideoLibrary(
      workspaceType,
      workspaceType === "facility" ? entitlements.facilityId || undefined : undefined
    )
      .then((result) => {
        if (!active) return;
        setVideos(result.videos.filter((video) => video.status !== "archived"));
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Unable to load the video library.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [entitlements.facilityId, workspaceType]);

  const filteredVideos = useMemo(() => {
    switch (scope) {
      case "mine":
        return videos.filter(
          (video) =>
            String(video.uploaderUserId || video.owner?.id || "") === currentUserId
        );
      case "published":
        return videos.filter((video) => video.status === "published");
      case "drafts":
        return videos.filter((video) => video.status === "draft");
      default:
        return videos;
    }
  }, [currentUserId, scope, videos]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>Reuse a Video Library item</Text>
          <Text style={styles.help}>
            Attach one stored video without uploading another copy. Detaching it later
            does not delete the library item.
          </Text>
        </View>
        {selectedId ? (
          <Pressable
            accessibilityLabel="Detach selected library video"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => onSelect(null)}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>Detach</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.scopeRow}>
        {SCOPE_OPTIONS.map((option) => {
          const selected = scope === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`Show ${option.label.toLowerCase()} videos`}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => setScope(option.value)}
              style={[styles.scopeButton, selected && styles.scopeButtonSelected]}
            >
              <Text style={[styles.scopeText, selected && styles.scopeTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.help}>
        Showing {filteredVideos.length} reusable video
        {filteredVideos.length === 1 ? "" : "s"} in this scope.
      </Text>

      {loading ? <Text style={styles.help}>Loading your videos...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !filteredVideos.length ? (
        <Text style={styles.help}>
          Your current workspace has no reusable videos yet. Open Videos to add one.
        </Text>
      ) : null}
      {filteredVideos.length ? (
        <View style={styles.options}>
          {filteredVideos.map((video) => {
            const selected = video.id === selectedId;
            return (
              <Pressable
                key={video.id}
                accessibilityLabel={`Use library video ${video.title}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() => onSelect(video)}
                style={[styles.option, selected && styles.selected]}
              >
                <Text style={[styles.optionTitle, selected && styles.selectedText]}>
                  {video.title}
                </Text>
                <Text style={[styles.optionMeta, selected && styles.selectedText]}>
                  {video.status} · {video.visibility}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    copy: { flex: 1 },
    title: { color: palette.text, fontWeight: "800" },
    help: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
    error: { color: palette.danger, fontSize: 12 },
    clearButton: {
      alignItems: "center",
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    clearText: { color: palette.danger, fontWeight: "800" },
    scopeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    scopeButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    scopeButtonSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    scopeText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    scopeTextSelected: { color: palette.link },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      minWidth: 180,
      padding: 10
    },
    selected: { backgroundColor: palette.accent, borderColor: palette.accent },
    optionTitle: { color: palette.text, fontWeight: "800" },
    optionMeta: { color: palette.textMuted, fontSize: 11, marginTop: 3 },
    selectedText: { color: palette.accentText }
  });
}
