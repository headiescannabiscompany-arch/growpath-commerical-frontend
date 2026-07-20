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
  const libraryHref = `${basePath}/ingredient-library${query ? `?${query}` : ""}` as Href;
  return (
    <ScreenBoundary title="Soil & Nutrient Mix Builders" showBack>
      <View style={styles.body}>
        <Text style={styles.heading}>What are you building?</Text>
        <Text style={styles.intro}>
          Choose one focused workflow. These are the only two primary mix builders; they
          use different inputs and produce different plans.
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
        <View style={styles.supportSection}>
          <Text style={styles.supportHeading}>Reusable products and labels</Text>
          <Text style={styles.supportText}>
            Save guaranteed analyses, nutrient forms, label evidence, density, release
            timing, and costs once, then reuse them in either builder. This library stores
            inputs; it is not a third mix builder.
          </Text>
          <Link href={libraryHref} asChild>
            <Pressable style={styles.supportLink} accessibilityRole="button">
              <Text style={styles.supportLinkText}>Open Products & Label Library</Text>
            </Pressable>
          </Link>
        </View>
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
  description: { color: "#475569", lineHeight: 19 },
  supportSection: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginTop: 6,
    paddingTop: 16,
    gap: 7
  },
  supportHeading: { color: "#334155", fontSize: 15, fontWeight: "800" },
  supportText: { color: "#64748B", lineHeight: 19 },
  supportLink: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 3
  },
  supportLinkText: { color: "#166534", fontWeight: "800" }
});
