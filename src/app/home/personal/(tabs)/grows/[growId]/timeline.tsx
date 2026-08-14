import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  getPersonalGrowTimeline,
  listPersonalGrows,
  type PersonalGrow,
  type PersonalGrowTimelineEvent
} from "@/api/grows";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";
import { savedRunSourceHref } from "@/features/personal/tools/savedRunRoutes";
import {
  groupTimelineEvents,
  timelineEventPhotos,
  type GrowTimelineZoom
} from "@/features/grows/timeline";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "log", label: "Journal" },
  { key: "task", label: "Tasks" },
  { key: "tool", label: "Tools" },
  { key: "diagnosis", label: "AI" },
  { key: "automation", label: "Automation" }
] as const;

const ZOOM_LEVELS: { key: GrowTimelineZoom; label: string; helper: string }[] = [
  { key: "lifecycle", label: "Lifecycle", helper: "Milestones across the complete grow" },
  { key: "month", label: "Month", helper: "Monthly progress and important notes" },
  { key: "week", label: "Week", helper: "Weekly work, evidence, and changes" },
  { key: "day", label: "Day", helper: "Full saved detail for each day" }
];

export const createGrowTimelineStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 32 },
    title: { fontSize: 24, fontWeight: "800", color: palette.text },
    subtitle: { marginTop: 6, color: palette.textMuted },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
      marginBottom: 4
    },
    filter: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingVertical: 7,
      paddingHorizontal: 10,
      backgroundColor: palette.surface
    },
    filterActive: { borderColor: palette.accent, backgroundColor: palette.accent },
    filterText: { fontWeight: "800", color: palette.text, fontSize: 12 },
    filterTextActive: { color: palette.accentText },
    zoomPanel: {
      marginTop: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    zoomTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    zoomHelp: { marginTop: 4, color: palette.textMuted, lineHeight: 18 },
    period: { marginTop: 18 },
    periodTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    periodMeta: { color: palette.textMuted, marginTop: 3 },
    event: {
      marginTop: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    eventTitle: { fontSize: 15, fontWeight: "800", color: palette.text },
    eventMeta: { marginTop: 4, color: palette.textMuted, fontSize: 12 },
    eventSummary: { marginTop: 8, color: palette.textSoft, lineHeight: 19 },
    photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    photo: {
      width: 150,
      height: 110,
      borderRadius: radius.card,
      backgroundColor: palette.surface
    },
    detailRow: {
      marginTop: 6,
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17
    },
    sourceAction: {
      marginTop: 10,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    sourceActionText: { color: palette.link, fontSize: 12, fontWeight: "800" },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
    tag: {
      borderRadius: radius.card,
      backgroundColor: palette.accentSoft,
      paddingVertical: 4,
      paddingHorizontal: 7
    },
    tagText: { color: palette.accent, fontSize: 11, fontWeight: "700" },
    empty: {
      marginTop: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      color: palette.textMuted,
      backgroundColor: palette.surfaceMuted
    },
    error: { marginTop: 12, color: palette.danger }
  });

function eventGroup(event: PersonalGrowTimelineEvent) {
  const type = String(event.type || "").toLowerCase();
  const model = String(event.sourceModel || "").toLowerCase();
  if (type.includes("photo") || type.includes("log") || model.includes("growlog")) {
    return "log";
  }
  if (type.includes("task") || model.includes("task")) return "task";
  if (type.includes("tool") || model.includes("toolrun")) return "tool";
  if (type.includes("diagnosis") || model.includes("diagnosis")) return "diagnosis";
  if (type.includes("automation") || model.includes("automation")) return "automation";
  return "other";
}

function periodLabel(key: string, zoom: GrowTimelineZoom) {
  if (key === "unknown") return "Date not recorded";
  if (zoom === "lifecycle") return key;
  const date = new Date(`${key}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return key;
  if (zoom === "month")
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (zoom === "week") return `Week of ${date.toLocaleDateString()}`;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function eventMatchesFilter(event: PersonalGrowTimelineEvent, filter: string) {
  if (filter === "all") return true;
  return eventGroup(event) === filter;
}

function eventKind(event: PersonalGrowTimelineEvent) {
  return String(event.type || "event").replace(/_/g, " ");
}

function labelValue(label: string, value?: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value) && !value.length) return null;
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return `${label}: ${text.replace(/_/g, " ")}`;
}

function eventPayloadDetails(event: PersonalGrowTimelineEvent) {
  const payload = event.payload || {};
  if (event.type === "diagnosis_feedback") {
    return [
      labelValue("Verdict", payload.verdict),
      labelValue("Symptoms", payload.symptomChange),
      labelValue("Confirmed issue", payload.confirmedIssue),
      labelValue("Actions", payload.actionsTaken),
      labelValue(
        "Provider",
        [payload.providerName, payload.providerModel].filter(Boolean)
      )
    ].filter(Boolean) as string[];
  }
  if (event.type === "diagnosis_created") {
    return [
      labelValue("Overall health", payload.overallHealth),
      labelValue(
        "Feedback",
        payload.feedbackCount ? `${payload.feedbackCount} response(s)` : ""
      )
    ].filter(Boolean) as string[];
  }
  return [];
}

function sourceHref(event: PersonalGrowTimelineEvent, growId: string) {
  const sourceId = String(event.sourceId || "");
  const model = String(event.sourceModel || "").toLowerCase();
  const type = String(event.type || "").toLowerCase();
  const sourceCandidate = event as Record<string, any>;

  if (!growId) return "";
  const hasExplicitSharedSource =
    Boolean(sourceCandidate.sourceType || sourceCandidate.itemType) ||
    Object.keys(sourceCandidate).some((key) => key.startsWith("linked"));
  if (hasExplicitSharedSource) {
    const linkedHref = sourceObjectHref({
      ...sourceCandidate,
      growId,
      workspaceType: "personal"
    });
    if (linkedHref) return linkedHref;
  }
  if (
    sourceId &&
    (model.includes("growlog") || type.includes("log") || type.includes("photo"))
  ) {
    return sourceObjectHref({
      sourceType: "grow_log",
      sourceId,
      growId,
      workspaceType: "personal"
    });
  }
  if (model.includes("toolrun") || type.includes("tool")) {
    return savedRunSourceHref({
      toolRunId: sourceId,
      growId,
      sourceContext: "timeline"
    });
  }
  if (model.includes("task") || type.includes("task")) {
    return sourceObjectHref({
      sourceType: "task",
      sourceId,
      growId,
      workspaceType: "personal"
    });
  }
  if (model.includes("automation") || type.includes("automation")) {
    return sourceObjectHref({
      sourceType: "automation",
      sourceId,
      growId,
      workspaceType: "personal"
    });
  }
  if (model.includes("plant") || type.includes("plant")) {
    return sourceObjectHref({
      sourceType: "plant",
      sourceId,
      growId,
      workspaceType: "personal"
    });
  }
  if (model.includes("diagnosis") || type.includes("diagnosis")) {
    return sourceObjectHref({
      sourceType: "ai_diagnosis",
      sourceId,
      growId,
      workspaceType: "personal"
    });
  }
  if (model.includes("grow") || type.includes("grow")) {
    return sourceObjectHref({
      sourceType: "grow",
      sourceId: growId,
      growId,
      workspaceType: "personal"
    });
  }
  return "";
}

function sourceLabel(event: PersonalGrowTimelineEvent) {
  const group = eventGroup(event);
  if (group === "log") return "Open Journal Source";
  if (group === "task") return "Open Task Source";
  if (group === "tool") return "Open Tool Source";
  if (group === "diagnosis") return "Open Diagnosis Source";
  if (group === "automation") return "Open Automation Source";
  if (
    String(event.type || "")
      .toLowerCase()
      .includes("plant")
  )
    return "Open Plant Source";
  return "Open Source";
}

export default function GrowTimelineScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGrowTimelineStyles(palette), [palette]);
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [events, setEvents] = useState<PersonalGrowTimelineEvent[]>([]);
  const [grow, setGrow] = useState<PersonalGrow | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [zoom, setZoom] = useState<GrowTimelineZoom>("lifecycle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!growId) {
      setError("Missing grow id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const timelineRows = await getPersonalGrowTimeline(growId);
      setEvents(timelineRows);
      try {
        const grows =
          typeof listPersonalGrows === "function" ? await listPersonalGrows() : [];
        setGrow(
          grows.find(
            (candidate) => String(candidate.id || (candidate as any)._id) === growId
          ) || null
        );
      } catch {
        setGrow(null);
      }
    } catch {
      setEvents([]);
      setError("Failed to load grow timeline.");
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visibleEvents = useMemo(
    () => events.filter((event) => eventMatchesFilter(event, filter)),
    [events, filter]
  );
  const groupedEvents = useMemo(
    () => groupTimelineEvents(visibleEvents, zoom),
    [visibleEvents, zoom]
  );
  const selectedPhotos = useMemo(
    () =>
      Array.from(
        new Set([
          ...(grow?.photos || []).filter(Boolean),
          ...visibleEvents.flatMap((event) => timelineEventPhotos(event as any))
        ])
      ).slice(0, 10),
    [grow, visibleEvents]
  );
  const shareHref = useMemo(() => {
    const query = new URLSearchParams({
      growId,
      title: `Grow timeline: ${grow?.name || "My grow"}`,
      body:
        visibleEvents
          .slice(0, 8)
          .map(
            (event) =>
              `${fmtDate(event.timestamp)} — ${event.title}${event.summary ? `: ${event.summary}` : ""}`
          )
          .join("\n") || "Sharing a visual grow timeline from GrowPath."
    });
    if (selectedPhotos.length) query.set("photos", selectedPhotos.join(","));
    return `/home/personal/forum/new-post?${query.toString()}`;
  }, [grow?.name, growId, selectedPhotos, visibleEvents]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Grow Timeline</Text>
      <Text style={styles.subtitle}>
        A visual history of saved photos, important notes, tasks, tool results, diagnoses,
        and milestones. Zoom changes detail; it never invents missing events.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_timeline"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="timeline" />
      <ContextualWorkflowLinks
        title="Viewer-friendly timeline export"
        helper="Create a readable narrative export with dates, notes, and photo links. Compliance reporting remains separate."
        source="grow_timeline"
        growId={growId}
        workflows={["pdf-export"]}
      />

      <View style={styles.zoomPanel}>
        <Text style={styles.zoomTitle}>Timeline detail</Text>
        <Text style={styles.zoomHelp}>
          {ZOOM_LEVELS.find((item) => item.key === zoom)?.helper}
        </Text>
        <View style={styles.filterRow}>
          {ZOOM_LEVELS.map((item) => {
            const active = item.key === zoom;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Show timeline by ${item.label}`}
                style={[styles.filter, active && styles.filterActive]}
                onPress={() => setZoom(item.key)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.filterRow}>
          <Link
            href={`/home/personal/tools/pdf-export?growId=${encodeURIComponent(growId)}&presentation=timeline`}
            asChild
          >
            <Pressable style={styles.sourceAction} accessibilityRole="link">
              <Text style={styles.sourceActionText}>Export Visual Timeline</Text>
            </Pressable>
          </Link>
          <Link href={shareHref as any} asChild>
            <Pressable
              style={styles.sourceAction}
              accessibilityRole="link"
              accessibilityLabel="Review and share grow timeline"
            >
              <Text style={styles.sourceActionText}>Review & Share Copy</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = item.key === filter;
          return (
            <Pressable
              key={item.key}
              style={[styles.filter, active && styles.filterActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_grows_growid_timeline"
        longContent
      />

      {!loading && !visibleEvents.length ? (
        <Text style={styles.empty}>
          No timeline events match this view. Save a grow log, run a tool, create a task,
          or run a diagnosis from this grow.
        </Text>
      ) : null}

      {groupedEvents.map((period) => (
        <View key={period.key} style={styles.period}>
          <Text accessibilityRole="header" style={styles.periodTitle}>
            {periodLabel(period.key, zoom)}
          </Text>
          <Text style={styles.periodMeta}>
            {period.items.length} saved {period.items.length === 1 ? "event" : "events"}
          </Text>
          {period.items.map((event) => {
            const photos = timelineEventPhotos(event as any);
            return (
              <View key={event.id} style={styles.event}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>
                  {eventKind(event)} | {fmtDate(event.timestamp)}
                </Text>
                {event.summary ? (
                  <Text style={styles.eventSummary}>{event.summary}</Text>
                ) : null}
                {photos.length ? (
                  <View style={styles.photoRow}>
                    {photos
                      .slice(0, zoom === "lifecycle" ? 1 : zoom === "month" ? 2 : 4)
                      .map((photo, index) => (
                        <Image
                          key={`${photo}-${index}`}
                          source={{ uri: photo }}
                          style={styles.photo}
                          resizeMode="cover"
                          accessibilityLabel={`Timeline photo for ${event.title}`}
                        />
                      ))}
                  </View>
                ) : null}
                {eventPayloadDetails(event).map((detail) => (
                  <Text key={detail} style={styles.detailRow}>
                    {detail}
                  </Text>
                ))}
                {sourceHref(event, growId) ? (
                  <Link href={sourceHref(event, growId)} asChild>
                    <Pressable
                      style={styles.sourceAction}
                      accessibilityRole="button"
                      accessibilityLabel={`${sourceLabel(event)}: ${event.title}`}
                    >
                      <Text style={styles.sourceActionText}>{sourceLabel(event)}</Text>
                    </Pressable>
                  </Link>
                ) : null}
                {Array.isArray(event.tags) && event.tags.length ? (
                  <View style={styles.tags}>
                    {event.tags.slice(0, 5).map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_timeline"
        longContent
      />
    </ScrollView>
  );
}
