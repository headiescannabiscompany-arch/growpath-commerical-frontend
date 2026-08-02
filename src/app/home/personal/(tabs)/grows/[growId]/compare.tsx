import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam } from "@/features/grows/routeUtils";
import RunComparisonWorkspace from "@/features/personal/tools/RunComparisonWorkspace";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

export const createGrowCompareStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 40, gap: 14 },
    title: { color: palette.text, fontSize: 24, fontWeight: "800" },
    subtitle: { color: palette.textMuted, lineHeight: 20 }
  });

export default function GrowCompareScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGrowCompareStyles(palette), [palette]);
  const { growId: rawGrowId } = useLocalSearchParams<{
    growId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Run Comparison</Text>
      <Text style={styles.subtitle}>
        Use this grow as the starting reference, select other saved grows, and compare
        only matching recorded evidence.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_compare"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="compare" />
      <RunComparisonWorkspace initialGrowId={growId} />
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_compare"
        longContent
      />
    </ScrollView>
  );
}
