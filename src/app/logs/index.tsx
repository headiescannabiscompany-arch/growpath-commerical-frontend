import { Link, Redirect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";

type LogItem = {
  id?: string;
  _id?: string;
  title?: string;
  note?: string;
  notes?: string;
  type?: string | null;
  growId?: string | null;
  plantId?: string | null;
  tags?: string[];
  date?: string;
  createdAt?: string;
  linkedToolRunId?: string | null;
  linkedDiagnosisId?: string | null;
};

function asLogs(res: any): LogItem[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.logs)) return res.logs;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.logs)) return res.data.logs;
  return [];
}

function logId(log: LogItem) {
  return String(log.id || log._id || "");
}

function label(value?: string | null) {
  const text = String(value || "general").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateLabel(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function CommercialLogs() {
  const ent = useEntitlements();
  const mapApiError = useApiErrorHandler();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<UiErrorState | null>(null);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      try {
        setError(null);
        const res = await apiRequest(endpoints.logsGlobal, { method: "GET" });
        setLogs(asLogs(res));
      } catch (e) {
        setError(mapApiError.toInlineError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapApiError]
  );

  useEffect(() => {
    if (ent.ready && ent.mode === "commercial") void load();
  }, [ent.mode, ent.ready, load]);

  const summary = useMemo(() => {
    const linkedTools = logs.filter((log) => log.linkedToolRunId).length;
    const linkedDiagnoses = logs.filter((log) => log.linkedDiagnosisId).length;
    const tagged = logs.filter(
      (log) => Array.isArray(log.tags) && log.tags.length > 0
    ).length;
    return { count: logs.length, linkedTools, linkedDiagnoses, tagged };
  }, [logs]);

  if (!ent.ready) return null;
  if (ent.mode !== "commercial") return <Redirect href="/home/personal" />;

  return (
    <AppPage
      routeKey="logs"
      header={
        <View>
          <Text style={styles.headerTitle}>Logs</Text>
          <Text style={styles.headerSubtitle}>
            Review saved grow notes, tool outputs, diagnosis records, and tagged work.
          </Text>
        </View>
      }
    >
      {error ? <InlineError error={error} onRetry={() => void load()} /> : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
          />
        }
        contentContainerStyle={styles.inner}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.count}</Text>
            <Text style={styles.summaryLabel}>Logs</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.linkedTools}</Text>
            <Text style={styles.summaryLabel}>Tool Links</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.linkedDiagnoses}</Text>
            <Text style={styles.summaryLabel}>Diagnoses</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.tagged}</Text>
            <Text style={styles.summaryLabel}>Tagged</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading logs...</Text>
          </View>
        ) : null}

        {!loading && logs.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No Logs Yet</Text>
            <Text style={styles.cardDesc}>
              Saved notes and AI/tool records will appear here when a user stores them.
            </Text>
          </AppCard>
        ) : null}

        {logs.map((log) => {
          const id = logId(log);
          const body = log.note || log.notes || "No notes";
          return (
            <AppCard key={id || `${log.title}-${log.createdAt}`}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{log.title || "Log entry"}</Text>
                <Text style={styles.statusPill}>{label(log.type)}</Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={3}>
                {body}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>
                  {dateLabel(log.date || log.createdAt)}
                </Text>
                {log.growId ? (
                  <Text style={styles.metaPill}>Grow {log.growId}</Text>
                ) : null}
                {log.plantId ? (
                  <Text style={styles.metaPill}>Plant {log.plantId}</Text>
                ) : null}
                {log.linkedToolRunId ? (
                  <Text style={styles.metaPill}>Tool run</Text>
                ) : null}
                {log.linkedDiagnosisId ? (
                  <Text style={styles.metaPill}>Diagnosis</Text>
                ) : null}
              </View>
              {Array.isArray(log.tags) && log.tags.length ? (
                <View style={styles.tagRow}>
                  {log.tags.slice(0, 6).map((tag) => (
                    <Text key={tag} style={styles.tagPill}>
                      {tag}
                    </Text>
                  ))}
                </View>
              ) : null}
              {id ? (
                <Link href={`/logs/${encodeURIComponent(id)}` as any} asChild>
                  <Text style={styles.link}>Open Log</Text>
                </Link>
              ) : null}
            </AppCard>
          );
        })}
      </ScrollView>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 14
  },
  inner: {
    gap: 14,
    paddingBottom: 28
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 148,
    padding: 12
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900"
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase"
  },
  loading: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 28
  },
  muted: {
    color: "#64748B",
    fontSize: 13
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#0F172A",
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  cardDesc: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  statusPill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  metaPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  tagPill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  link: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 12
  }
});
