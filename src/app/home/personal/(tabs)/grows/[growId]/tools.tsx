import React, { useMemo } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { coerceParam } from "./utils";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B", marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    padding: 12,
    marginTop: 10
  },
  cardTitle: { fontWeight: "700" },
  cardText: { color: "#475569", marginTop: 4 },
  action: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  actionText: { fontWeight: "700", color: "#0F172A" }
});

function withGrow(path: string, growId: string) {
  return `${path}?growId=${encodeURIComponent(growId)}`;
}

export default function GrowToolsScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grow Tools</Text>
      <Text style={styles.subtitle}>Run tools in this grow context and save outputs.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Open full tools hub</Text>
        <Text style={styles.cardText}>All tool groups are available with this grow pre-selected.</Text>
        <Link href={withGrow("/home/personal/tools", growId)} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Open tools hub</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick tools</Text>
        <Text style={styles.cardText}>Jump directly to common workflows.</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Link href={withGrow("/home/personal/tools/vpd", growId)} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>VPD</Text>
            </Pressable>
          </Link>
          <Link href={withGrow("/home/personal/tools/watering", growId)} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>Watering</Text>
            </Pressable>
          </Link>
          <Link href={withGrow("/home/personal/tools/npk", growId)} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>NPK Preview</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
