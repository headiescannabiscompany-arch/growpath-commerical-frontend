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
      {/* TODO: Add integration options for Instagram, Facebook, Shopify, etc. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151" }
});
