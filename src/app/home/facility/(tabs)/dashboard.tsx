import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  return [];
}

export default function FacilityDashboardTab() {
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

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [counts, setCounts] = useState({
    grows: 0,
    plants: 0,
    tasks: 0,
    inventory: 0,
    logs: 0,
    auditLogs: 0
  });

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();

        const [growsRes, plantsRes, tasksRes, inventoryRes, logsRes, auditRes] =
          await Promise.all([
            apiRequest(endpoints.grows(facilityId)),
            apiRequest(endpoints.plants(facilityId)),
            apiRequest(endpoints.tasks(facilityId)),
            apiRequest(endpoints.inventory(facilityId)),
            apiRequest(endpoints.growlogs(facilityId)),
            apiRequest(endpoints.auditLogs(facilityId))
          ]);

        setCounts({
          grows: asArray(growsRes).length,
          plants: asArray(plantsRes).length,
          tasks: asArray(tasksRes).length,
          inventory: asArray(inventoryRes).length,
          logs: asArray(logsRes).length,
          auditLogs: asArray(auditRes).length
        });
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const quick = useMemo(
    () => [
      { label: "Tasks", value: counts.tasks, to: "/home/facility/tasks" },
      { label: "Plants", value: counts.plants, to: "/home/facility/plants" },
      { label: "Logs", value: counts.logs, to: "/home/facility/logs" },
      { label: "Inventory", value: counts.inventory, to: "/home/facility/inventory" },
      { label: "SOP Runs", value: 0, to: "/home/facility/sop-runs" },
      { label: "Audit Logs", value: counts.auditLogs, to: "/home/facility/audit-logs" }
    ],
    [counts]
  );

  return (
    <ScreenBoundary title="Dashboard">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <Text style={styles.h1}>Facility Dashboard</Text>
        <Text style={styles.muted}>
          facilityId: {facilityId ? String(facilityId) : "(none)"}
        </Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>At a glance</Text>

          <View style={styles.grid}>
            {quick.map((q) => (
              <Pressable
                key={q.label}
                onPress={() => router.push(q.to as any)}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              >
                <Text style={styles.tileValue}>{String(q.value)}</Text>
                <Text style={styles.tileLabel}>{q.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>

          <Pressable
            onPress={() => router.push("/home/facility/ai/ask")}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowTitle}>Ask AI</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/home/facility/ai/diagnosis-photo")}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowTitle}>Photo Diagnosis</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/home/facility/compliance/ai4.dashboard")}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowTitle}>Compliance AI4 Dashboard</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7, marginBottom: 12 },

  loading: { paddingVertical: 18, alignItems: "center" },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginTop: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: {
    width: "48%",
    marginRight: "4%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 14,
    padding: 12
  },
  tileValue: { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  tileLabel: { opacity: 0.75, fontWeight: "700" },
  pressed: { opacity: 0.85 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)"
  },
  rowTitle: { flex: 1, fontWeight: "800" },
  chev: { fontSize: 22, opacity: 0.5 }
});
