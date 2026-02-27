import React, { useMemo } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B" },
  context: {
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    padding: 10,
    marginTop: 12
  },
  contextText: { color: "#166534", fontWeight: "700" },
  grid: { gap: 12, marginTop: 12 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC"
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#475569" },
  link: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#166534" }
});

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function hrefWithGrow(path: string, growId: string) {
  return growId ? `${path}?growId=${encodeURIComponent(growId)}` : path;
}

export default function ToolsHubScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>
          Run calculators, get recommendations, and save outputs to a grow.
        </Text>
        {growId ? (
          <View style={styles.context}>
            <Text style={styles.contextText}>Grow context active: {growId}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment: VPD Calculator</Text>
          <Text style={styles.cardDesc}>Estimate VPD from temperature and humidity.</Text>
          <Link href={hrefWithGrow("/home/personal/tools/vpd", growId)} style={styles.link} asChild>
            <Text>Open VPD -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment: Dew Point Guard</Text>
          <Text style={styles.cardDesc}>
            Estimate lights-off dew point spike risk and save mitigation recommendations.
          </Text>
          <Link
            href={hrefWithGrow("/home/personal/tools/dew-point-guard", growId)}
            style={styles.link}
            asChild
          >
            <Text>Open Dew Point Guard -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment: PPFD / DLI Planner</Text>
          <Text style={styles.cardDesc}>
            Estimate PPFD requirements from target DLI and photoperiod.
          </Text>
          <Link href={hrefWithGrow("/home/personal/tools/ppfd", growId)} style={styles.link} asChild>
            <Text>Open PPFD / DLI -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Water/Nutrients: NPK Label Ratio (Preview)</Text>
          <Text style={styles.cardDesc}>
            Preview label ratio only. This is not a full nutrient ppm calculator.
          </Text>
          <Link href={hrefWithGrow("/home/personal/tools/npk", growId)} style={styles.link} asChild>
            <Text>Open NPK Preview -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ops/Planning: Watering Planner</Text>
          <Text style={styles.cardDesc}>
            Plan watering cadence and estimate next watering volume.
          </Text>
          <Link
            href={hrefWithGrow("/home/personal/tools/watering", growId)}
            style={styles.link}
            asChild
          >
            <Text>Open Watering -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Environment: Bud Rot Risk</Text>
          <Text style={styles.cardDesc}>
            Snapshot mold pressure from RH, airflow score, and wet events.
          </Text>
          <Link
            href={hrefWithGrow("/home/personal/tools/bud-rot-risk", growId)}
            style={styles.link}
            asChild
          >
            <Text>Open Bud Rot Risk -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ops/Planning: Crop Steering</Text>
          <Text style={styles.cardDesc}>
            Basic steering scaffold for runoff and irrigation shot planning.
          </Text>
          <Link
            href={hrefWithGrow("/home/personal/tools/crop-steering", growId)}
            style={styles.link}
            asChild
          >
            <Text>Open Crop Steering -&gt;</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI: Issue Diagnosis</Text>
          <Text style={styles.cardDesc}>
            Diagnose issues from text and photos as part of the tools workflow.
          </Text>
          <Link href="/home/personal/diagnose" style={styles.link} asChild>
            <Text>Open Diagnose -&gt;</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}
