import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { fetchFacilityAnalyticsOverview } from "@/api/facilityAnalytics";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

function Metric({ label, value, detail }: { label: string; value: any; detail: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

export default function FacilityAnalyticsRoute() {
  const { selectedId: facilityId } = useFacility();
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facilityId) return;
    setLoading(true);
    fetchFacilityAnalyticsOverview(facilityId)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [facilityId]);

  return (
    <AppPage
      routeKey="facility-analytics"
      longContent
      header={
        <View>
          <Text style={styles.kicker}>Facility workspace</Text>
          <Text style={styles.title}>Facility Analytics</Text>
          <Text style={styles.subtitle}>
            Recorded operational outcomes for the selected facility. Unknown room
            stability remains unknown until a room-linked environment event explicitly
            records an in-range state.
          </Text>
        </View>
      }
    >
      {loading ? <ActivityIndicator /> : null}
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

const styles = StyleSheet.create({
  kicker: { color: "#166534", fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#475569", lineHeight: 21, marginTop: 7, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 210,
    padding: 14
  },
  value: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  label: { color: "#334155", fontWeight: "800", marginTop: 5 },
  detail: { color: "#64748B", lineHeight: 18, marginTop: 4 }
});
