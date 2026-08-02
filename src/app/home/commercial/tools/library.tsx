import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialToolLibraryStyles(palette), [palette]);

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

export function createCommercialToolLibraryStyles(palette: ThemePalette) {
  return StyleSheet.create({
    title: { color: palette.text, fontSize: 26, fontWeight: "900" },
    subtitle: {
      color: palette.textMuted,
      lineHeight: 20,
      marginTop: 6,
      maxWidth: 760
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: { flexBasis: 280, flexGrow: 1, gap: 8, minWidth: 250 },
    cardTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    description: { color: palette.textMuted, lineHeight: 19 },
    button: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 9
    },
    buttonText: { color: palette.accentText, fontWeight: "800" }
  });
}
