import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { listAuditLogs } from "@/api/audit";
import { listBatchCycles } from "@/api/facilityWorkflows";
import { getFacilityReport } from "@/api/reports";
import { getSOPTemplates } from "@/api/sop";
import { listTeamMembers } from "@/api/team";
import { getVerifications } from "@/api/verification";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;
type Tone = "green" | "amber" | "blue" | "violet" | "red" | "slate" | "cyan" | "orange";

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  return [];
}

function tileToneStyle(tone: Tone) {
  switch (tone) {
    case "green":
      return styles.tile_green;
    case "amber":
      return styles.tile_amber;
    case "blue":
      return styles.tile_blue;
    case "violet":
      return styles.tile_violet;
    case "red":
      return styles.tile_red;
    case "cyan":
      return styles.tile_cyan;
    case "orange":
      return styles.tile_orange;
    case "slate":
    default:
      return styles.tile_slate;
  }
}

function dotToneStyle(tone: Tone) {
  switch (tone) {
    case "green":
      return styles.dot_green;
    case "amber":
      return styles.dot_amber;
    case "red":
      return styles.dot_red;
    case "blue":
      return styles.dot_blue;
    case "slate":
    default:
      return styles.dot_slate;
  }
}

export default function FacilityDashboardTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const { width } = useWindowDimensions();
  const isTablet = width >= 760;
  const isDesktop = width >= 1040;
  const isTv = width >= 1600;

  const mapApiError = useApiErrorHandler();
  const mapApiErrorRef = useRef(mapApiError);
  mapApiErrorRef.current = mapApiError;
  const [error, setError] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [counts, setCounts] = useState({
    grows: 0,
    plants: 0,
    rooms: 0,
    batchCycles: 0,
    tasks: 0,
    inventory: 0,
    logs: 0,
    team: 0,
    sops: 0,
    auditLogs: 0,
    verifications: 0,
    reports: 0
  });

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setError(null);

        const optional = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
          try {
            return await fn();
          } catch {
            return fallback;
          }
        };

        const [
          growsRes,
          plantsRes,
          roomsRes,
          batchCyclesRes,
          tasksRes,
          inventoryRes,
          logsRes,
          teamRes,
          sopRows,
          auditRes,
          verificationRows,
          reportRes
        ] = await Promise.all([
          apiRequest(endpoints.grows(facilityId)),
          apiRequest(endpoints.plants(facilityId)),
          apiRequest(endpoints.rooms(facilityId)),
          optional(() => listBatchCycles(facilityId), []),
          apiRequest(endpoints.tasks(facilityId)),
          apiRequest(endpoints.inventory(facilityId)),
          apiRequest(endpoints.growlogs(facilityId)),
          optional(() => listTeamMembers(facilityId), []),
          optional(() => getSOPTemplates(facilityId), []),
          optional(() => listAuditLogs(facilityId), { success: true, data: [] }),
          optional(() => getVerifications(facilityId), []),
          optional(() => getFacilityReport(facilityId), null)
        ]);

        setCounts({
          grows: asArray(growsRes).length,
          plants: asArray(plantsRes).length,
          rooms: asArray(roomsRes).length,
          batchCycles: asArray(batchCyclesRes).length,
          tasks: asArray(tasksRes).length,
          inventory: asArray(inventoryRes).length,
          logs: asArray(logsRes).length,
          team: asArray(teamRes).length,
          sops: asArray(sopRows).length,
          auditLogs: Array.isArray(auditRes?.data)
            ? auditRes.data.length
            : asArray(auditRes).length,
          verifications: asArray(verificationRows).filter((record) => {
            const status = String(
              record?.status || record?.state || "pending"
            ).toLowerCase();
            return status === "pending" || status === "open" || status === "requested";
          }).length,
          reports: reportRes ? 1 : 0
        });
      } catch (e) {
        setError(mapApiErrorRef.current.toInlineError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId]
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
      {
        label: "Open tasks",
        value: counts.tasks,
        to: "/home/facility/tasks",
        tone: "amber" as Tone,
        hint: "Work queue"
      },
      {
        label: "Plants",
        value: counts.plants,
        to: "/home/facility/plants",
        tone: "green" as Tone,
        hint: `${counts.grows} grows`
      },
      {
        label: "Rooms",
        value: counts.rooms,
        to: "/home/facility/rooms",
        tone: "blue" as Tone,
        hint: `${counts.batchCycles} batches`
      },
      {
        label: "Inventory",
        value: counts.inventory,
        to: "/home/facility/inventory",
        tone: "violet" as Tone,
        hint: "Tracked items"
      },
      {
        label: "Verifications",
        value: counts.verifications,
        to: "/home/facility/compliance",
        tone: (counts.verifications ? "red" : "green") as Tone,
        hint: counts.verifications ? "Needs review" : "Clear"
      },
      {
        label: "Audit events",
        value: counts.auditLogs,
        to: "/home/facility/audit-logs",
        tone: "slate" as Tone,
        hint: "Evidence trail"
      },
      {
        label: "SOPs",
        value: counts.sops,
        to: "/home/facility/sop-runs",
        tone: "cyan" as Tone,
        hint: "Procedures"
      },
      {
        label: "Team",
        value: counts.team,
        to: "/home/facility/team",
        tone: "orange" as Tone,
        hint: "Members"
      }
    ],
    [counts]
  );

  const statusRows = useMemo(
    () => [
      {
        label: "Compliance posture",
        value: counts.verifications
          ? `${counts.verifications} pending`
          : "No pending checks",
        tone: (counts.verifications ? "red" : "green") as Tone,
        to: "/home/facility/compliance"
      },
      {
        label: "Audit readiness",
        value: `${counts.auditLogs} events captured`,
        tone: (counts.auditLogs ? "blue" : "amber") as Tone,
        to: "/home/facility/audit-logs"
      },
      {
        label: "Operational load",
        value: `${counts.tasks} tasks / ${counts.logs} logs`,
        tone: (counts.tasks ? "amber" : "slate") as Tone,
        to: "/home/facility/tasks"
      }
    ],
    [counts]
  );

  const actionRows = useMemo(
    () => [
      { label: "AI command", detail: "Ask facility AI", to: "/home/facility/ai/ask" },
      {
        label: "Export packet",
        detail: "Reports and audit evidence",
        to: "/home/facility/reports"
      },
      {
        label: "SOP operations",
        detail: "Run and compare procedures",
        to: "/home/facility/sop-runs"
      },
      {
        label: "Room board",
        detail: "Rooms, batches, and access",
        to: "/home/facility/rooms"
      }
    ],
    []
  );

  const tileBasis = isTv ? "23.5%" : isDesktop ? "31.7%" : isTablet ? "48.5%" : "100%";

  return (
    <ScreenBoundary title="Dashboard">
      <ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.container,
          isTv ? styles.containerTv : isDesktop ? styles.containerDesktop : null
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <View style={[styles.hero, isTv ? styles.heroTv : null]}>
          <View style={styles.heroCopy}>
            <Text style={[styles.kicker, isTv ? styles.kickerTv : null]}>
              Facility command
            </Text>
            <Text style={[styles.h1, isTv ? styles.h1Tv : null]}>Operations Live</Text>
            <Text style={[styles.muted, isTv ? styles.mutedTv : null]}>
              {facilityId ? String(facilityId) : "(none)"}
            </Text>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.pulse}>
              <Text style={styles.pulseValue}>
                {counts.verifications ? "Review" : "Clear"}
              </Text>
              <Text style={styles.pulseLabel}>Compliance</Text>
            </View>
            <View style={styles.pulse}>
              <Text style={styles.pulseValue}>{String(counts.tasks)}</Text>
              <Text style={styles.pulseLabel}>Tasks</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading...</Text>
          </View>
        ) : null}

        <View style={[styles.contentGrid, isDesktop ? styles.contentGridWide : null]}>
          <View style={styles.mainColumn}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>At a glance</Text>
              <Pressable
                onPress={() => load({ refresh: true })}
                style={styles.refreshButton}
              >
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {quick.map((q) => (
                <Pressable
                  key={q.label}
                  onPress={() => router.push(q.to as any)}
                  style={({ pressed }) => [
                    styles.tile,
                    { width: tileBasis },
                    tileToneStyle(q.tone),
                    pressed && styles.pressed
                  ]}
                >
                  <View>
                    <Text style={[styles.tileValue, isTv ? styles.tileValueTv : null]}>
                      {String(q.value)}
                    </Text>
                    <Text style={styles.tileLabel}>{q.label}</Text>
                  </View>
                  <Text style={styles.tileHint}>{q.hint}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.sideColumn, isDesktop ? styles.sideColumnWide : null]}>
            <View style={styles.panel}>
              <Text style={styles.cardTitle}>Priority status</Text>
              {statusRows.map((row) => (
                <Pressable
                  key={row.label}
                  onPress={() => router.push(row.to as any)}
                  style={({ pressed }) => [styles.statusRow, pressed && styles.pressed]}
                >
                  <View style={[styles.statusDot, dotToneStyle(row.tone)]} />
                  <View style={styles.statusText}>
                    <Text style={styles.rowTitle}>{row.label}</Text>
                    <Text style={styles.rowMeta}>{row.value}</Text>
                  </View>
                  <Text style={styles.link}>Open</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.panel}>
              <Text style={styles.cardTitle}>Command actions</Text>
              {actionRows.map((row) => (
                <Pressable
                  key={row.label}
                  onPress={() => router.push(row.to as any)}
                  style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
                >
                  <View>
                    <Text style={styles.rowTitle}>{row.label}</Text>
                    <Text style={styles.rowMeta}>{row.detail}</Text>
                  </View>
                  <Text style={styles.link}>Open</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#f4f6f3" },
  container: { padding: 16, paddingBottom: 28 },
  containerDesktop: { alignSelf: "center", maxWidth: 1280, width: "100%" },
  containerTv: { alignSelf: "center", maxWidth: 1840, padding: 28, width: "100%" },
  hero: {
    alignItems: "stretch",
    backgroundColor: "#0b1220",
    borderRadius: 8,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    marginBottom: 14,
    minHeight: 138,
    padding: 18
  },
  heroTv: { minHeight: 180, padding: 28 },
  heroCopy: { flex: 1, justifyContent: "center" },
  kicker: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  kickerTv: { fontSize: 16 },
  h1: { color: "white", fontSize: 30, fontWeight: "900", marginBottom: 6 },
  h1Tv: { fontSize: 54 },
  muted: { color: "#cbd5e1", fontWeight: "700", marginBottom: 0 },
  mutedTv: { fontSize: 20 },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end"
  },
  pulse: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 118,
    padding: 12
  },
  pulseValue: { color: "white", fontSize: 20, fontWeight: "900" },
  pulseLabel: { color: "#a7f3d0", fontSize: 12, fontWeight: "800", marginTop: 3 },

  loading: { paddingVertical: 18, alignItems: "center" },
  contentGrid: { gap: 14 },
  contentGridWide: { alignItems: "flex-start", flexDirection: "row" },
  mainColumn: { flex: 1, minWidth: 0 },
  sideColumn: { gap: 14, width: "100%" },
  sideColumnWide: { width: 360 },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  refreshButton: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  refreshText: { color: "white", fontSize: 12, fontWeight: "900" },
  panel: {
    backgroundColor: "white",
    borderColor: "#d7ddd2",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  cardTitle: { color: "#111827", fontSize: 15, fontWeight: "900", marginBottom: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    aspectRatio: 1.9,
    backgroundColor: "white",
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "space-between",
    minHeight: 118,
    padding: 14
  },
  tile_green: { borderColor: "#9bd2a8" },
  tile_amber: { borderColor: "#e0be6b" },
  tile_blue: { borderColor: "#9bb8e8" },
  tile_violet: { borderColor: "#b9a6e8" },
  tile_red: { borderColor: "#e5a1a1" },
  tile_slate: { borderColor: "#aeb7c3" },
  tile_cyan: { borderColor: "#8ecbd3" },
  tile_orange: { borderColor: "#e3ad80" },
  tileValue: { color: "#111827", fontSize: 30, fontWeight: "900", marginBottom: 2 },
  tileValueTv: { fontSize: 48 },
  tileLabel: { color: "#1f2937", fontWeight: "900" },
  tileHint: { color: "#5b6472", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.85 },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)"
  },
  actionRow: {
    alignItems: "center",
    borderTopColor: "rgba(0,0,0,0.06)",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingVertical: 10
  },
  statusDot: { borderRadius: 5, height: 10, width: 10 },
  dot_green: { backgroundColor: "#22c55e" },
  dot_amber: { backgroundColor: "#f59e0b" },
  dot_red: { backgroundColor: "#dc2626" },
  dot_blue: { backgroundColor: "#2563eb" },
  dot_slate: { backgroundColor: "#64748b" },
  statusText: { flex: 1 },
  rowTitle: { flex: 1, fontWeight: "800" },
  rowMeta: { color: "#64748b", fontSize: 12, fontWeight: "700", marginTop: 2 },
  link: { color: "#2563eb", fontWeight: "900" }
});
