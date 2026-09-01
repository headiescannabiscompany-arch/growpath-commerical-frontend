import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  getPublicGrowTimelineCopy,
  type GrowTimelinePublicCopy
} from "@/api/growTimelineCopies";
import ReportModal from "@/components/ReportModal";
import GrowTimelineFlow from "@/components/grows/GrowTimelineFlow";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  buildPublicShareTargets,
  currentPublicUrl,
  sharePublicLink
} from "@/utils/publicLinks";

export default function PublicGrowTimelineRoute() {
  const { token: rawToken } = useLocalSearchParams<{ token?: string | string[] }>();
  const token = useMemo(() => coerceParam(rawToken), [rawToken]);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [copy, setCopy] = useState<GrowTimelinePublicCopy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportVisible, setReportVisible] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setError("This grow timeline is unavailable.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setCopy(await getPublicGrowTimelineCopy(token));
      setError("");
    } catch {
      setCopy(null);
      setError(
        "This grow timeline is unavailable, withdrawn, or restricted by your content settings."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const path = token ? `/grow-timeline/${token}` : "";
  const shareDetails = copy
    ? { description: copy.description, socialPreviewUrl: copy.socialPreviewUrl }
    : {};
  const targets = copy ? buildPublicShareTargets(copy.title, path, shareDetails) : [];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>GrowPathAI</Text>
        <Text style={styles.brandTag}>Shared Grow Timeline</Text>
      </View>
      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {error ? (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <Link href="/login" asChild>
            <Pressable style={styles.primaryButton} accessibilityRole="link">
              <Text style={styles.primaryText}>Sign In / Check Content Settings</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {copy ? (
        <>
          <Text accessibilityRole="header" style={styles.title}>
            {copy.title}
          </Text>
          {copy.description ? (
            <Text style={styles.description}>{copy.description}</Text>
          ) : null}
          <Text style={styles.meta}>
            {fmtDate(copy.dateRange?.start)} – {fmtDate(copy.dateRange?.end)} · Frozen
            version {copy.version}
          </Text>
          {copy.cannabisSpecific ? (
            <Text style={styles.restricted}>Age-restricted cannabis/hemp content</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share or copy grow timeline link"
              style={styles.primaryButton}
              onPress={() => void sharePublicLink(copy.title, path, shareDetails)}
            >
              <Text style={styles.primaryText}>Share / Copy Link</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Report shared grow timeline"
              style={styles.secondaryButton}
              onPress={() => setReportVisible(true)}
            >
              <Text style={styles.secondaryText}>Report</Text>
            </Pressable>
          </View>
          <View style={styles.shareTargets}>
            {targets.map((target) => (
              <Link key={target.key} href={target.href as any} asChild>
                <Pressable accessibilityRole="link" style={styles.shareTarget}>
                  <Text style={styles.secondaryText}>{target.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>

          {copy.presentation === "list" ? (
            <View style={styles.timeline}>
              {copy.events.map((event) => (
                <View key={event.id} style={styles.event}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventMeta}>{fmtDate(event.timestamp)}</Text>
                  {event.summary ? (
                    <Text style={styles.eventSummary}>{event.summary}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <GrowTimelineFlow
              events={copy.events.map((event, index) => ({
                id: event.id || `${event.timestamp}-${index}`,
                title: event.title,
                summary: event.summary,
                timestamp: event.timestamp,
                type: event.type,
                highlights: event.tags,
                photos: copy.photos
                  .filter((photo) =>
                    photo.eventRef ? photo.eventRef === event.id : index === 0
                  )
                  .map((photo) => photo.url)
              }))}
            />
          )}
          {feedback ? <Text style={styles.success}>{feedback}</Text> : null}
          <Text style={styles.disclaimer}>
            This is a user-reviewed snapshot, not a compliance record or professional crop
            guarantee. The private grow and its later changes are not exposed.
          </Text>
          <ReportModal
            visible={reportVisible}
            onClose={() => setReportVisible(false)}
            contentType="growTimelinePublicCopy"
            contentId={copy.id}
            contentTitle={copy.title}
            targetUrl={currentPublicUrl(path)}
            onSuccess={() => setFeedback("Report sent for GrowPathAI review.")}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.page },
    content: {
      alignSelf: "center",
      maxWidth: 960,
      padding: 20,
      paddingBottom: 56,
      width: "100%"
    },
    brandRow: {
      alignItems: "baseline",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 20
    },
    brand: { color: palette.accent, fontSize: 22, fontWeight: "900" },
    brandTag: { color: palette.textMuted, fontWeight: "700" },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    description: { color: palette.textSoft, fontSize: 16, lineHeight: 23, marginTop: 10 },
    meta: { color: palette.textMuted, marginTop: 10 },
    restricted: {
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.accent,
      fontWeight: "800",
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
    shareTargets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryText: { color: palette.link, fontWeight: "800" },
    shareTarget: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    timeline: { marginTop: 18 },
    event: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderLeftColor: palette.accent,
      borderLeftWidth: 4,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 12,
      padding: 14
    },
    eventTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    eventMeta: { color: palette.textMuted, fontSize: 12, marginTop: 4 },
    eventSummary: { color: palette.textSoft, lineHeight: 20, marginTop: 8 },
    disclaimer: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 24 },
    card: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 16
    },
    error: { color: palette.danger, fontWeight: "700" },
    success: { color: palette.success, fontWeight: "700", marginTop: 12 }
  });
