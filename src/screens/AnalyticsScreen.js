import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { personalFeatures, personalToolFeatures } from "../config/featureStatus";
import { useEntitlements } from "../entitlements";

const STATUS_LABELS = {
  implemented: "Ready",
  beta: "Beta",
  coming_soon: "Queued",
  hidden: "Hidden"
};

function countByStatus(features) {
  return features.reduce((acc, feature) => {
    acc[feature.status] = (acc[feature.status] || 0) + 1;
    return acc;
  }, {});
}

export default function AnalyticsScreen() {
  const entitlements = useEntitlements();
  const features = useMemo(
    () => [...Object.values(personalFeatures), ...personalToolFeatures],
    []
  );
  const statusCounts = useMemo(() => countByStatus(features), [features]);
  const enabledCapabilities = Object.values(entitlements.capabilities || {}).filter(
    Boolean
  ).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Operational snapshot for the current account and enabled product surface.
      </Text>

      <View style={styles.grid}>
        <Metric label="Plan" value={entitlements.plan || "free"} />
        <Metric label="Mode" value={entitlements.mode || "personal"} />
        <Metric label="Capabilities" value={String(enabledCapabilities)} />
        <Metric label="Tool Surface" value={String(personalToolFeatures.length)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Readiness</Text>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <View key={status} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{statusCounts[status] || 0}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Beta Surfaces</Text>
        {features
          .filter((feature) => feature.status === "beta")
          .slice(0, 8)
          .map((feature) => (
            <View key={feature.key} style={styles.featureRow}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.06)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  }
});

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#F9FAFB"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 16
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16
  },
  metric: {
    minWidth: 132,
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    ...shadow
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    textTransform: "capitalize"
  },
  metricLabel: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...shadow
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  rowLabel: {
    color: "#374151",
    fontWeight: "700"
  },
  rowValue: {
    color: "#111827",
    fontWeight: "800"
  },
  featureRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  featureTitle: {
    color: "#111827",
    fontWeight: "800"
  },
  featureDescription: {
    color: "#64748B",
    marginTop: 3
  }
});
