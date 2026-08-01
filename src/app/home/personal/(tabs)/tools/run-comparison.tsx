import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import RunComparisonWorkspace from "@/features/personal/tools/RunComparisonWorkspace";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

function firstParam(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

export default function RunComparisonToolRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createRunComparisonRouteStyles(palette), [palette]);
  const { growId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const initialGrowId = firstParam(growId);
  return (
    <ScreenBoundary
      title="Run-To-Run Comparison"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Run-To-Run Comparison</Text>
        <Text style={styles.subtitle}>
          Compare two to five owned saved grow histories using their real evidence,
          equivalent scopes, and explicit decision goals.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_run_comparison"
          longContent
        />
        <RunComparisonWorkspace initialGrowId={initialGrowId} />
        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_run_comparison"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

export const createRunComparisonRouteStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 40, gap: 14 },
    title: { color: palette.text, fontSize: 24, fontWeight: "800" },
    subtitle: { color: palette.textMuted, lineHeight: 20 }
  });
