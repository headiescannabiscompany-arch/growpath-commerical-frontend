import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

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
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function readableDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    : "Date not recorded";
}

export default function GrowTimelineFlow({
  events,
  emptyText = "No milestones are available for this visual timeline."
}: {
  events: GrowTimelineFlowEvent[];
  emptyText?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const chronological = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      ),
    [events]
  );

  if (!chronological.length) return <Text style={styles.empty}>{emptyText}</Text>;

  return (
    <View accessibilityLabel="Visual grow timeline flowchart" style={styles.frame}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>VISUAL GROW STORY</Text>
          <Text style={styles.heading}>From first record to latest milestone</Text>
        </View>
        <Text style={styles.count}>{chronological.length} steps</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.flow}
        accessibilityLabel="Chronological grow milestones"
      >
        {chronological.map((event, index) => {
          const photo = event.photos?.find(Boolean);
          const highlights = (event.highlights || []).filter(Boolean).slice(0, 4);
          return (
            <React.Fragment key={event.id}>
              <View style={styles.stepWrap}>
                <View style={styles.nodeRow}>
                  <View style={styles.node}>
                    <Text style={styles.nodeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.date}>{readableDate(event.timestamp)}</Text>
                </View>
                <View style={styles.card}>
                  {photo ? (
                    <Image
                      source={{ uri: resolveImageUri(photo) }}
                      style={styles.photo}
                      resizeMode="cover"
                      accessibilityLabel={`Timeline photo for ${event.title}`}
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.placeholderMark}>◎</Text>
                      <Text style={styles.placeholderText}>Saved milestone</Text>
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.type}>{readableType(event.type)}</Text>
                    <Text style={styles.title}>{event.title}</Text>
                    {event.summary ? (
                      <Text numberOfLines={4} style={styles.summary}>
                        {event.summary}
                      </Text>
                    ) : null}
                    {highlights.length ? (
                      <View style={styles.highlights}>
                        {highlights.map((highlight) => (
                          <View key={highlight} style={styles.highlight}>
                            <Text numberOfLines={2} style={styles.highlightText}>
                              {highlight}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {event.photos && event.photos.length > 1 ? (
                      <Text style={styles.morePhotos}>
                        +{event.photos.length - 1} more photo
                        {event.photos.length === 2 ? "" : "s"}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
              {index < chronological.length - 1 ? (
                <View accessibilityElementsHidden style={styles.connector}>
                  <View style={styles.connectorLine} />
                  <Text style={styles.arrow}>›</Text>
                </View>
              ) : null}
            </React.Fragment>
          );
        })}
      </ScrollView>
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
      justifyContent: "space-between",
      paddingHorizontal: 16
    },
    kicker: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 1.2
    },
    heading: { color: palette.text, fontSize: 18, fontWeight: "900", marginTop: 3 },
    count: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    flow: { alignItems: "flex-start", padding: 16, paddingBottom: 8 },
    stepWrap: { width: 286 },
    nodeRow: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 8 },
    node: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: 18,
      height: 34,
      justifyContent: "center",
      width: 34
    },
    nodeText: { color: palette.accentText, fontWeight: "900" },
    date: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 350,
      overflow: "hidden"
    },
    photo: { backgroundColor: palette.page, height: 150, width: "100%" },
    photoPlaceholder: {
      alignItems: "center",
      backgroundColor: palette.accentSoft,
      height: 150,
      justifyContent: "center"
    },
    placeholderMark: { color: palette.accent, fontSize: 42, fontWeight: "900" },
    placeholderText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 4
    },
    cardBody: { padding: 14 },
    type: { color: palette.accent, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
    title: { color: palette.text, fontSize: 17, fontWeight: "900", marginTop: 5 },
    summary: { color: palette.textSoft, lineHeight: 19, marginTop: 8 },
    highlights: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
    highlight: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      paddingHorizontal: 8,
      paddingVertical: 6
    },
    highlightText: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "800",
      maxWidth: 220
    },
    morePhotos: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 9
    },
    connector: {
      alignItems: "center",
      flexDirection: "row",
      marginHorizontal: 8,
      marginTop: 198
    },
    connectorLine: { backgroundColor: palette.accent, height: 3, width: 28 },
    arrow: { color: palette.accent, fontSize: 28, fontWeight: "900", marginLeft: -2 },
    empty: { color: palette.textMuted, marginTop: 16 }
  });
