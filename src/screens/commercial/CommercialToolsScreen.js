import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { radius } from "../../theme/theme";

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
          Operate storefront, content, product education, and external-link workflows from
          one place.
        </Text>

        <ToolCard
          title="External Channels"
          subtitle="Schedule off-platform posts; use Feed / Campaigns for in-app outreach."
          onPress={() => navigation.navigate("SocialTools")}
        />
        <ToolCard
          title="Storefront Offers"
          subtitle="Manage public products, courses, lives, and customer-facing offer cards."
          onPress={() => navigation.navigate("Storefront")}
        />
        <ToolCard
          title="Feed / Campaigns"
          subtitle="Create in-app outreach placements for products, courses, lives, and storefronts."
          onPress={() => navigation.navigate("Feed")}
        />
        <ToolCard
          title="Marketing Planner"
          subtitle="Plan product drops, course announcements, feed campaigns, and external links."
          onPress={() => navigation.navigate("MarketingPlanner")}
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
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#fff"
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: "#64748b" }
});
