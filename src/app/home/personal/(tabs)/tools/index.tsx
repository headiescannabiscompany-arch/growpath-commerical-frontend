import React, { useMemo } from "react";
import { Href, Link, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  FeatureArea,
  FeatureDefinition,
  getNavigablePersonalTools
} from "@/config/featureStatus";
import { useEntitlements } from "@/entitlements";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B" },
  context: {
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    padding: 10,
    marginTop: 12
  },
  contextText: { color: "#166534", fontWeight: "700" },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase"
  },
  grid: { gap: 10, marginTop: 10 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC"
  },
  cardLocked: { opacity: 0.65 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  beta: { fontSize: 12, color: "#92400E", fontWeight: "700" },
  locked: { fontSize: 12, color: "#991B1B", fontWeight: "700" },
  cardDesc: { fontSize: 14, color: "#475569" },
  link: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#166534" },
  lockedText: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#991B1B" }
});

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function hrefWithGrow(path: string, growId: string) {
  return growId ? `${path}?growId=${encodeURIComponent(growId)}` : path;
}

const AREA_ORDER: FeatureArea[] = [
  "environment",
  "water_nutrients",
  "plant_health",
  "crop_management",
  "planning_records",
  "genetics",
  "lab_tc",
  "integrations"
];

const AREA_LABELS: Record<FeatureArea, string> = {
  personal_navigation: "Navigation",
  environment: "Environment",
  water_nutrients: "Water & Nutrients",
  plant_health: "Plant Health & AI",
  crop_management: "Crop Management",
  planning_records: "Planning & Records",
  genetics: "Genetics & Selection",
  lab_tc: "Lab / Tissue Culture",
  integrations: "Integrations"
};

function ToolCard({
  tool,
  growId,
  enabled
}: {
  tool: FeatureDefinition;
  growId: string;
  enabled: boolean;
}) {
  const href = tool.acceptsGrowContext
    ? hrefWithGrow(tool.href || "", growId)
    : tool.href || "";

  return (
    <View style={[styles.card, !enabled && styles.cardLocked]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{tool.title}</Text>
        {tool.status === "beta" ? <Text style={styles.beta}>Beta</Text> : null}
        {!enabled ? <Text style={styles.locked}>Locked</Text> : null}
      </View>
      <Text style={styles.cardDesc}>{tool.description}</Text>
      {enabled ? (
        <Link href={href as Href} style={styles.link} asChild>
          <Text>Open</Text>
        </Link>
      ) : (
        <Text style={styles.lockedText}>Upgrade or enable capability</Text>
      )}
    </View>
  );
}

export default function ToolsHubScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const tools = useMemo(() => getNavigablePersonalTools(), []);
  const entitlements = useEntitlements();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools / AI</Text>
        <Text style={styles.subtitle}>
          Run calculators, get recommendations, and save outputs to a grow.
        </Text>
        {growId ? (
          <View style={styles.context}>
            <Text style={styles.contextText}>Grow context active: {growId}</Text>
          </View>
        ) : null}
      </View>

      {AREA_ORDER.map((area) => {
        const areaTools = tools.filter((tool) => tool.area === area);
        if (!areaTools.length) return null;

        return (
          <View key={area} style={styles.section}>
            <Text style={styles.sectionTitle}>{AREA_LABELS[area]}</Text>
            <View style={styles.grid}>
              {areaTools.map((tool) => (
                <ToolCard
                  key={tool.key}
                  tool={tool}
                  growId={growId}
                  enabled={!tool.capabilityKey || entitlements.can(tool.capabilityKey)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
