import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { getPersonalGrowTimeline, type PersonalGrowTimelineEvent } from "@/api/grows";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import ContextualWorkflowLinks from "@/components/personal/ContextualWorkflowLinks";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";
import { savedRunSourceHref } from "@/features/personal/tools/savedRunRoutes";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "log", label: "Journal" },
  { key: "task", label: "Tasks" },
  { key: "tool", label: "Tools" },
  { key: "diagnosis", label: "AI" },
  { key: "automation", label: "Automation" }
] as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { marginTop: 6, color: "#64748B" },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 4
  },
  filter: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  filterActive: { borderColor: "#166534", backgroundColor: "#166534" },
  filterText: { fontWeight: "800", color: "#0F172A", fontSize: 12 },
  filterTextActive: { color: "#FFFFFF" },
  event: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC"
  },
  eventTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  eventMeta: { marginTop: 4, color: "#64748B", fontSize: 12 },
  eventSummary: { marginTop: 8, color: "#334155", lineHeight: 19 },
  detailRow: {
    marginTop: 6,
    color: "#475569",
    fontSize: 12,
    lineHeight: 17
  },
  sourceAction: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  sourceActionText: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: {
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0",
    paddingVertical: 4,
    paddingHorizontal: 7
  },
  tagText: { color: "#334155", fontSize: 11, fontWeight: "700" },
  empty: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    color: "#64748B",
    backgroundColor: "#F8FAFC"
  },
  error: { marginTop: 12, color: "#B91C1C" }
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
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [events, setEvents] = useState<PersonalGrowTimelineEvent[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
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
      setEvents(await getPersonalGrowTimeline(growId));
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Grow Timeline</Text>
      <Text style={styles.subtitle}>
        Saved logs, photos, tasks, tool runs, diagnoses, and automation events.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_timeline"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="timeline" />
      <ContextualWorkflowLinks
        title="Timeline report"
        helper="Export this grow's journal, tasks, plants, and ToolRuns from the shared report workflow."
        source="grow_timeline"
        growId={growId}
        workflows={["pdf-export"]}
      />

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

      {loading ? <ActivityIndicator /> : null}
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

      {visibleEvents.map((event) => (
        <View key={event.id} style={styles.event}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventMeta}>
            {eventKind(event)} | {fmtDate(event.timestamp)}
          </Text>
          {event.summary ? (
            <Text style={styles.eventSummary}>{event.summary}</Text>
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
      ))}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_timeline"
        longContent
      />
    </ScrollView>
  );
}
