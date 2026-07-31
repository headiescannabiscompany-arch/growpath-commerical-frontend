import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";
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
    "Soil & Nutrient Mix Builders",
    "Choose the science-based soil or nutrient mix workflow from the shared calculation engine.",
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
  ["Nutrient Mix Builder", "/home/facility/tools/npk"],
  ["Soil Mix Builder", "/home/facility/tools/soil-builder"],
  ["Ingredient catalog", "/home/facility/tools/ingredient-library"]
] as const;

export default function FacilityAiToolsRoute() {
  const router = useRouter();
  const { selectedId: facilityId, selected: facility } = useFacility();
  const { palette } = useAppTheme();
  return (
    <AppPage
      routeKey="facility-ai-tools"
      railOverride={null}
      header={
        <View>
          <Text style={[styles.title, { color: palette.text }]}>
            Facility Grow Intelligence
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>
            Shared AI and calculation capabilities. Lifecycle work stays attached to its
            room, grow, batch, or production record.
          </Text>
        </View>
      }
    >
      <TokenBalanceWidget
        workspaceType="facility"
        facilityId={String(facilityId || "")}
        workspaceName={String(facility?.name || "Selected Facility")}
      />
      <View style={styles.grid}>
        {TOOLS.map(([title, description, href]) => (
          <AppCard key={href} style={styles.card}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>
            <Text style={[styles.description, { color: palette.textMuted }]}>
              {description}
            </Text>
            <Pressable
              style={[styles.button, { backgroundColor: palette.accent }]}
              onPress={() => router.push(href as any)}
            >
              <Text style={[styles.buttonText, { color: palette.accentText }]}>Open</Text>
            </Pressable>
          </AppCard>
        ))}
      </View>
      <Text style={[styles.section, { color: palette.textMuted }]}>Tool Library</Text>
      <View style={styles.library}>
        {LIBRARY.map(([title, href]) => (
          <Pressable
            key={href}
            style={[styles.libraryButton, { borderColor: palette.accent }]}
            onPress={() => router.push(href as any)}
          >
            <Text style={[styles.libraryText, { color: palette.accent }]}>{title}</Text>
          </Pressable>
        ))}
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "900" },
  subtitle: { lineHeight: 20, maxWidth: 760 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexBasis: 280,
    flexGrow: 1,
    gap: 8,
    minWidth: 250
  },
  cardTitle: { fontSize: 17, fontWeight: "900" },
  description: { lineHeight: 19 },
  button: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  buttonText: { fontWeight: "800" },
  section: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 12,
    textTransform: "uppercase"
  },
  library: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  libraryButton: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  libraryText: { fontWeight: "800" }
});
