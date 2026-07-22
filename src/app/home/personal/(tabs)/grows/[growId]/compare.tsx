import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam } from "@/features/grows/routeUtils";
import RunComparisonWorkspace from "@/features/personal/tools/RunComparisonWorkspace";

export default function GrowCompareScreen() {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#475569", lineHeight: 20 }
});
