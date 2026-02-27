import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { listToolRuns } from "@/api/toolRuns";
import { coerceParam, fmtDate } from "./utils";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B" },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  heading: { fontWeight: "700" },
  meta: { color: "#64748B", marginTop: 4, fontSize: 12 }
});

export default function GrowCompareScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!growId) {
      setRuns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listToolRuns({ growId });
      setRuns(Array.isArray(rows) ? rows : []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Compare</Text>
      <Text style={styles.subtitle}>
        Run-to-run comparison scaffold. Start by reviewing recent tool runs.
      </Text>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : runs.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.meta}>No tool runs saved for this grow yet.</Text>
        </View>
      ) : (
        runs.slice(0, 10).map((run) => (
          <View key={String(run?._id || run?.id || Math.random())} style={styles.card}>
            <Text style={styles.heading}>{run?.toolType || "Tool run"}</Text>
            <Text style={styles.meta}>Saved: {fmtDate(run?.createdAt)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
