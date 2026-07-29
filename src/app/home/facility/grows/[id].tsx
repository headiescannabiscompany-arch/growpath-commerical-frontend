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
import { useLocalSearchParams, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import FacilityContextualTools from "@/components/facility/FacilityContextualTools";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function unwrapGrow(res: any): AnyRec | null {
  const row =
    res?.grow ?? res?.item ?? res?.data?.grow ?? res?.data?.item ?? res?.data ?? res;
  return row && typeof row === "object" && !Array.isArray(row) ? row : null;
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.title ?? x?.strain ?? x?.label ?? "Grow Detail");
}

function readableDate(value: unknown) {
  if (!value) return "Not set";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export default function FacilityGrowDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.grow(facilityId, String(id)));
        setItem(unwrapGrow(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, facilityId, handleApiError, id]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!id) {
      router.back();
      return;
    }
    load();
  }, [facilityId, id, load, router]);

  const title = useMemo(() => (item ? pickTitle(item) : "Grow Detail"), [item]);

  return (
    <ScreenBoundary title={title} showBack backFallbackHref="/home/facility/grows">
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

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading grow...</Text>
          </View>
        ) : null}

        {!loading && !item ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Not found</Text>
            <Text style={styles.muted}>This grow could not be loaded.</Text>
          </View>
        ) : null}

        {item ? (
          <>
            <View style={styles.card}>
              <Text style={styles.h1}>Overview</Text>
              <Text style={styles.muted}>
                {item.roomName ? `${item.roomName} → ` : ""}
                {pickTitle(item)}
              </Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Stage</Text>
                  <Text style={styles.summaryValue}>
                    {String(item.stage ?? item.phase ?? "Not set")}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Status</Text>
                  <Text style={styles.summaryValue}>
                    {String(item.status ?? "Active")}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Started</Text>
                  <Text style={styles.summaryValue}>
                    {readableDate(item.startedAt ?? item.startDate ?? item.createdAt)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Plants</Text>
                  <Text style={styles.summaryValue}>
                    {String(item.plantCount ?? item.estimatedPlantCount ?? "Open plants")}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Grow workspace</Text>
              <View style={styles.workspaceGrid}>
                {[
                  ["Plants", "/home/facility/plants"],
                  ["Journal & timeline", "/home/facility/logs"],
                  ["Tasks & calendar", "/home/facility/tasks"],
                  ["Inventory usage", "/home/facility/inventory"],
                  ["Assigned SOPs", "/home/facility/sop-runs"],
                  ["Environment & devices", "/home/facility/integrations"],
                  ["Import grow history", "/home/facility/tools/history-import"],
                  ["Ask GrowPath AI", "/home/facility/ai-ask"]
                ].map(([label, pathname]) => (
                  <Pressable
                    key={label}
                    onPress={() =>
                      router.push({
                        pathname: pathname as any,
                        params: {
                          growId: String(id),
                          roomId: String(item.roomId ?? ""),
                          contextName: pickTitle(item)
                        }
                      })
                    }
                    style={styles.workspaceAction}
                    accessibilityRole="button"
                  >
                    <Text style={styles.workspaceLabel}>{label}</Text>
                    <Text style={styles.workspaceArrow}>{">"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FacilityContextualTools
              title="Grow tools"
              tools={[
                "ask-ai",
                "diagnose",
                "environment",
                "recipe-builder",
                "harvest-readiness",
                "reports"
              ]}
              source="facility-grow-detail"
              facilityId={facilityId ?? undefined}
              growId={String(id)}
              roomId={String(item.roomId ?? "")}
              prompt={`Review ${pickTitle(item)} and recommend the next facility action.`}
            />
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  loading: { alignItems: "center", gap: 10, paddingVertical: 18 },
  muted: { opacity: 0.7 },
  card: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  h1: { fontSize: 18, fontWeight: "900" },
  sectionTitle: { fontSize: 14, fontWeight: "900", marginTop: 4 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    minWidth: 120,
    padding: 10
  },
  summaryLabel: { color: "#64748b", fontSize: 11, fontWeight: "800" },
  summaryValue: { color: "#172317", fontSize: 14, fontWeight: "900", marginTop: 3 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 26 },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  workspaceGrid: { gap: 8, marginTop: 4 },
  workspaceAction: {
    alignItems: "center",
    backgroundColor: "rgba(35, 118, 74, 0.07)",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12
  },
  workspaceLabel: { fontSize: 14, fontWeight: "800" },
  workspaceArrow: { fontSize: 18, opacity: 0.55 }
});
