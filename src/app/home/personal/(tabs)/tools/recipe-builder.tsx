import React from "react";
import { Link, type Href, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { radius } from "@/theme/theme";

const modes = [
  {
    title: "Feed / nutrient recipe",
    description:
      "Guaranteed analysis, elemental ppm, water baseline, EC/pH, mixing order, release timing, and K/Ca/Mg screening.",
    path: "npk"
  },
  {
    title: "Soil / media recipe",
    description:
      "Base, compost, aeration, amendments, carbon context, water-holding behavior, drainage, buffering, and cook timing.",
    path: "soil-builder"
  },
  {
    title: "Dry amendment / topdress",
    description:
      "Use the same ingredient and release engine for initial mixes or grow-stage topdress scheduling.",
    path: "dry-amendment-mix"
  },
  {
    title: "Ingredient catalog",
    description:
      "Store typed or label-derived guaranteed analysis and reuse verified products across recipes.",
    path: "ingredient-library"
  }
] as const;

export default function UnifiedRecipeBuilderRoute({
  basePath = "/home/personal/tools"
}: {
  basePath?: string;
} = {}) {
  const params = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = String(
    Array.isArray(params.growId) ? params.growId[0] || "" : params.growId || ""
  );
  return (
    <ScreenBoundary title="Soil & Nutrient Recipe Builder" showBack>
      <View style={styles.body}>
        <Text style={styles.intro}>
          One platform for ingredients, water, media behavior, nutrient math, release
          timing, compatibility, saved recipes, and grow applications.
        </Text>
        {modes.map((mode) => {
          const href =
            `${basePath}/${mode.path}${growId ? `?growId=${encodeURIComponent(growId)}` : ""}` as Href;
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
