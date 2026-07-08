import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { personalToolFeatures } from "../config/featureStatus";
import { useEntitlements } from "../entitlements";
import { radius } from "../theme/theme";

export default function QAScreen() {
  const entitlements = useEntitlements();
  const diagnostics = useMemo(
    () => [
      ["Entitlements ready", entitlements.ready ? "Yes" : "No"],
      ["Bootstrap error", entitlements.bootstrapError || "None"],
      ["Mode", entitlements.mode || "personal"],
      ["Plan", entitlements.plan || "free"],
      ["Facility ID", entitlements.facilityId || "None"],
      ["Facility role", entitlements.facilityRole || "None"]
    ],
    [entitlements]
  );
  const enabledCapabilities = Object.entries(entitlements.capabilities || {}).filter(
    ([, enabled]) => Boolean(enabled)
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>QA & Debug Tools</Text>
      <Text style={styles.subtitle}>
        Runtime diagnostics for access, feature status, and release validation.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Runtime State</Text>
        {diagnostics.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enabled Capabilities</Text>
        {enabledCapabilities.length ? (
          enabledCapabilities.map(([key]) => (
            <Text key={key} style={styles.capability}>
              {key}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>
            No capability flags are enabled for this session.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tool Feature Status</Text>
        {personalToolFeatures.map((feature) => (
          <View key={feature.key} style={styles.featureRow}>
            <View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.internalNote}</Text>
            </View>
            <Text style={styles.status}>{feature.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const shadow = Platform.select({
  web: { boxShadow: "0px 2px 4px rgba(15, 23, 42, 0.06)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
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
  section: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
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
    gap: 12,
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
    flexShrink: 1,
    fontWeight: "800",
    textAlign: "right"
  },
  capability: {
    color: "#111827",
    fontWeight: "700",
    paddingVertical: 4
  },
  muted: {
    color: "#64748B"
  },
  featureRow: {
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 10
  },
  featureTitle: {
    color: "#111827",
    fontWeight: "800"
  },
  featureDescription: {
    color: "#64748B",
    marginTop: 3,
    maxWidth: 520
  },
  status: {
    color: "#1D4ED8",
    fontWeight: "800",
    textTransform: "capitalize"
  }
});
