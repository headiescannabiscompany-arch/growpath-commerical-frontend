import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import BackButton from "@/components/nav/BackButton";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

const requiredWork = [
  "Crop steering projects and saved runs",
  "P0 / P1 / P2 / P3 irrigation phase tracking",
  "Dryback, runoff, pore EC, input EC, and pH history",
  "Control comparisons and stop thresholds",
  "Automation triggers, grow-log links, and pheno score updates"
];

export default function CropSteeringToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Crop Steering</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Project workflow</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Use this workspace to review the crop-steering pieces that need live project
        records before they are saved into grow history.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Required before enabling</Text>
        {requiredWork.map((item) => (
          <View key={item} style={styles.requirementRow}>
            <View style={styles.dot} />
            <Text style={styles.requirementText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Save actions stay in the established grow tools until structured projects,
        reloads, ownership checks, timeline links, and mobile E2E coverage are complete.
      </Text>

      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => router.replace("/home/personal/tools")}
      >
        <Text style={styles.buttonText}>Back to Tools</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: "#FFFFFF",
    gap: 14
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  statusBadge: {
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFBEB"
  },
  statusText: { color: "#92400E", fontSize: 12, fontWeight: "800" },
  subtitle: { color: "#475569", lineHeight: 21 },
  context: { color: "#166534", fontWeight: "700" },
  panel: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 10
  },
  panelTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  requirementRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#64748B",
    marginTop: 7
  },
  requirementText: { flex: 1, color: "#334155", lineHeight: 20 },
  note: { color: "#64748B", lineHeight: 20, fontSize: 13 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" }
});
