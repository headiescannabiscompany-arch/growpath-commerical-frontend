import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";
import { parseDisplayDate } from "@/features/grows/routeUtils";

const POINT_WIDTH = 132;
const POINT_MARGIN = 3;
const FLOW_PADDING = 12;

export type GrowTimelineFlowEvent = {
  id: string;
  title: string;
  summary?: string;
  timestamp: string;
  type?: string;
  photos?: string[];
  highlights?: string[];
};

function readableType(value?: string) {
  return String(value || "milestone")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function readableDate(value: string) {
  const date = parseDisplayDate(value);
  return date
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "Date not recorded";
}

export default function GrowTimelineFlow({
  events,
  initialEventId,
  renderEntryActions,
  emptyText = "No milestones are available for this visual timeline."
}: {
  events: GrowTimelineFlowEvent[];
  initialEventId?: string;
  renderEntryActions?: (eventId: string) => React.ReactNode;
  emptyText?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const chronological = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          (parseDisplayDate(a.timestamp)?.getTime() || 0) -
          (parseDisplayDate(b.timestamp)?.getTime() || 0)
      ),
    [events]
  );
  // An explicit choice stays anchored on refresh. An unpinned viewer follows new entries.
  const [selectedId, setSelectedId] = useState(initialEventId);
  const lastIndex = chronological.length - 1;
  const requestedIndex = chronological.findIndex((event) => event.id === selectedId);
  const selectedIndex = requestedIndex < 0 ? lastIndex : requestedIndex;
  const selected = chronological[selectedIndex];

  const rail = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const revealPoint = useCallback(
    (index: number) => {
      if (index < 0 || viewportWidth <= 0 || contentWidth <= viewportWidth) return;
      const pointCenter = FLOW_PADDING + (index + 0.5) * (POINT_WIDTH + 2 * POINT_MARGIN);
      const x = Math.max(
        0,
        Math.min(contentWidth - viewportWidth, pointCenter - viewportWidth / 2)
      );
      rail.current?.scrollTo({ x, y: 0, animated: false });
    },
    [contentWidth, viewportWidth]
  );
  useEffect(() => {
    revealPoint(selectedIndex);
  }, [revealPoint, selectedIndex, selected?.id]);

  if (!selected) return <Text style={styles.empty}>{emptyText}</Text>;

  const highlights = (selected.highlights || []).filter(Boolean).slice(0, 8);

  return (
    <View accessibilityLabel="Visual grow timeline flowchart" style={styles.frame}>
      <View style={styles.headerRow}>
        <View testID="grow-timeline-heading-copy" style={styles.headerCopy}>
          <Text style={styles.kicker}>VISUAL GROW STORY</Text>
          <Text style={styles.heading}>Select a point to open the full entry</Text>
        </View>
        <View style={styles.endControls}>
          <Text style={styles.count}>{chronological.length} points</Text>
          {lastIndex > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show latest timeline entry"
              style={styles.latestButton}
              onPress={() => {
                setSelectedId(undefined);
                revealPoint(lastIndex);
              }}
            >
              <Text style={styles.latestText}>Latest</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView
        ref={rail}
        horizontal
        onLayout={({ nativeEvent }) => setViewportWidth(nativeEvent.layout.width)}
        onContentSizeChange={(width) => setContentWidth(width)}
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.flow}
        accessibilityLabel="Chronological grow milestones"
      >
        <View style={styles.line} />
        {chronological.map((event, index) => {
          const photo = event.photos?.find(Boolean);
          const active = event.id === selected.id;
          return (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={`Open timeline entry ${index + 1}: ${event.title}`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedId(index === lastIndex ? undefined : event.id)}
              style={styles.pointWrap}
            >
              <Text numberOfLines={1} style={styles.date}>
                {readableDate(event.timestamp)}
              </Text>
              <View style={[styles.node, active && styles.nodeActive]}>
                <Text style={[styles.nodeText, active && styles.nodeTextActive]}>
                  {index + 1}
                </Text>
              </View>
              {photo ? (
                <Image
                  source={{ uri: resolveImageUri(photo) }}
                  style={[styles.thumbnail, active && styles.thumbnailActive]}
                  resizeMode="cover"
                  accessibilityLabel={`Timeline photo for ${event.title}`}
                />
              ) : (
                <View style={[styles.marker, active && styles.thumbnailActive]}>
                  <Text style={styles.markerText}>
                    {readableType(event.type).slice(0, 2)}
                  </Text>
                </View>
              )}
              <Text
                numberOfLines={2}
                style={[styles.pointTitle, active && styles.activeText]}
              >
                {event.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View
        accessibilityLabel={`Selected timeline entry: ${selected.title}`}
        style={styles.detail}
      >
        <View style={styles.detailHeadingRow}>
          <View style={styles.detailHeadingCopy}>
            <Text style={styles.type}>{readableType(selected.type)}</Text>
            <Text style={styles.detailTitle}>{selected.title}</Text>
            <Text style={styles.detailDate}>{readableDate(selected.timestamp)}</Text>
          </View>
          <Text style={styles.openHint}>POINT {selectedIndex + 1}</Text>
        </View>
        {selected.summary ? <Text style={styles.summary}>{selected.summary}</Text> : null}
        {selected.photos?.length ? (
          <ScrollView horizontal contentContainerStyle={styles.photoStrip}>
            {selected.photos.map((photo, index) => (
              <Image
                key={`${photo}-${index}`}
                source={{ uri: resolveImageUri(photo) }}
                style={styles.detailPhoto}
                resizeMode="cover"
                accessibilityLabel={`Photo ${index + 1} for ${selected.title}`}
              />
            ))}
          </ScrollView>
        ) : null}
        {highlights.length ? (
          <View style={styles.highlights}>
            {highlights.map((highlight) => (
              <View key={highlight} style={styles.highlight}>
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {renderEntryActions?.(selected.id)}
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    frame: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 16,
      overflow: "hidden",
      paddingVertical: 16
    },
    headerRow: {
      alignItems: "flex-end",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingHorizontal: 16
    },
    headerCopy: { flex: 1, minWidth: 0 },
    kicker: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2
    },
    heading: { color: palette.text, fontSize: 18, fontWeight: "900", marginTop: 3 },
    count: { color: palette.textMuted, fontSize: 12, fontWeight: "800", flexShrink: 0 },
    endControls: { alignItems: "flex-end", flexShrink: 0 },
    latestButton: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center"
    },
    latestText: { color: palette.accent, fontWeight: "800" },
    flow: {
      minWidth: "100%",
      paddingHorizontal: FLOW_PADDING,
      paddingVertical: 20,
      position: "relative"
    },
    line: {
      backgroundColor: palette.accent,
      height: 3,
      left: 12,
      position: "absolute",
      right: 12,
      top: 59
    },
    pointWrap: {
      alignItems: "center",
      marginHorizontal: POINT_MARGIN,
      width: POINT_WIDTH
    },
    date: { color: palette.textMuted, fontSize: 10, fontWeight: "800", marginBottom: 8 },
    node: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 16,
      borderWidth: 3,
      height: 32,
      justifyContent: "center",
      width: 32,
      zIndex: 2
    },
    nodeActive: { backgroundColor: palette.accent, transform: [{ scale: 1.12 }] },
    nodeText: { color: palette.accent, fontSize: 10, fontWeight: "900" },
    nodeTextActive: { color: palette.accentText },
    thumbnail: { borderRadius: 10, height: 72, marginTop: 10, width: 104 },
    marker: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      borderRadius: 10,
      height: 72,
      justifyContent: "center",
      marginTop: 10,
      width: 104
    },
    markerText: { color: palette.accent, fontSize: 22, fontWeight: "900" },
    thumbnailActive: { borderColor: palette.accent, borderWidth: 3 },
    pointTitle: {
      color: palette.textSoft,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 7,
      textAlign: "center"
    },
    activeText: { color: palette.accent },
    detail: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginHorizontal: 16,
      marginTop: 8,
      padding: 16
    },
    detailHeadingRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
    detailHeadingCopy: { flex: 1 },
    type: { color: palette.accent, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
    detailTitle: { color: palette.text, fontSize: 20, fontWeight: "900", marginTop: 4 },
    detailDate: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4
    },
    openHint: { color: palette.accent, fontSize: 11, fontWeight: "900" },
    summary: { color: palette.textSoft, lineHeight: 21, marginTop: 12 },
    photoStrip: { gap: 10, paddingTop: 14 },
    detailPhoto: { borderRadius: radius.card, height: 220, width: 300 },
    highlights: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
    highlight: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      paddingHorizontal: 9,
      paddingVertical: 7
    },
    highlightText: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "800",
      maxWidth: 360
    },
    empty: { color: palette.textMuted, marginTop: 16 }
  });
