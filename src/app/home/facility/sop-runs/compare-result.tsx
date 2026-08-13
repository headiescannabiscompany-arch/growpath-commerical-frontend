import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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

export default function FacilitySopRunsCompareResultRoute() {
  const params = useLocalSearchParams<{
    leftId?: string | string[];
    rightId?: string | string[];
  }>();
  const leftId = Array.isArray(params.leftId) ? params.leftId[0] : params.leftId;
  const rightId = Array.isArray(params.rightId) ? params.rightId[0] : params.rightId;
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilitySopCompareResultStyles(palette), [palette]);
  const [left, setLeft] = useState<SopRunDetail | null>(null);
  const [right, setRight] = useState<SopRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!leftId || !rightId) {
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
      try {
        const [a, b] = await Promise.all([
          apiRequest<SopRunDetailResponse>(endpoints.sopRun(facilityId, String(leftId))),
          apiRequest<SopRunDetailResponse>(endpoints.sopRun(facilityId, String(rightId)))
        ]);
        setLeft(a?.run ?? a?.data ?? a);
        setRight(b?.run ?? b?.data ?? b);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to compare runs"));
        setLeft(null);
        setRight(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [facilityId, leftId, rightId]);

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
      borderColor: palette.borderStrong,
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
