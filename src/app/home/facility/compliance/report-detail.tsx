import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";

import { useFacility } from "@/state/useFacility";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { getWeeklyReport, type SavedWeeklyReport } from "@/utils/weeklyReportsStore";

export default function WeeklyReportDetailScreen({ route, navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const id = route?.params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [item, setItem] = useState<SavedWeeklyReport | null>(null);

  const load = async () => {
    if (!facilityId || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getWeeklyReport(facilityId, String(id));
      setItem(res);
    } catch (e) {
      setError(handleApiError(e));
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId, id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, padding: 16 }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Report</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontWeight: "800" }}>Back</Text>
        </TouchableOpacity>
      </View>

      <InlineError error={error} />

      {!item ? (
        <Text>Report not found</Text>
      ) : (
        <>
          <Text style={{ fontSize: 18, fontWeight: "900" }}>{item.title}</Text>
          <Text style={{ marginTop: 8, opacity: 0.7 }}>
            Period: {new Date(item.periodStart).toLocaleDateString()} →{" "}
            {new Date(item.periodEnd).toLocaleDateString()}
          </Text>

          <View style={{ marginTop: 14 }}>
            <Text style={{ fontWeight: "900" }}>Executive Summary</Text>
            <Text style={{ marginTop: 6, opacity: 0.9 }}>
              {item.report?.executiveSummary || ""}
            </Text>
          </View>

          {Array.isArray(item.report?.metrics) && item.report.metrics.length ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontWeight: "900" }}>Key Metrics</Text>
              {item.report.metrics.map((m: any, idx: number) => (
                <View
                  key={idx}
                  style={{
                    marginTop: 8,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 10
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{m.label}</Text>
                  <Text style={{ marginTop: 4 }}>{m.value}</Text>
                  {m.delta ? (
                    <Text style={{ marginTop: 2, opacity: 0.7 }}>Δ {m.delta}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {Array.isArray(item.report?.risks) && item.report.risks.length ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontWeight: "900" }}>Top Risks</Text>
              {item.report.risks.map((r: string, idx: number) => (
                <Text key={idx} style={{ marginTop: 6, opacity: 0.9 }}>
                  • {r}
                </Text>
              ))}
            </View>
          ) : null}

          {Array.isArray(item.report?.recommendedActions) &&
          item.report.recommendedActions.length ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontWeight: "900" }}>Recommended Actions</Text>
              {item.report.recommendedActions.map((a: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() =>
                    a.targetScreen && navigation.navigate(a.targetScreen, a.params)
                  }
                  disabled={!a.targetScreen}
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{a.label}</Text>
                  {a.targetScreen ? (
                    <Text style={{ marginTop: 4, opacity: 0.7 }}>
                      Open → {a.targetScreen}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
