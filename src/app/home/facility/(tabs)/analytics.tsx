import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { fetchFacilityAnalyticsOverview } from "@/api/facilityAnalytics";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  useFacilityRecordRead,
  useFacilityRecordScope
} from "@/features/facility/useFacilityRecordRead";

function recordedCount(value: unknown): string {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : "Unknown";
}

function recordedRate(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? `${value}%`
    : "Unknown";
}

function countsReadable(...values: unknown[]) {
  return values.every((value) => recordedCount(value) !== "Unknown");
}

function Metric({ label, value, detail }: { label: string; value: any; detail: string }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityAnalyticsStyles(palette), [palette]);
  return (
    <View style={styles.metric}>
      <Text style={styles.value}>{value}</Text>
      <Text accessibilityRole="header" aria-level={2} style={styles.label}>
        {label}
      </Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

export default function FacilityAnalyticsRoute() {
  const scope = useFacilityRecordScope("analytics");
  return <FacilityAnalyticsContent key={scope} />;
}

function FacilityAnalyticsContent() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityAnalyticsStyles(palette), [palette]);
  const { selectedId: facilityId } = useFacility();
  const [data, setData] = useState<any>({});
  const {
    mounted,
    error,
    clearError,
    handleApiError,
    hasLoaded,
    setHasLoaded,
    readFailed,
    setReadFailed
  } = useFacilityRecordRead();
  const [loading, setLoading] = useState(true);
  const loadInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!facilityId || loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    clearError();
    try {
      const next = await fetchFacilityAnalyticsOverview(facilityId);
      if (!mounted.current) return;
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        throw new Error(
          "Facility analytics response is unavailable. Retry to load recorded metrics."
        );
      }
      setData(next);
      setHasLoaded(true);
      setReadFailed(false);
    } catch (loadError) {
      if (mounted.current) {
        handleApiError(loadError);
        setReadFailed(true);
      }
    } finally {
      loadInFlightRef.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [facilityId, mounted, clearError, handleApiError, setHasLoaded, setReadFailed]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    void load();
  }, [facilityId, load, router]);

  return (
    <AppPage
      routeKey="facility-analytics"
      longContent
      header={
        <View>
          <Text style={styles.kicker}>Facility workspace</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Facility Analytics
          </Text>
          <Text style={styles.subtitle}>
            Recorded operational outcomes for the selected facility. Unknown room
            stability remains unknown until a room-linked environment event explicitly
            records an in-range state.
          </Text>
        </View>
      }
    >
      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel="Refresh facility analytics"
          accessibilityRole="button"
          accessibilityState={{ busy: loading, disabled: loading }}
          disabled={loading}
          onPress={() => void load()}
          style={[styles.refreshButton, loading && styles.disabledButton]}
        >
          <Text style={styles.refreshButtonText}>
            {loading
              ? "Refreshing..."
              : readFailed
                ? "Retry analytics"
                : "Refresh analytics"}
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <View
          accessibilityLabel="Loading facility analytics"
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.loading}
        >
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : null}
      {error ? <InlineError error={error} /> : null}
      {!hasLoaded ? (
        <Text style={styles.subtitle}>
          {loading
            ? "Loading recorded analytics. Metrics are not available yet."
            : "Analytics unavailable. Retry to load recorded metrics."}
        </Text>
      ) : loading || readFailed ? (
        <Text style={styles.subtitle}>
          Previously loaded analytics shown.{" "}
          {loading
            ? "Refreshing recorded metrics..."
            : "Retry to refresh the recorded metrics."}
        </Text>
      ) : null}
      <AppCard>
        <View style={styles.grid}>
          <Metric
            label="Stable rooms"
            value={
              countsReadable(
                data.roomStability?.stableRooms,
                data.roomStability?.measuredRooms
              )
                ? `${recordedCount(data.roomStability?.stableRooms)}/${recordedCount(data.roomStability?.measuredRooms)}`
                : "Unknown"
            }
            detail={
              countsReadable(data.roomStability?.unknownRooms)
                ? `${recordedCount(data.roomStability?.unknownRooms)} rooms unknown`
                : "Room coverage unavailable"
            }
          />
          <Metric
            label="Task completion"
            value={recordedRate(data.taskCompletion?.rate)}
            detail={
              countsReadable(data.taskCompletion?.completed, data.taskCompletion?.total)
                ? `${recordedCount(data.taskCompletion?.completed)} of ${recordedCount(data.taskCompletion?.total)} tasks`
                : "Task counts unavailable"
            }
          />
          <Metric
            label="SOP compliance"
            value={recordedRate(data.sopCompliance?.rate)}
            detail={
              countsReadable(
                data.sopCompliance?.completedSteps,
                data.sopCompliance?.applicableSteps
              )
                ? `${recordedCount(data.sopCompliance?.completedSteps)} of ${recordedCount(data.sopCompliance?.applicableSteps)} applicable steps`
                : "SOP step counts unavailable"
            }
          />
          <Metric
            label="Sensor alerts"
            value={recordedCount(data.sensorAlerts?.total)}
            detail={
              countsReadable(data.sensorAlerts?.recordedEvents)
                ? `${recordedCount(data.sensorAlerts?.recordedEvents)} sensor/environment events`
                : "Event coverage unavailable"
            }
          />
          <Metric
            label="Active batches"
            value={recordedCount(data.batches?.active)}
            detail={
              countsReadable(data.batches?.completed)
                ? `${recordedCount(data.batches?.completed)} completed runs`
                : "Completed-run count unavailable"
            }
          />
          <Metric
            label="Training completion"
            value={recordedRate(data.training?.completionRate)}
            detail={
              countsReadable(
                data.training?.completedAssignments,
                data.training?.assignments,
                data.training?.staff
              )
                ? `${recordedCount(data.training?.completedAssignments)} of ${recordedCount(data.training?.assignments)} assignments · ${recordedCount(data.training?.staff)} staff`
                : "Training coverage unavailable"
            }
          />
        </View>
      </AppCard>
    </AppPage>
  );
}

export function createFacilityAnalyticsStyles(palette: ThemePalette) {
  return StyleSheet.create({
    kicker: { color: palette.success, fontWeight: "800", textTransform: "uppercase" },
    title: { color: palette.text, fontSize: 28, fontWeight: "800", marginTop: 4 },
    subtitle: { color: palette.textMuted, lineHeight: 21, marginTop: 7, maxWidth: 760 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    metric: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      minWidth: 210,
      padding: 14
    },
    value: { color: palette.text, fontSize: 24, fontWeight: "800" },
    label: { color: palette.text, fontWeight: "800", marginTop: 5 },
    detail: { color: palette.textMuted, lineHeight: 18, marginTop: 4 },
    actionRow: { alignItems: "flex-start" },
    refreshButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    refreshButtonText: { color: palette.accentText, fontWeight: "800" },
    disabledButton: { opacity: 0.55 },
    loading: { alignItems: "center", paddingVertical: 18 }
  });
}
