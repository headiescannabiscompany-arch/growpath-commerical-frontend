import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import { radius } from "@/theme/theme";

const TOOLS = [
  [
    "Ask AI",
    "Use facility and grow context in a continuing conversation.",
    "/home/facility/ai-ask"
  ],
  [
    "Plant Diagnose",
    "Review plant media and operational evidence together.",
    "/home/facility/ai-diagnosis-photo"
  ],
  [
    "Recipe Builder",
    "Build nutrient and media recipes from the shared calculation engine.",
    "/home/facility/tools/recipe-builder"
  ],
  [
    "Environment Review",
    "Review environmental readings, risk, and next checks.",
    "/home/facility/tools/environment"
  ],
  [
    "Saved Runs / Reports",
    "Open facility reports and saved operational records.",
    "/home/facility/reports"
  ]
] as const;

const LIBRARY = [
  ["NPK calculator", "/home/facility/tools/npk"],
  ["Soil / media builder", "/home/facility/tools/soil-builder"],
  ["Ingredient catalog", "/home/facility/tools/ingredient-library"]
] as const;

export default function FacilityAiToolsRoute() {
  const router = useRouter();
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Facility Grow Intelligence</Text>
      <Text style={styles.subtitle}>
        Shared AI and calculation capabilities. Lifecycle work stays attached to its room,
        grow, batch, or production record.
      </Text>
      <TokenBalanceWidget />
      <View style={styles.grid}>
        {TOOLS.map(([title, description, href]) => (
          <View key={href} style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <Pressable style={styles.button} onPress={() => router.push(href as any)}>
              <Text style={styles.buttonText}>Open</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Text style={styles.section}>Tool Library</Text>
      <View style={styles.library}>
        {LIBRARY.map(([title, href]) => (
          <Pressable
            key={href}
            style={styles.libraryButton}
            onPress={() => router.push(href as any)}
          >
            <Text style={styles.libraryText}>{title}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  title: { color: "#111827", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#64748B", lineHeight: 20, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: 280,
    flexGrow: 1,
    gap: 8,
    padding: 16
  },
  cardTitle: { color: "#111827", fontSize: 17, fontWeight: "900" },
  description: { color: "#475569", lineHeight: 19 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  section: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    textTransform: "uppercase"
  },
  library: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  libraryButton: {
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  libraryText: { color: "#166534", fontWeight: "800" }
});
