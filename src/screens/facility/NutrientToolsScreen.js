import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";

/**
 * Nutrient Tools Dashboard
 * Consolidates all nutrient management features:
 * - Label scanning & OCR extraction
 * - AI feeding schedule generation
 * - Nutrient deficiency guides
 * - Certified ingredient database
 */

const NutrientToolsScreen = ({ navigation }) => {
  const [selectedTool, setSelectedTool] = useState(null);

  const tools = [
    {
      id: "label-scanner",
      title: "Label Scanner",
      description: "Scan nutrient bottle labels to extract NPK values and product info",
      icon: "barcode-scan",
      color: "#E8F5E9",
      action: () => navigation.navigate("FeedingLabel"),
      badge: "AI Powered"
    },
    {
      id: "feeding-schedule",
      title: "Feeding Schedule",
      description: "Generate AI-optimized feeding schedules for your nutrients",
      icon: "calendar-check",
      color: "#E3F2FD",
      action: () => navigation.navigate("FeedingScheduleOptions"),
      badge: "Recommended"
    },
    {
      id: "diagnosis",
      title: "Plant Diagnosis",
      description: "Analyze plant health with full environment & nutrient data",
      icon: "stethoscope",
      color: "#FCE4EC",
      action: () => navigation.navigate("Diagnose"),
      badge: "AI Analysis"
    },
    {
      id: "certified-products",
      title: "Certified Products",
      description: "Search database of certified nutrient brands and suppliers",
      icon: "database-search",
      color: "#FFF3E0",
      action: () => navigation.navigate("VendorGuides"),
      badge: "Premium"
    },
    {
      id: "deficiency-guide",
      title: "Deficiency Guide",
      description: "Visual guide to identify & fix nutrient deficiencies",
      icon: "book-open-variant",
      color: "#F3E5F5",
      action: () => navigation.navigate("Diagnose"),
      badge: "Reference"
    },
    {
      id: "mixing-calculator",
      title: "Mixing Calculator",
      description: "Calculate nutrient quantities for your tank size & strength",
      icon: "flask-beaker",
      color: "#E0F2F1",
      action: () => navigation.navigate("NutrientCalculator"),
      badge: "Utility"
    }
  ];

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="leaf" size={40} color={Colors.primary} />
          <Text style={styles.title}>Nutrient Tools</Text>
          <Text style={styles.subtitle}>
            Manage NPK, feeding schedules, and plant diagnostics
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Tools Ready</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>AI</Text>
            <Text style={styles.statLabel}>Powered</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Certified</Text>
          </View>
        </View>

        {/* Tools Grid */}
        <View style={styles.toolsContainer}>
          {tools.map((tool) => (
            <TouchableOpacity key={tool.id} onPress={tool.action} activeOpacity={0.7}>
              <Card style={[styles.toolCard, { backgroundColor: tool.color }]}>
                <View style={styles.toolHeader}>
                  {(() => {
                    const iconName = tool.icon;
                    return (
                      <MaterialCommunityIcons
                        // @ts-ignore
                        // @ts-ignore
                        name={iconName}
                        size={32}
                        color={Colors.primary}
                        style={styles.toolIcon}
                      />
                    );
                  })()}
                  <View style={[styles.badge, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.badgeText}>{tool.badge}</Text>
                  </View>
                </View>

                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolDescription}>{tool.description}</Text>

                <View style={styles.toolFooter}>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <Card style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={Colors.primary}
          />
          <Text style={styles.infoTitle}>About Nutrient Tools</Text>
          <Text style={styles.infoText}>
            Use the Label Scanner to capture nutrient products in your facility. Our AI
            extracts NPK ratios and generates feeding schedules optimized for your growing
            method.
          </Text>
          <Text style={styles.infoText}>
            All tools are certified and tested by professional cultivators. Data is stored
            securely and synced across your facility.
          </Text>
        </Card>

        <View style={styles.spacer} />
      </ScrollView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md
  },
  title: {
    fontSize: Typography.size.h1,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: Spacing.sm
  },
  subtitle: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: "center"
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.lg
  },
  statBox: {
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    minWidth: "28%",
    boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
    elevation: 3
  },
  statValue: {
    fontSize: Typography.size.h2,
    fontWeight: "bold",
    color: Colors.primary
  },
  statLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  toolsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.md
  },
  toolCard: {
    width: "48%",
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    overflow: "hidden"
  },
  toolHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm
  },
  toolIcon: {
    marginBottom: Spacing.sm
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 8
  },
  badgeText: {
    fontSize: Typography.size.caption,
    color: "#FFF",
    fontWeight: "600"
  },
  toolTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: Spacing.xs
  },
  toolDescription: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm
  },
  toolFooter: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  infoCard: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: "#F0F4FF",
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary
  },
  infoTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm
  },
  infoText: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm
  },
  spacer: {
    height: Spacing.lg * 2
  }
});

export default NutrientToolsScreen;
