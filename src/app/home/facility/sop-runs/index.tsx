import React, { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

type SopRunListItem = {
  id?: string;
  _id?: string;
  runId?: string;
  title?: string;
  name?: string;
  status?: string;
  steps?: SopRunStep[];
};
type SopRunStep = {
  status?: string;
};
type UnknownRecord = Record<string, unknown>;

function toRunListItem(x: unknown): SopRunListItem {
  return typeof x === "object" && x !== null ? (x as SopRunListItem) : {};
}

function asArray(res: unknown): SopRunListItem[] {
  const r = (res ?? {}) as UnknownRecord;
  if (Array.isArray(res)) return res.map(toRunListItem);
  if (Array.isArray(r.items)) return r.items.map(toRunListItem);
  if (Array.isArray(r.data)) return r.data.map(toRunListItem);
  if (Array.isArray(r.runs)) return r.runs.map(toRunListItem);
  if (Array.isArray(r.sopRuns)) return r.sopRuns.map(toRunListItem);
  return [];
}

function pickId(x: SopRunListItem, idx: number) {
  return String(x?.id ?? x?._id ?? x?.runId ?? `run-${idx}`);
}

function stepsOf(run: SopRunListItem) {
  return Array.isArray(run.steps) ? run.steps : [];
}

function runStats(run: SopRunListItem) {
  const steps = stepsOf(run);
  const done = steps.filter((step) => step.status === "done").length;
  const skipped = steps.filter((step) => step.status === "skipped").length;
  const reviewed = done + skipped;
  const pending = Math.max(steps.length - reviewed, 0);
  return { total: steps.length, done, skipped, reviewed, pending };
}

function isComplete(run: SopRunListItem) {
  const status = String(run.status || "").toLowerCase();
  return status === "completed" || status === "complete" || status === "done";
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsIndexRoute() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const [items, setItems] = useState<SopRunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiRequest(endpoints.sopRuns(facilityId));
        setItems(asArray(res));
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load SOP runs"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId]
  );

  useEffect(() => {
    if (!facilityId) return;
    void load();
  }, [facilityId, load]);

  if (!facilityId) {
    return (
      <View style={styles.center}>
        <Text>Select a facility first.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const totalRuns = items.length;
  const completedRuns = items.filter(isComplete).length;
  const totalSteps = items.reduce((sum, item) => sum + runStats(item).total, 0);
  const reviewedSteps = items.reduce((sum, item) => sum + runStats(item).reviewed, 0);
  const pendingSteps = items.reduce((sum, item) => sum + runStats(item).pending, 0);
  const runsMissingSteps = items.filter((item) => runStats(item).total === 0).length;

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={pickId}
      onRefresh={() => load({ refresh: true })}
      refreshing={refreshing}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.h1}>
            SOP Library & Runs
          </Text>
          <Text style={styles.summaryLabel}>
            Manage approved facility procedures here, then assign and perform them in a
            grow.
          </Text>
          <View style={styles.links}>
            <Link
              accessibilityRole="button"
              accessibilityLabel="Start SOP run"
              href="/home/facility/sop-runs/start"
              style={styles.link}
            >
              Start Run
            </Link>
            <Link
              accessibilityRole="button"
              accessibilityLabel="Open SOP presets"
              href="/home/facility/sop-runs/presets"
              style={styles.link}
            >
              SOP Library
            </Link>
            <Link
              accessibilityRole="button"
              accessibilityLabel="Compare SOP runs"
              href="/home/facility/sop-runs/compare"
              style={styles.link}
            >
              Compare
            </Link>
          </View>
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryValue}>
                {completedRuns}/{totalRuns}
              </Text>
              <Text style={styles.summaryLabel}>completed runs</Text>
            </View>
            <View>
              <Text style={styles.summaryValue}>
                {reviewedSteps}/{totalSteps}
              </Text>
              <Text style={styles.summaryLabel}>reviewed steps</Text>
            </View>
            <View>
              <Text style={[styles.summaryValue, pendingSteps ? styles.warnText : null]}>
                {pendingSteps}
              </Text>
              <Text style={styles.summaryLabel}>pending steps</Text>
            </View>
          </View>
          {runsMissingSteps ? (
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>Checklist evidence missing</Text>
              <Text style={styles.alertText}>
                {runsMissingSteps} SOP run(s) have no checklist steps. Add evidence before
                exporting an inspection packet.
              </Text>
            </View>
          ) : null}
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No SOP runs found.</Text>}
      renderItem={({ item, index }) => {
        const id = pickId(item, index);
        const stats = runStats(item);
        const missingEvidence = stats.total === 0;
        const needsReview = !missingEvidence && stats.pending > 0;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open SOP run ${String(item?.title || item?.name || id)}`}
            onPress={() =>
              router.push({ pathname: "/home/facility/sop-runs/[id]", params: { id } })
            }
            style={styles.card}
          >
            <Text style={styles.title}>
              {String(item?.title || item?.name || "SOP Run")}
            </Text>
            <Text style={styles.sub}>status: {String(item?.status || "unknown")}</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Evidence: {stats.reviewed}/{stats.total} reviewed
              </Text>
              <Text
                style={[
                  styles.badge,
                  missingEvidence && styles.badgeDanger,
                  needsReview && styles.badgeWarn,
                  !missingEvidence && !needsReview && styles.badgeOk
                ]}
              >
                {missingEvidence
                  ? "missing checklist"
                  : needsReview
                    ? `${stats.pending} pending`
                    : "ready"}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 10, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  links: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  link: { color: "#2563eb", fontWeight: "800" },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16
  },
  summaryValue: { color: "#1e3a8a", fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: "#1e40af", fontSize: 12, fontWeight: "800" },
  warnText: { color: "#b45309" },
  alertCard: {
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#fef2f2"
  },
  alertTitle: { color: "#991b1b", fontWeight: "900" },
  alertText: { color: "#7f1d1d", fontWeight: "700", lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 10
  },
  title: { fontWeight: "800" },
  sub: { opacity: 0.75 },
  progressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 8
  },
  progressText: { color: "#334155", fontWeight: "800" },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "900"
  },
  badgeOk: { color: "#065f46", backgroundColor: "#d1fae5" },
  badgeWarn: { color: "#92400e", backgroundColor: "#fef3c7" },
  badgeDanger: { color: "#991b1b", backgroundColor: "#fee2e2" },
  empty: { opacity: 0.7 },
  err: { color: "#b91c1c", fontWeight: "700" }
});
