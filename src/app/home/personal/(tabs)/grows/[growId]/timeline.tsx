import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
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
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";

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
    borderRadius: 8,
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
    borderRadius: 8,
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
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: {
    borderRadius: 8,
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
    borderRadius: 8,
    color: "#64748B",
    backgroundColor: "#F8FAFC"
  },
  error: { marginTop: 12, color: "#B91C1C" }
});

function eventMatchesFilter(event: PersonalGrowTimelineEvent, filter: string) {
  if (filter === "all") return true;
  return String(event.type || event.sourceModel || "")
    .toLowerCase()
    .includes(filter);
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
      <GrowWorkspaceNav growId={growId} active="timeline" />

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
    </ScrollView>
  );
}
