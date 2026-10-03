import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { useFacilityRecordScope } from "@/features/facility/useFacilityRecordRead";

type SopRunDetail = {
  title?: string;
  name?: string;
  status?: string;
  startedAt?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  steps?: SopRunStep[];
} & Record<string, unknown>;
type SopRunDetailResponse = { run?: SopRunDetail; data?: SopRunDetail } & SopRunDetail;
type SopRunStep = {
  stepId?: string;
  title?: string;
  status?: string;
  note?: string;
};

function formatLabel(value: unknown, fallback = "Not recorded") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: unknown) {
  if (!value) return "Not recorded";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function runTitle(run: SopRunDetail | null, fallback: string) {
  return String(run?.title || run?.name || fallback);
}

function runSteps(run: SopRunDetail | null) {
  return Array.isArray(run?.steps) ? run.steps : [];
}

function statusCounts(run: SopRunDetail | null) {
  const steps = runSteps(run);
  const done = steps.filter(
    (step) => String(step.status || "").toLowerCase() === "done"
  ).length;
  const skipped = steps.filter(
    (step) => String(step.status || "").toLowerCase() === "skipped"
  ).length;
  return {
    total: steps.length,
    done,
    skipped,
    pending: Math.max(steps.length - done - skipped, 0),
    reviewed: done + skipped
  };
}

function keyedSteps(run: SopRunDetail | null) {
  const seen = new Map<string, number>();
  return new Map(
    runSteps(run).map((step, index) => {
      const base = String(step.title || step.stepId || `Step ${index + 1}`)
        .trim()
        .toLowerCase();
      const occurrence = (seen.get(base) || 0) + 1;
      seen.set(base, occurrence);
      return [`${base}::${occurrence}`, step] as const;
    })
  );
}

function comparisonRows(left: SopRunDetail | null, right: SopRunDetail | null) {
  const leftMap = keyedSteps(left);
  const rightMap = keyedSteps(right);
  return Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).map((key) => {
    const leftStep = leftMap.get(key);
    const rightStep = rightMap.get(key);
    return {
      key,
      title: String(leftStep?.title || rightStep?.title || "Untitled step"),
      leftStatus: leftStep ? formatLabel(leftStep.status, "Pending") : "Not included",
      rightStatus: rightStep ? formatLabel(rightStep.status, "Pending") : "Not included",
      changed:
        String(leftStep?.status || "").toLowerCase() !==
        String(rightStep?.status || "").toLowerCase()
    };
  });
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

function readRun(response: SopRunDetailResponse, id: string): SopRunDetail {
  const record =
    response && Object.prototype.hasOwnProperty.call(response, "run")
      ? response.run
      : response && Object.prototype.hasOwnProperty.call(response, "data")
        ? response.data
        : response;
  if (
    !record ||
    typeof record !== "object" ||
    Array.isArray(record) ||
    String(record.id || record._id || record.runId || "") !== id ||
    !Array.isArray(record.steps) ||
    record.steps.some((step) => !step || typeof step !== "object" || Array.isArray(step))
  ) {
    throw new Error(
      "Saved run evidence is unavailable. Retry both runs before comparing."
    );
  }
  return record;
}

export default function FacilitySopRunsCompareResultRoute() {
  const params = useLocalSearchParams();
  const scope = useFacilityRecordScope([params.leftId, params.rightId]);
  return <CompareResultContent key={scope} />;
}

function CompareResultContent() {
  const params = useLocalSearchParams<{
    leftId?: string | string[];
    rightId?: string | string[];
  }>();
  const leftId =
    typeof params.leftId === "string" && /^[a-zA-Z0-9_-]+$/.test(params.leftId)
      ? params.leftId
      : "";
  const rightId =
    typeof params.rightId === "string" && /^[a-zA-Z0-9_-]+$/.test(params.rightId)
      ? params.rightId
      : "";
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilitySopCompareResultStyles(palette), [palette]);
  const [left, setLeft] = useState<SopRunDetail | null>(null);
  const [right, setRight] = useState<SopRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!mounted.current || inFlight.current) return;
    if (!leftId || !rightId || leftId === rightId) {
      setError("Select two saved runs before comparing them.");
      setLoading(false);
      return;
    }
    if (!facilityId) {
      setError("Select a facility first.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    inFlight.current = true;
    try {
      const [a, b] = await Promise.all([
        apiRequest<SopRunDetailResponse>(endpoints.sopRun(facilityId, String(leftId))),
        apiRequest<SopRunDetailResponse>(endpoints.sopRun(facilityId, String(rightId)))
      ]);
      if (!mounted.current) return;
      const savedLeft = readRun(a, leftId);
      const savedRight = readRun(b, rightId);
      setLeft(savedLeft);
      setRight(savedRight);
    } catch (e: unknown) {
      if (!mounted.current) return;
      setError(getErrorMessage(e, "Failed to compare runs"));
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [facilityId, leftId, rightId]);
  useEffect(() => {
    void load();
  }, [load]);

  const comparison = useMemo(() => {
    const leftCounts = statusCounts(left);
    const rightCounts = statusCounts(right);
    const rows = comparisonRows(left, right);
    const changed = rows.filter((row) => row.changed).length;
    const doneDifference = rightCounts.done - leftCounts.done;
    const outcome =
      doneDifference === 0
        ? "Both runs have the same number of completed steps."
        : doneDifference > 0
          ? `The comparison run has ${doneDifference} more completed ${doneDifference === 1 ? "step" : "steps"}.`
          : `The comparison run has ${Math.abs(doneDifference)} fewer completed ${Math.abs(doneDifference) === 1 ? "step" : "steps"}.`;
    return { leftCounts, rightCounts, rows, changed, outcome };
  }, [left, right]);

  return (
    <ScreenBoundary
      title="SOP Compare Result"
      showBack
      backFallbackHref="/home/facility/sop-runs/compare"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
          SOP Compare Result
        </Text>
        <Text style={styles.sub}>
          Compare checklist completion and status changes without exposing internal record
          identifiers.
        </Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {loading ? <Text style={styles.sub}>Loading saved run evidence...</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh SOP comparison result"
          disabled={loading || !facilityId || !leftId || !rightId || leftId === rightId}
          accessibilityState={{
            disabled: loading || !facilityId || !leftId || !rightId || leftId === rightId,
            busy: loading
          }}
          onPress={load}
          style={styles.action}
        >
          <Text style={styles.actionText}>
            {loading ? "Refreshing…" : error ? "Retry" : "Refresh"}
          </Text>
        </Pressable>
        {left && right && (loading || error) ? (
          <Text style={styles.sub}>
            Previously loaded comparison is withheld until both saved runs are verified
            again.
          </Text>
        ) : null}

        {!loading && !error && left && right ? (
          <>
            <View style={styles.summaryCard}>
              <Text accessibilityRole="header" aria-level={2} style={styles.title}>
                Outcome summary
              </Text>
              <Text style={styles.summaryValue}>{comparison.outcome}</Text>
              <Text style={styles.sub}>
                {comparison.changed} checklist{" "}
                {comparison.changed === 1 ? "step has" : "steps have"} a different status
                or appears in only one run.
              </Text>
            </View>

            <View style={styles.runRow}>
              <RunSummaryCard
                label="Reference run"
                id={String(leftId)}
                run={left}
                counts={comparison.leftCounts}
                fallbackTitle="Reference SOP run"
                onOpen={() =>
                  router.push({
                    pathname: "/home/facility/sop-runs/[id]",
                    params: { id: String(leftId) }
                  })
                }
                styles={styles}
              />
              <RunSummaryCard
                label="Comparison run"
                id={String(rightId)}
                run={right}
                counts={comparison.rightCounts}
                fallbackTitle="Comparison SOP run"
                onOpen={() =>
                  router.push({
                    pathname: "/home/facility/sop-runs/[id]",
                    params: { id: String(rightId) }
                  })
                }
                styles={styles}
              />
            </View>

            <View style={styles.nextActionsCard}>
              <Text accessibilityRole="header" aria-level={2} style={styles.title}>
                Follow up on this comparison
              </Text>
              <Text style={styles.sub}>
                Open either run to review its recorded checklist evidence, or open
                Facility Tasks to assign and track follow-up work.
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open Facility Tasks for SOP comparison follow-up"
                onPress={() => router.push("/home/facility/tasks")}
                style={styles.action}
              >
                <Text style={styles.actionText}>Open Facility Tasks</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.title}>
                Checklist differences
              </Text>
              {comparison.rows.length ? (
                comparison.rows.map((row) => (
                  <View
                    key={row.key}
                    style={[styles.stepRow, row.changed && styles.changedRow]}
                  >
                    <Text style={styles.stepTitle}>{row.title}</Text>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusText}>Reference: {row.leftStatus}</Text>
                      <Text style={styles.statusText}>Comparison: {row.rightStatus}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.sub}>Neither run contains checklist steps.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

function RunSummaryCard({
  label,
  id,
  run,
  counts,
  fallbackTitle,
  onOpen,
  styles
}: {
  label: string;
  id: string;
  run: SopRunDetail | null;
  counts: ReturnType<typeof statusCounts>;
  fallbackTitle: string;
  onOpen: () => void;
  styles: ReturnType<typeof createFacilitySopCompareResultStyles>;
}) {
  const title = runTitle(run, fallbackTitle);
  return (
    <View style={styles.runCard}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text accessibilityRole="header" aria-level={2} style={styles.runTitle}>
        {title}
      </Text>
      <Text style={styles.statusText}>Status: {formatLabel(run?.status)}</Text>
      <Text style={styles.statusText}>
        Checklist: {counts.done} done · {counts.skipped} skipped · {counts.pending}{" "}
        pending
      </Text>
      <Text style={styles.statusText}>
        Reviewed: {counts.reviewed}/{counts.total}
      </Text>
      <Text style={styles.statusText}>
        Started: {formatDate(run?.startedAt || run?.createdAt)}
      </Text>
      <Text style={styles.statusText}>Completed: {formatDate(run?.completedAt)}</Text>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${label.toLowerCase()} ${title}`}
        onPress={onOpen}
        style={styles.action}
        testID={`open-sop-run-${id}`}
      >
        <Text style={styles.actionText}>Open {label}</Text>
      </Pressable>
    </View>
  );
}

export const createFacilitySopCompareResultStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 16, gap: 10 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    sub: { color: palette.textMuted, fontWeight: "700", lineHeight: 19 },
    err: { color: palette.danger, fontWeight: "700" },
    summaryCard: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    summaryValue: { color: palette.text, fontSize: 16, fontWeight: "900" },
    runRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    runCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      gap: 5,
      minWidth: 260,
      padding: 12
    },
    cardLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "900" },
    runTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.card,
      gap: 8
    },
    nextActionsCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    action: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    actionText: { color: palette.link, fontWeight: "900" },
    title: { color: palette.text, fontWeight: "900" },
    stepRow: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 9
    },
    changedRow: { backgroundColor: palette.surfaceMuted, borderColor: palette.warning },
    stepTitle: { color: palette.text, fontWeight: "900" },
    statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    statusText: { color: palette.textMuted, fontWeight: "700" }
  });
