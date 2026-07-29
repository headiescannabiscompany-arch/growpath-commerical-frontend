import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";

const LIBRARY = [
  [
    "NPK calculator",
    "Guaranteed-analysis, elemental, and ppm calculations.",
    "/home/commercial/tools/npk"
  ],
  [
    "Soil / media builder",
    "Build reusable soil and media recipes.",
    "/home/commercial/tools/soil-builder"
  ],
  [
    "Dry amendment mode",
    "Scale dry amendment mixes from the shared recipe engine.",
    "/home/commercial/tools/dry-amendment-mix"
  ],
  [
    "Ingredient catalog",
    "Review known products and verified guaranteed analyses.",
    "/home/commercial/tools/ingredient-library"
  ]
] as const;

export default function CommercialToolLibrary() {
  const router = useRouter();
  return (
    <AppPage
      routeKey="commercial-tool-library"
      header={
        <View>
          <Text style={styles.title}>Commercial Tool Library</Text>
          <Text style={styles.subtitle}>
            Reusable calculators and reference data. Grow lifecycle workflows stay with
            their commercial records.
          </Text>
        </View>
      }
    >
      <View style={styles.grid}>
        {LIBRARY.map(([title, description, href]) => (
          <AppCard key={href} style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <Pressable style={styles.button} onPress={() => router.push(href as any)}>
              <Text style={styles.buttonText}>Open</Text>
            </Pressable>
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
  description: { color: "#475569", lineHeight: 19 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" }
});
