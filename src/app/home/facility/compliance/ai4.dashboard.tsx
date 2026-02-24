import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useFacilityReport } from "@/hooks/useFacilityReport";

export default function FacilityComplianceAiDashboardRoute() {
  const { data, isLoading, error } = useFacilityReport();
  const summary = useMemo(() => data ?? {}, [data]);

  if (isLoading)
    return (
      <View style={styles.container}>
        <Text>Loading AI dashboard...</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.container}>
        <Text>Failed to load AI dashboard.</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Compliance AI Dashboard</Text>
      <Text style={styles.sub}>
        Live report-derived status for compliance operations.
      </Text>
      <View style={styles.card}>
        <Text selectable style={styles.json}>
          {JSON.stringify(summary, null, 2)}
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
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff"
  },
  json: { fontFamily: "monospace", fontSize: 12 }
});
