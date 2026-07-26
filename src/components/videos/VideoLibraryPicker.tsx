import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GrowPathVideo, listVideoLibrary, VideoWorkspaceType } from "@/api/videos";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

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
  const entitlements = useEntitlements();
  const workspaceType = entitlements.mode as VideoWorkspaceType;
  const [videos, setVideos] = useState<GrowPathVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listVideoLibrary(workspaceType, entitlements.facilityId || undefined)
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
      {loading ? <Text style={styles.help}>Loading your videos…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !videos.length ? (
        <Text style={styles.help}>
          Your current workspace has no reusable videos yet. Open Videos to add one.
        </Text>
      ) : null}
      {videos.length ? (
        <View style={styles.options}>
          {videos.map((video) => {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
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
  title: { color: "#0F172A", fontWeight: "800" },
  help: { color: "#64748B", fontSize: 12, lineHeight: 18, marginTop: 3 },
  error: { color: "#B91C1C", fontSize: 12 },
  clearButton: {
    borderColor: "#DC2626",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  clearText: { color: "#B91C1C", fontWeight: "800" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 180,
    padding: 10
  },
  selected: { backgroundColor: "#166534", borderColor: "#166534" },
  optionTitle: { color: "#0F172A", fontWeight: "800" },
  optionMeta: { color: "#64748B", fontSize: 11, marginTop: 3 },
  selectedText: { color: "#FFFFFF" }
});
