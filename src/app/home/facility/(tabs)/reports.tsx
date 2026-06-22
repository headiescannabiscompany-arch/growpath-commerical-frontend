import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { getFacilityReport } from "@/api/reports";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import type { FacilityReport } from "@/types/report";

function StatTile({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{String(value)}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {detail ? <Text style={styles.tileDetail}>{detail}</Text> : null}
    </View>
  );
}

export default function FacilityReportsTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [report, setReport] = useState<FacilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      try {
        clearError();
        setReport(await getFacilityReport(facilityId));
      } catch (e) {
        handleApiError(e);
        setReport(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, facilityId, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  return (
    <ScreenBoundary title="Reports">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load({ refresh: true })} />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Facility Reports</Text>
            <Text style={styles.muted}>Summary from the facility reports endpoint.</Text>
          </View>
          <Pressable style={styles.button} onPress={() => load({ refresh: true })}>
            <Text style={styles.buttonText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading report...</Text>
          </View>
        ) : null}

        {!loading && !report ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No report available</Text>
            <Text style={styles.muted}>The backend did not return a report summary.</Text>
          </View>
        ) : null}

        {report ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tasks</Text>
              <View style={styles.grid}>
                <StatTile label="Total" value={report.tasks?.total ?? 0} />
                <StatTile label="Open" value={report.tasks?.open ?? 0} />
                <StatTile label="Overdue" value={report.tasks?.overdue ?? 0} />
                <StatTile
                  label="Completed"
                  value={report.tasks?.completedLast7d ?? 0}
                  detail="last 7 days"
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Compliance</Text>
              <View style={styles.grid}>
                <StatTile label="Logs" value={report.compliance?.totalLogs ?? 0} />
                <StatTile
                  label="Missed"
                  value={report.compliance?.missedLast7d ?? 0}
                  detail="last 7 days"
                />
              </View>
              {Object.entries(report.compliance?.byType || {}).map(([type, value]) => (
                <View key={type} style={styles.row}>
                  <Text style={styles.rowTitle}>{type}</Text>
                  <Text style={styles.rowValue}>{String(value)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Team</Text>
              <View style={styles.grid}>
                <StatTile label="Members" value={report.team?.totalMembers ?? 0} />
              </View>
              {Object.entries(report.team?.byRole || {}).map(([role, value]) => (
                <View key={role} style={styles.row}>
                  <Text style={styles.rowTitle}>{role}</Text>
                  <Text style={styles.rowValue}>{String(value)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Automation</Text>
              <View style={styles.grid}>
                <StatTile label="Policies" value={report.automation?.policiesEnabled ?? 0} />
                <StatTile
                  label="Triggers"
                  value={report.automation?.triggersLast7d ?? 0}
                  detail="last 7 days"
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7 },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonText: { color: "white", fontWeight: "900" },
  loading: { alignItems: "center", paddingVertical: 24 },
  card: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 14
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 120,
    padding: 12
  },
  tileValue: { fontSize: 22, fontWeight: "900" },
  tileLabel: { fontWeight: "800", marginTop: 4, opacity: 0.76 },
  tileDetail: { fontSize: 12, marginTop: 2, opacity: 0.64 },
  row: {
    borderTopColor: "rgba(0,0,0,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    paddingVertical: 10
  },
  rowTitle: { flex: 1, fontWeight: "800" },
  rowValue: { fontWeight: "900" }
});
