import React from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { radius } from "@/theme/theme";

export default function FacilityAiToolsRoute() {
  const params = useLocalSearchParams<{
    recipeId?: string | string[];
    runId?: string | string[];
    toolRunId?: string | string[];
  }>();
  const linkedToolRunId = Array.isArray(params.toolRunId)
    ? params.toolRunId[0]
    : params.toolRunId;
  const linkedRunId = Array.isArray(params.runId) ? params.runId[0] : params.runId;
  const linkedRecipeId = Array.isArray(params.recipeId)
    ? params.recipeId[0]
    : params.recipeId;
  const sourceId = linkedToolRunId || linkedRunId || linkedRecipeId || "";

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>AI Tools</Text>
      <Text style={styles.sub}>Run assisted analysis with facility context.</Text>
      {sourceId ? (
        <View
          accessibilityLabel={`Linked facility tool run ${sourceId}`}
          style={styles.contextCard}
        >
          <Text style={styles.contextTitle}>Linked ToolRun / recipe</Text>
          <Text style={styles.contextBody}>{sourceId}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.title}>Ask AI</Text>
        <Text style={styles.desc}>Run a structured tool/function call.</Text>
        <Link
          accessibilityRole="button"
          accessibilityLabel="Open Ask AI"
          href="/home/facility/ai-ask"
          style={styles.link}
        >
          Open
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Trichome Analysis</Text>
        <Text style={styles.desc}>Analyze photos and estimate harvest readiness.</Text>
        <Link
          accessibilityRole="button"
          accessibilityLabel="Open trichome analysis"
          href="/home/facility/ai-diagnosis-photo"
          style={styles.link}
        >
          Open
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>AI Templates</Text>
        <Text style={styles.desc}>Use prebuilt AI workflows for common tasks.</Text>
        <Link
          accessibilityRole="button"
          accessibilityLabel="Open AI templates"
          href="/home/facility/ai-template"
          style={styles.link}
        >
          Open
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>AI Validation Lab</Text>
        <Text style={styles.desc}>
          Verify, compare, feedback, and export endpoint checks.
        </Text>
        <Link
          accessibilityRole="button"
          accessibilityLabel="Open AI validation lab"
          href="/home/facility/ai-validation"
          style={styles.link}
        >
          Open
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75, marginBottom: 6 },
  contextCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  contextTitle: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  contextBody: {
    color: "#14532D",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#fff",
    gap: 6
  },
  title: { fontSize: 16, fontWeight: "800" },
  desc: { opacity: 0.75 },
  link: { fontWeight: "800", color: "#2563eb" }
});
