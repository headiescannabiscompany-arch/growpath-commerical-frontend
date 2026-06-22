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
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Available now</Text>
        <Text style={styles.statusText}>
          Use GrowPath marketplace, storefront, products, links, campaigns, orders, and
          inventory tools to manage commercial sales from the app.
        </Text>
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>External channels</Text>
        <Text style={styles.statusText}>
          Instagram, Facebook, and Shopify connections require approved partner
          credentials before GrowPath can sync or publish external account data.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151" },
  statusCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff"
  },
  statusTitle: { fontSize: 16, fontWeight: "700", color: "#1e3a8a", marginBottom: 6 },
  statusText: { fontSize: 14, color: "#1f2937", lineHeight: 20 }
});
