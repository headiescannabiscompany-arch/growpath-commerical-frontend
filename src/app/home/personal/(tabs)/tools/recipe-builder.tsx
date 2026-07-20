import React from "react";
import { Link, type Href, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { radius } from "@/theme/theme";

const modes = [
  {
    title: "Nutrient Mix Builder",
    description:
      "Science-based guaranteed-analysis math, elemental P/K conversion, water and batch context, nutrient forms, release timing, and explicit uncertainty.",
    path: "npk"
  },
  {
    title: "Soil Mix Builder",
    description:
      "Science-based physical, chemical, and biological soil planning with base, compost, aeration, buffering, amendments, release timing, and test-data precedence.",
    path: "soil-builder"
  }
] as const;

type MixBuilderContextParams = {
  growId?: string | string[];
  plantId?: string | string[];
  facilityId?: string | string[];
  commercialAccountId?: string | string[];
  roomId?: string | string[];
  productId?: string | string[];
  productLineId?: string | string[];
  batchId?: string | string[];
  trialId?: string | string[];
  source?: string | string[];
  workspace?: string | string[];
};

export default function UnifiedRecipeBuilderRoute({
  basePath = "/home/personal/tools"
}: {
  basePath?: string;
} = {}) {
  const params = useLocalSearchParams<MixBuilderContextParams>();
  const contextQuery = new URLSearchParams();
  Object.entries(params).forEach(([key, rawValue]) => {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value) contextQuery.set(key, value);
  });
  const query = contextQuery.toString();
  return (
    <ScreenBoundary title="Soil & Nutrient Mix Builders" showBack>
      <View style={styles.body}>
        <Text style={styles.heading}>Choose one builder</Text>
        <Text style={styles.intro}>
          These are the two canonical mix tools. Both use deterministic calculations,
          preserve source and assumption limits, and defer to verified labels, laboratory
          results, and measured grow evidence.
        </Text>
        {modes.map((mode) => {
          const href = `${basePath}/${mode.path}${query ? `?${query}` : ""}` as Href;
          return (
            <Link key={mode.title} href={href} asChild>
              <Pressable style={styles.card} accessibilityRole="button">
                <Text style={styles.title}>{mode.title}</Text>
                <Text style={styles.description}>{mode.description}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12 },
  heading: { color: "#0F172A", fontSize: 20, fontWeight: "800" },
  intro: { color: "#475569", lineHeight: 21, marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#F8FAFC"
  },
  title: { color: "#0F172A", fontWeight: "800", marginBottom: 5 },
  description: { color: "#475569", lineHeight: 19 }
});
