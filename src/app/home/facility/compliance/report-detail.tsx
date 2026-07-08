import React, { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacilityReport } from "@/hooks/useFacilityReport";
import { radius } from "@/theme/theme";

export default function FacilityComplianceReportDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data, isLoading, error } = useFacilityReport();

  const payload = useMemo(() => data ?? null, [data]);

  const renderBoundary = (children: React.ReactNode) => (
    <ScreenBoundary
      title="Compliance Report Detail"
      showBack
      backFallbackHref="/home/facility/compliance"
    >
      {children}
    </ScreenBoundary>
  );

  if (isLoading)
    return renderBoundary(
      <View style={styles.container}>
        <Text>Loading report...</Text>
      </View>
    );
  if (error)
    return renderBoundary(
      <View style={styles.container}>
        <Text>Failed to load report.</Text>
      </View>
    );

  return renderBoundary(
    <View style={styles.container}>
      <Text style={styles.h1}>Compliance Report Detail</Text>
      <Text style={styles.sub}>reportId: {String(id || "latest")}</Text>
      <View style={styles.card}>
        <Text selectable style={styles.json}>
          {JSON.stringify(payload, null, 2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.7 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#fff"
  },
  json: { fontFamily: "monospace", fontSize: 12 }
});
