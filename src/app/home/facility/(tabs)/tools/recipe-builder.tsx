import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { radius } from "@/theme/theme";

const WORKFLOWS = [
  {
    title: "NPK recipe calculator",
    description: "Build a target nutrient ratio from products and guaranteed analysis.",
    href: "/home/facility/tools/npk"
  },
  {
    title: "Soil and medium builder",
    description: "Plan a starting soil or medium recipe for a grow or batch.",
    href: "/home/facility/tools/soil-builder"
  },
  {
    title: "Feeding schedule",
    description: "Turn the selected recipe into real feed and recheck tasks.",
    href: "/home/facility/tools/feeding-schedule"
  },
  {
    title: "Dry amendment / topdress",
    description:
      "Use the shared release and compatibility engine for amendments and scheduled applications.",
    href: "/home/facility/tools/dry-amendment-mix"
  },
  {
    title: "Ingredient catalog",
    description:
      "Reuse verified guaranteed analysis and nutrient forms across facility recipes.",
    href: "/home/facility/tools/ingredient-library"
  }
];

export default function FacilityRecipeBuilder() {
  const router = useRouter();
  return (
    <ScreenBoundary
      title="Recipes and feeding"
      showBack
      backFallbackHref="/home/facility/ai-ask"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Recipes and feeding</Text>
        <Text style={styles.subtitle}>
          One workflow for ingredients, NPK targets, soil or medium setup, and the tasks
          that put a recipe into use.
        </Text>
        {WORKFLOWS.map((workflow) => (
          <Pressable
            key={workflow.href}
            style={styles.card}
            onPress={() => router.push(workflow.href as any)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{workflow.title}</Text>
              <Text style={styles.cardText}>{workflow.description}</Text>
            </View>
            <Text style={styles.open}>Open</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f6f7f2", gap: 12, padding: 16, paddingBottom: 32 },
  title: { color: "#172317", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#4b5a4b", fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: {
    alignItems: "center",
    backgroundColor: "white",
    borderColor: "#d7ddd2",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  cardTitle: { color: "#172317", fontSize: 17, fontWeight: "900" },
  cardText: { color: "#64748b", fontSize: 13, lineHeight: 19, marginTop: 4 },
  open: { color: "#166534", fontWeight: "900" }
});
