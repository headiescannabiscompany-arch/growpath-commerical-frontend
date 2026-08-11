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
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityAnalyticsStyles(palette), [palette]);
  const { selectedId: facilityId } = useFacility();
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const loadInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!facilityId || loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      setData(await fetchFacilityAnalyticsOverview(facilityId));
    } catch (loadError) {
      setError(loadError);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, [facilityId]);

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
            {loading ? "Refreshing..." : "Refresh analytics"}
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
      <AppCard>
        <View style={styles.grid}>
          <Metric
            label="Stable rooms"
            value={`${data.roomStability?.stableRooms || 0}/${data.roomStability?.measuredRooms || 0}`}
            detail={`${data.roomStability?.unknownRooms || 0} rooms unknown`}
          />
          <Metric
            label="Task completion"
            value={`${data.taskCompletion?.rate || 0}%`}
            detail={`${data.taskCompletion?.completed || 0} of ${data.taskCompletion?.total || 0} tasks`}
          />
          <Metric
            label="SOP compliance"
            value={`${data.sopCompliance?.rate || 0}%`}
            detail={`${data.sopCompliance?.completedSteps || 0} of ${data.sopCompliance?.applicableSteps || 0} applicable steps`}
          />
          <Metric
            label="Sensor alerts"
            value={data.sensorAlerts?.total || 0}
            detail={`${data.sensorAlerts?.recordedEvents || 0} sensor/environment events`}
          />
          <Metric
            label="Active batches"
            value={data.batches?.active || 0}
            detail={`${data.batches?.completed || 0} completed runs`}
          />
          <Metric
            label="Training completion"
            value={`${data.training?.completionRate || 0}%`}
            detail={`${data.training?.completedAssignments || 0} of ${data.training?.assignments || 0} assignments · ${data.training?.staff || 0} staff`}
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
