import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import RunComparisonWorkspace from "@/features/personal/tools/RunComparisonWorkspace";

function firstParam(value?: string | string[]) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] || "" : "";
}

export default function RunComparisonToolRoute() {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#475569", lineHeight: 20 }
});
