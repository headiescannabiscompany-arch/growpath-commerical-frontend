import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";

const TOOLS = [
  {
    title: "Ask AI",
    description: "Ask cultivation and commercial workflow questions.",
    href: "/home/commercial/tools/ask-ai"
  },
  {
    title: "Plant Diagnose",
    description: "Review plant symptoms and evidence in context.",
    href: "/home/commercial/tools/diagnose"
  },
  {
    title: "Environment Review",
    description: "Review temperature, humidity, VPD, and environmental conditions.",
    href: "/home/commercial/tools/environment"
  },
  {
    title: "Soil & Nutrient Mix Builders",
    description:
      "Use the science-based soil or nutrient mix workflow with visible evidence and uncertainty.",
    href: "/home/commercial/tools/recipe-builder"
  },
  {
    title: "Soil & Nutrient Batch Planner",
    description:
      "Estimate production batch costs, bag counts, pull sheets, labor, packaging, and margin.",
    href: "/home/commercial/tools/soil-nutrient-batch"
  },
  {
    title: "Saved Runs / Reports",
    description: "Review and export commercial grow records and completed analyses.",
    href: "/home/commercial/tools/report"
  },
  {
    title: "Tool Library",
    description:
      "Open reusable nutrient, media, ingredient, and environment calculators.",
    href: "/home/commercial/tools/library"
  }
] as const;

export default function CommercialToolsIndex() {
  return (
    <AppPage
      routeKey="commercial-tools"
      header={
        <View>
          <Text style={styles.title}>Commercial Tools</Text>
          <Text style={styles.subtitle}>
            Start with grow intelligence here. Harvest, scheduling, and lifecycle
            workflows live inside the grow, trial, or batch they affect.
          </Text>
        </View>
      }
    >
      <TokenBalanceWidget />
      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <AppCard key={tool.href} style={styles.card}>
            <Text style={styles.cardTitle}>{tool.title}</Text>
            <Text style={styles.cardDescription}>{tool.description}</Text>
            <Link href={tool.href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${tool.title}`}
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              >
                <Text style={styles.buttonText}>Open tool</Text>
              </Pressable>
            </Link>
          </AppCard>
        ))}
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 20, marginTop: 6, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { flexBasis: 280, flexGrow: 1, gap: 8, minWidth: 250 },
  cardTitle: { color: "#111827", fontSize: 17, fontWeight: "900" },
  cardDescription: { color: "#475569", flexGrow: 1, lineHeight: 19 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" }
});
