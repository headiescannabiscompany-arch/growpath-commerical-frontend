import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { AI_FEATURES, type AIFeature } from "@/features/ai/aiFeatureMatrix";

/**
 * AIToolsHomeScreen
 *
 * Card list showing all AI tools from the feature matrix.
 * Enabled cards: tappable, navigate to detail screen
 * Disabled cards: "Coming Soon" label
 *
 * Single source of truth: AI_FEATURES (aiFeatureMatrix.ts)
 * Add a new tool there → it appears here automatically.
 */

export default function AIToolsHomeScreen({
  facilityId,
  growId,
  onNavigate,
  onSelectGrow
}: {
  facilityId: string;
  growId: string;
  onNavigate: (screen: string, params: { facilityId: string; growId: string }) => void;
  onSelectGrow?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>AI Tools</Text>
      <Text style={styles.sub}>
        Run analysis on your grow for harvest timing, climate, and nutrient
        recommendations
      </Text>

      <View style={styles.gap} />

      {!growId ? (
        <Pressable onPress={onSelectGrow} style={styles.selectGrowBtn}>
          <Text style={styles.selectGrowText}>Select Grow</Text>
        </Pressable>
      ) : null}

      {AI_FEATURES.map((feature) => (
        <ToolCard
          key={feature.id}
          feature={feature}
          facilityId={facilityId}
          growId={growId}
          onNavigate={onNavigate}
        />
      ))}

      <View style={styles.gap} />
    </ScrollView>
  );
}

function ToolCard({
  feature,
  facilityId,
  growId,
  onNavigate
}: {
  feature: AIFeature;
  facilityId: string;
  growId: string;
  onNavigate: (screen: string, params: { facilityId: string; growId: string }) => void;
}) {
  // Check: feature enabled + all required context present
  const canRun =
    feature.enabled &&
    (!feature.requires.facilityId || !!facilityId) &&
    (!feature.requires.growId || !!growId);

  const handlePress = () => {
    if (!canRun) return;
    onNavigate(feature.screen, { facilityId, growId });
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!canRun}
      style={[styles.card, !canRun && styles.cardDisabled]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.label}>{feature.label}</Text>
          <Text style={styles.desc}>{feature.description}</Text>
        </View>
        {!feature.enabled && <Text style={styles.badge}>Coming Soon</Text>}
        {feature.enabled && feature.requires.growId && !growId && (
          <Text style={styles.badge}>Select Grow</Text>
        )}
      </View>
      {canRun && <Text style={styles.arrow}>→</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 24, fontWeight: "800", marginBottom: 4 },
  sub: { fontSize: 14, opacity: 0.7, marginBottom: 8, lineHeight: 18 },
  gap: { height: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  cardDisabled: {
    backgroundColor: "#F9FAFB",
    opacity: 0.6
  },
  cardHeader: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  cardTitle: {
    flex: 1
  },
  label: { fontWeight: "700", fontSize: 15, marginBottom: 4 },
  desc: { fontSize: 13, opacity: 0.6, lineHeight: 16 },
  arrow: { fontSize: 18, opacity: 0.5 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#E5E7EB",
    color: "#6B7280",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    flexShrink: 0
  },
  selectGrowBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12
  },
  selectGrowText: { fontWeight: "800", opacity: 0.8 }
});
