import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "../../components/ScreenContainer.js";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import { useNavigation } from "@react-navigation/native";

const TOOL_ITEMS = [
  {
    id: "validation",
    icon: "file-search-outline",
    title: "Validation reports",
    description: "Upload lab data or PDF to get a clean customer-facing summary.",
    cta: "Generate"
  },
  {
    id: "coa",
    icon: "flask-outline",
    title: "COA context",
    description: "Explain potency, testing scope, and limits with plain language.",
    cta: "Explain COA"
  },
  {
    id: "suppliers",
    icon: "account-group-outline",
    title: "Supplier discovery",
    description: "Track suppliers you trust and note why they stay approved.",
    cta: "Open list"
  },
  {
    id: "courses",
    icon: "school-outline",
    title: "Course publisher",
    description: "Draft, price, and submit a course for approval.",
    cta: "Start course"
  },
  {
    id: "reports",
    icon: "file-chart-outline",
    title: "Reports & exports",
    description: "Validation, COA explanations, and sales exports (stub).",
    cta: "Open"
  }
];

const ToolCard = ({ icon, title, description, onPress, cta }) => (
  <TouchableOpacity style={styles.toolCard} onPress={onPress}>
    <View style={styles.iconWrap}>
      {/* @ts-ignore */}
      <MaterialCommunityIcons name={icon} size={22} color={Colors.primary} />
    </View>
    <View style={styles.toolBody}>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDescription}>{description}</Text>
    </View>
    <Text style={styles.toolCta}>{cta}</Text>
  </TouchableOpacity>
);

export default function CommercialToolsScreen() {
  const navigation = useNavigation();
  const handleStub = (title) => {
    Alert.alert(title, "This tool opens a focused workflow. Stubbed for now.");
  };

  const handleNav = (tool) => {
    if (tool.id === "reports") {
      navigation.navigate("CommercialReports");
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={styles.scrollContent}>
      <Card style={styles.headerCard}>
        <Text style={styles.headerTitle}>Commercial tools</Text>
        <Text style={styles.headerSubtitle}>
          Use focused workflows that produce customer-ready outputs instead of roadmap
          promises.
        </Text>
      </Card>

      <Card style={styles.toolsCard}>
        <Text style={styles.sectionTitle}>Launchers</Text>
        <View style={styles.toolsGrid}>
          {TOOL_ITEMS.map((tool) => (
            <ToolCard
              key={tool.id}
              icon={tool.icon}
              title={tool.title}
              description={tool.description}
              cta={tool.cta}
              onPress={() =>
                tool.id === "reports" ? handleNav(tool) : handleStub(tool.title)
              }
            />
          ))}
        </View>
        <View style={styles.emptyMessageWrap}>
          <MaterialCommunityIcons
            name="information-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyMessage}>
            If a tool is missing, add it here as soon as you have a real workflow.
          </Text>
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xl
  },
  headerCard: {
    gap: Spacing.sm
  },
  headerTitle: {
    fontSize: Typography.size.h2,
    fontWeight: 700,
    color: Colors.text
  },
  headerSubtitle: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary
  },
  toolsCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md
  },
  sectionTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: 600,
    color: Colors.text
  },
  toolsGrid: {
    gap: Spacing.sm
  },
  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: 14,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: Colors.border
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm
  },
  toolBody: {
    flex: 1,
    gap: 4
  },
  toolTitle: {
    fontSize: Typography.size.body,
    fontWeight: 600,
    color: Colors.text
  },
  toolDescription: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  toolCta: {
    fontSize: Typography.size.caption,
    fontWeight: 600,
    color: Colors.primary,
    marginLeft: Spacing.sm
  },
  emptyMessageWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs
  },
  emptyMessage: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  }
});
