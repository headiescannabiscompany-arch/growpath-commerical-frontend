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

import {
  getPersonalGrowTimeline,
  listPersonalGrows,
  type PersonalGrow,
  type PersonalGrowTimelineEvent
} from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalTasks } from "@/api/tasks";
import { listToolRuns } from "@/api/toolRuns";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, findGrowById, fmtDate } from "@/features/grows/routeUtils";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { marginTop: 6, color: "#64748B" },
  panel: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC"
  },
  stats: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" },
  stat: {
    minWidth: 100,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#FFFFFF"
  },
  statLabel: { color: "#64748B", fontSize: 12 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" },
  action: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  actionText: { fontWeight: "700", color: "#0F172A" },
  sectionTitle: { marginTop: 4, fontSize: 16, fontWeight: "800", color: "#0F172A" },
  timelineItem: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0"
  },
  timelineMeta: { marginTop: 3, color: "#64748B", fontSize: 12 },
  timelineTitle: { fontWeight: "800", color: "#0F172A" },
  timelineSummary: { marginTop: 3, color: "#334155" },
  empty: { marginTop: 8, color: "#64748B" },
  error: { color: "#B91C1C", marginTop: 8 }
});

export default function GrowOverviewScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [grow, setGrow] = useState<PersonalGrow | null>(null);
  const [counts, setCounts] = useState({ logs: 0, tasks: 0, runs: 0 });
  const [timeline, setTimeline] = useState<PersonalGrowTimelineEvent[]>([]);
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
      const [grows, logs, tasks, runs, timelineRows] = await Promise.all([
        listPersonalGrows(),
        listPersonalLogs({ growId }),
        listPersonalTasks({ growId }),
        listToolRuns({ growId }),
        getPersonalGrowTimeline(growId)
      ]);
      const current = findGrowById(grows, growId);
      setGrow(current);
      setCounts({
        logs: Array.isArray(logs) ? logs.length : 0,
        tasks: Array.isArray(tasks) ? tasks.length : 0,
        runs: Array.isArray(runs) ? runs.length : 0
      });
      setTimeline(Array.isArray(timelineRows) ? timelineRows.slice(0, 5) : []);
      if (!current) setError("Grow not found.");
    } catch {
      setError("Failed to load grow workspace.");
      setGrow(null);
      setCounts({ logs: 0, tasks: 0, runs: 0 });
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <Text style={styles.title}>{grow?.name || "Grow Workspace"}</Text>
      <Text style={styles.subtitle}>
        Status: {grow?.status || "active"} | Updated: {fmtDate(grow?.updatedAt)}
      </Text>
      <GrowWorkspaceNav growId={growId} active="overview" />

      <View style={styles.panel}>
        <Text style={styles.subtitle}>
          Grow is the parent object. Journal entries, tool runs, and personal tasks attach
          here.
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Journal</Text>
            <Text style={styles.statValue}>{counts.logs}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tasks</Text>
            <Text style={styles.statValue}>{counts.tasks}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Tool Runs</Text>
            <Text style={styles.statValue}>{counts.runs}</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Recent timeline</Text>
        {timeline.length ? (
          timeline.map((event) => (
            <View key={event.id} style={styles.timelineItem}>
              <Text style={styles.timelineTitle}>{event.title}</Text>
              <Text style={styles.timelineMeta}>
                {event.type.replace(/_/g, " ")} | {fmtDate(event.timestamp)}
              </Text>
              {event.summary ? (
                <Text numberOfLines={2} style={styles.timelineSummary}>
                  {event.summary}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            Logs, photos, tasks, tool runs, diagnoses, and automation events will appear
            here after they are saved to this grow.
          </Text>
        )}
        <Link href={`/home/personal/grows/${growId}/timeline`} asChild>
          <Pressable style={[styles.action, { alignSelf: "flex-start", marginTop: 12 }]}>
            <Text style={styles.actionText}>Open Timeline</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.quickRow}>
        <Link
          href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}`}
          asChild
        >
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>+ Journal Entry</Text>
          </Pressable>
        </Link>
        <Link href={`/home/personal/grows/${growId}/tools`} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Run Tool</Text>
          </Pressable>
        </Link>
        <Link href={`/home/personal/grows/${growId}/tasks`} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Add Task</Text>
          </Pressable>
        </Link>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}
