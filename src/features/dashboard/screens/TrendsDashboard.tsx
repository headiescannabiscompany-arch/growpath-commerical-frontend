import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { getGrowlogs, type Growlog } from "../../../api/growlogs";
import { useFacility } from "../../../facility/FacilityProvider";

type TrendGrowlog = Growlog & {
  date?: string;
  updatedAt?: string;
  type?: string;
  tags?: string[];
};

type TrendSummary = {
  totalLogs: number;
  logsLast7Days: number;
  logsLast30Days: number;
  activeDaysLast30: number;
  commonTags: Array<{ label: string; count: number }>;
  commonTypes: Array<{ label: string; count: number }>;
  weeklySeries: Array<{ label: string; count: number }>;
};

function parseLogDate(log: TrendGrowlog): Date | null {
  const raw = log.date || log.createdAt || log.updatedAt;
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekLabel(date: Date) {
  const weekStart = new Date(date);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  return weekStart.toISOString().slice(5, 10);
}

function topEntries(map: Map<string, number>, limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function summarizeTrendGrowlogs(
  logs: TrendGrowlog[],
  now = new Date()
): TrendSummary {
  const tagCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const weekCounts = new Map<string, number>();
  const activeDays = new Set<string>();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  let logsLast7Days = 0;
  let logsLast30Days = 0;

  logs.forEach((log) => {
    const date = parseLogDate(log);
    if (date) {
      const time = date.getTime();
      if (time >= sevenDaysAgo) logsLast7Days += 1;
      if (time >= thirtyDaysAgo) {
        logsLast30Days += 1;
        activeDays.add(dayKey(date));
      }
      const label = weekLabel(date);
      weekCounts.set(label, (weekCounts.get(label) || 0) + 1);
    }

    const type = String(log.type || "").trim();
    if (type) typeCounts.set(type, (typeCounts.get(type) || 0) + 1);

    if (Array.isArray(log.tags)) {
      log.tags.forEach((tag) => {
        const clean = String(tag || "").trim();
        if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      });
    }
  });

  return {
    totalLogs: logs.length,
    logsLast7Days,
    logsLast30Days,
    activeDaysLast30: activeDays.size,
    commonTags: topEntries(tagCounts),
    commonTypes: topEntries(typeCounts),
    weeklySeries: topEntries(weekCounts, 8).sort((a, b) => a.label.localeCompare(b.label))
  };
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function RankedList({
  title,
  rows,
  empty
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
  empty: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length ? (
        rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={styles.rowValue}>{row.count}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{empty}</Text>
      )}
    </View>
  );
}

export default function TrendsDashboard({ facilityId: facilityIdProp }: { facilityId?: string }) {
  const facility = useFacility();
  const facilityId = facilityIdProp || facility?.activeFacilityId || facility?.selectedId || "";
  const [logs, setLogs] = useState<TrendGrowlog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!facilityId) return;
      setLoading(true);
      setError("");
      try {
        const rows = await getGrowlogs(facilityId);
        if (alive) setLogs(rows as TrendGrowlog[]);
      } catch (err: any) {
        if (alive) setError(err?.message || "Failed to load trend data.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [facilityId]);

  const summary = useMemo(() => summarizeTrendGrowlogs(logs), [logs]);

  if (!facilityId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Trends Dashboard</Text>
        <Text style={styles.emptyText}>Select a facility to load trend analytics.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trends Dashboard</Text>
        <Text style={styles.subtitle}>Facility activity from grow logs</Text>
      </View>

      {loading ? <ActivityIndicator size="small" /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.metricsGrid}>
        <MetricCard label="Total logs" value={summary.totalLogs} />
        <MetricCard label="Last 7 days" value={summary.logsLast7Days} />
        <MetricCard label="Last 30 days" value={summary.logsLast30Days} />
        <MetricCard label="Active days" value={summary.activeDaysLast30} />
      </View>

      <RankedList
        title="Weekly Log Volume"
        rows={summary.weeklySeries}
        empty="No dated grow logs found yet."
      />
      <RankedList
        title="Common Tags"
        rows={summary.commonTags}
        empty="Tags will appear after grow logs include them."
      />
      <RankedList
        title="Common Log Types"
        rows={summary.commonTypes}
        empty="Log types will appear after categorized entries are saved."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8fafc"
  },
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: "#f8fafc"
  },
  header: {
    gap: 4
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827"
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563"
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricCard: {
    minWidth: 140,
    flexGrow: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    padding: 14
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f766e"
  },
  metricLabel: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 13
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10
  },
  rowLabel: {
    flex: 1,
    color: "#374151",
    fontWeight: "600"
  },
  rowValue: {
    color: "#111827",
    fontWeight: "800"
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 14
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "700"
  }
});
