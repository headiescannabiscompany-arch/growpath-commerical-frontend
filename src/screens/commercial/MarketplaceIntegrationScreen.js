import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MarketplaceIntegrationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Marketplace & Social Integrations</Text>
      <Text style={styles.info}>
        Connect your vendor account to social media and marketplace platforms for enhanced
        reach and sales.
      </Text>
      <View style={styles.plannedCard}>
        <Text style={styles.plannedTitle}>Planned for Post-v1</Text>
        <Text style={styles.plannedText}>
          Instagram, Facebook, and Shopify integrations are not active in this release.
          This screen is intentionally read-only until backend marketplace endpoints are
          contract-frozen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151" },
  plannedCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff"
  },
  plannedTitle: { fontSize: 16, fontWeight: "700", color: "#1e3a8a", marginBottom: 6 },
  plannedText: { fontSize: 14, color: "#1f2937", lineHeight: 20 }
});
