import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { listPersonalGrows } from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalPlants } from "@/api/plants";
import { listPersonalTasks } from "@/api/tasks";
import { listToolRuns } from "@/api/toolRuns";
import { useEntitlements } from "@/entitlements";
import { buildPersonalHomeModel } from "@/features/personal/homeModel";
import { radius } from "@/theme/theme";

const DAY_MS = 24 * 60 * 60 * 1000;

function timestamp(value) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function sinceDays(days) {
  return Date.now() - days * DAY_MS;
}

function rowId(row, fallback = "") {
  return String(row?._id || row?.id || fallback);
}

function growName(grows, growId) {
  return grows.find((grow) => rowId(grow) === growId)?.name || "Unassigned grow";
}

function countBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts, limit = 4) {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function formatDate(value) {
  const ts = timestamp(value);
  if (!ts) return "No date";
  return new Date(ts).toLocaleDateString();
}

function buildAnalytics({ grows, logs, plants, tasks, toolRuns }) {
  const model = buildPersonalHomeModel({ grows, logs, plants, tasks, toolRuns });
  const recentCutoff = sinceDays(7);
  const now = Date.now();
  const activeGrowIds = new Set(
    grows
      .filter((grow) => grow.status !== "harvested")
      .map((grow) => rowId(grow))
      .filter(Boolean)
  );

  const recentLogs = logs.filter(
    (log) => timestamp(log.date || log.createdAt) >= recentCutoff
  );
  const recentTools = toolRuns.filter((run) => timestamp(run.createdAt) >= recentCutoff);
  const openTasks = tasks.filter((task) => !task.completed);
  const overdueTasks = openTasks.filter((task) => {
    const due = timestamp(task.dueDate);
    return due > 0 && due < now;
  });
  const staleGrows = grows.filter((grow) => {
    if (!activeGrowIds.has(rowId(grow))) return false;
    const latestLog = logs
      .filter((log) => log.growId === rowId(grow))
      .sort(
        (left, right) =>
          timestamp(right.date || right.createdAt) -
          timestamp(left.date || left.createdAt)
      )[0];
    const latestLogTs = timestamp(latestLog?.date || latestLog?.createdAt);
    return !latestLogTs || latestLogTs < sinceDays(10);
  });

  return {
    model,
    recentLogs,
    recentTools,
    openTasks,
    overdueTasks,
    staleGrows,
    activeGrowIds,
    stageCounts: countBy(
      plants.filter((plant) => !plant.status || plant.status !== "archived"),
      (plant) => String(plant.stage || "unstaged").toLowerCase()
    ),
    toolCounts: countBy(toolRuns, (run) =>
      String(run.toolType || run.toolName || "tool").replace(/-/g, " ")
    ),
    logCountsByGrow: countBy(logs, (log) => growName(grows, log.growId)),
    completionRate:
      tasks.length > 0
        ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)
        : 0
  };
}

export default function AnalyticsScreen() {
  const entitlements = useEntitlements();
  const [rows, setRows] = useState({
    grows: [],
    logs: [],
    plants: [],
    tasks: [],
    toolRuns: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [grows, logs, plants, tasks, toolRuns] = await Promise.all([
        listPersonalGrows(),
        listPersonalLogs(),
        listPersonalPlants(),
        listPersonalTasks(),
        listToolRuns()
      ]);
      setRows({ grows, logs, plants, tasks, toolRuns });
    } catch (err) {
      setError(err?.message || "Unable to refresh analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const analytics = useMemo(() => buildAnalytics(rows), [rows]);
  const { model } = analytics;
  const planLabel = entitlements.plan || "free";
  const modeLabel = entitlements.mode || "personal";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>
            {modeLabel} mode | {planLabel} plan
          </Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={load} disabled={loading}>
          <Text style={styles.refreshText}>{loading ? "Refreshing" : "Refresh"}</Text>
        </Pressable>
      </View>

      {loading ? <ActivityIndicator style={styles.loading} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        <Metric label="Active grows" value={model.stats.activeGrowCount} />
        <Metric label="Plants" value={rows.plants.length} />
        <Metric label="Journal entries" value={rows.logs.length} />
        <Metric label="Tool runs" value={rows.toolRuns.length} />
        <Metric label="Open tasks" value={analytics.openTasks.length} />
        <Metric label="Task completion" value={`${analytics.completionRate}%`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Journal entries</Text>
          <Text style={styles.rowValue}>{analytics.recentLogs.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Tools used</Text>
          <Text style={styles.rowValue}>{analytics.recentTools.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Overdue tasks</Text>
          <Text
            style={[styles.rowValue, analytics.overdueTasks.length ? styles.warn : null]}
          >
            {analytics.overdueTasks.length}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grow Activity</Text>
        {topEntries(analytics.logCountsByGrow).length ? (
          topEntries(analytics.logCountsByGrow).map(([name, count]) => (
            <View key={name} style={styles.row}>
              <Text style={styles.rowLabel}>{name}</Text>
              <Text style={styles.rowValue}>{count} logs</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No grow journal activity yet.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant Stages</Text>
        {topEntries(analytics.stageCounts).length ? (
          topEntries(analytics.stageCounts).map(([stage, count]) => (
            <View key={stage} style={styles.row}>
              <Text style={styles.rowLabel}>{stage}</Text>
              <Text style={styles.rowValue}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Add plants to see stage distribution.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tool Mix</Text>
        {topEntries(analytics.toolCounts).length ? (
          topEntries(analytics.toolCounts).map(([tool, count]) => (
            <View key={tool} style={styles.row}>
              <Text style={styles.rowLabel}>{tool}</Text>
              <Text style={styles.rowValue}>{count}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            Run VPD, dew point, feeding, or diagnosis tools to build history.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Needs Attention</Text>
        {analytics.overdueTasks.slice(0, 4).map((task) => (
          <View key={rowId(task, task.title)} style={styles.attentionRow}>
            <Text style={styles.featureTitle}>{task.title || "Untitled task"}</Text>
            <Text style={styles.featureDescription}>
              Due {formatDate(task.dueDate)} | {growName(rows.grows, task.growId)}
            </Text>
          </View>
        ))}
        {analytics.staleGrows.slice(0, 4).map((grow) => (
          <View key={rowId(grow, grow.name)} style={styles.attentionRow}>
            <Text style={styles.featureTitle}>{grow.name || "Active grow"}</Text>
            <Text style={styles.featureDescription}>
              No journal entry in the last 10 days.
            </Text>
          </View>
        ))}
        {!analytics.overdueTasks.length && !analytics.staleGrows.length ? (
          <Text style={styles.empty}>No overdue tasks or stale active grows.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 36,
    backgroundColor: "#F8FAFC"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: "#475569",
    textTransform: "capitalize"
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  refreshText: { color: "#166534", fontWeight: "800" },
  loading: { marginBottom: 12 },
  error: {
    color: "#B91C1C",
    fontWeight: "700",
    marginBottom: 12
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16
  },
  metric: {
    minWidth: 128,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 14
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A"
  },
  metricLabel: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7"
  },
  rowLabel: {
    flex: 1,
    color: "#334155",
    fontWeight: "700",
    textTransform: "capitalize"
  },
  rowValue: {
    color: "#0F172A",
    fontWeight: "800"
  },
  warn: { color: "#B91C1C" },
  attentionRow: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7"
  },
  featureTitle: {
    color: "#0F172A",
    fontWeight: "800"
  },
  featureDescription: {
    color: "#64748B",
    marginTop: 3,
    lineHeight: 19
  },
  empty: { color: "#64748B", lineHeight: 20 }
});
