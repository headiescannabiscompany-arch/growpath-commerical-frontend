import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import DewPointGuardTool from "@/app/home/personal/(tabs)/tools/dew-point-guard";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

function growRows(response: any) {
  const rows =
    response?.grows ??
    response?.items ??
    response?.data?.grows ??
    response?.data ??
    response;
  return Array.isArray(rows) ? rows : [];
}

export default function FacilityHistoryImportRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ growId?: string; growName?: string }>();
  const { selectedId: facilityId } = useFacility();
  const growId = String(params.growId || "").trim();
  const [grows, setGrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(!growId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (growId || !facilityId) return;
    setLoading(true);
    apiRequest(endpoints.grows(facilityId))
      .then((response) => setGrows(growRows(response)))
      .catch((reason: any) =>
        setError(reason?.message || "Unable to load facility grows.")
      )
      .finally(() => setLoading(false));
  }, [facilityId, growId]);

  if (growId) {
    return (
      <ScreenBoundary
        title={params.growName ? `Import: ${params.growName}` : "Import grow history"}
        showBack
        backFallbackHref="/home/facility/integrations"
      >
        <DewPointGuardTool historyImportMode />
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Choose a grow for imported history"
      showBack
      backFallbackHref="/home/facility/integrations"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.copy}>
          Controller history belongs to a grow so its environment readings, alerts, AI
          analysis, tasks, and timeline remain connected. Choose the destination before
          selecting the CSV.
        </Text>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !grows.length ? (
          <Text style={styles.copy}>No grows are available in this facility yet.</Text>
        ) : null}
        {grows.map((grow) => {
          const id = String(grow.id || grow._id || grow.growId || "");
          const name = String(grow.name || grow.title || grow.strain || "Grow");
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`Import history into ${name}`}
              style={styles.growCard}
              onPress={() =>
                router.push({
                  pathname: "/home/facility/tools/history-import" as any,
                  params: { growId: id, growName: name }
                })
              }
            >
              <View>
                <Text style={styles.growName}>{name}</Text>
                <Text style={styles.meta}>
                  {grow.roomName || grow.stage || grow.status || "Facility grow"}
                </Text>
              </View>
              <Text style={styles.action}>Choose</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16, paddingBottom: 32 },
  copy: { color: "#475569", lineHeight: 21 },
  error: { color: "#b91c1c", fontWeight: "700" },
  growCard: {
    alignItems: "center",
    backgroundColor: "white",
    borderColor: "#dbe5d4",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14
  },
  growName: { color: "#172317", fontSize: 17, fontWeight: "900" },
  meta: { color: "#64748b", marginTop: 4 },
  action: { color: "#166534", fontWeight: "900" }
});
