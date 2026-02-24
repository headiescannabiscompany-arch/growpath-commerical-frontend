import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";

function ToolCard({ title, subtitle, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function CommercialToolsScreen({ navigation }) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Commercial Tools</Text>
        <Text style={styles.subtitle}>
          Operate your storefront, outreach, and growth tools from one place.
        </Text>

        <ToolCard
          title="Social Media"
          subtitle="Plan and run social campaigns."
          onPress={() => navigation.navigate("SocialTools")}
        />
        <ToolCard
          title="Marketplace Integrations"
          subtitle="Connect channels and sync your listings."
          onPress={() => navigation.navigate("MarketplaceIntegration")}
        />
        <ToolCard
          title="Advertising"
          subtitle="Review ad channels and budget allocation."
          onPress={() => navigation.navigate("Advertising")}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, color: "#475569", marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff"
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: "#64748b" }
});
