import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listPersonalLogs } from "@/api/logs";
import { listToolRuns } from "@/api/toolRuns";
import { coerceParam, fmtDate, getRowId } from "./utils";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B" },
  cta: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC"
  },
  cardTitle: { fontWeight: "700", color: "#0F172A" },
  cardMeta: { color: "#64748B", marginTop: 4, fontSize: 12 },
  empty: { marginTop: 14, color: "#64748B" }
});

export default function GrowJournalScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!growId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [logs, runs] = await Promise.all([
        listPersonalLogs({ growId }),
        listToolRuns({ growId })
      ]);
      const merged = [
        ...(Array.isArray(logs)
          ? logs.map((log) => ({
              kind: "log" as const,
              id: getRowId(log) || `${log.date}-${log.title}`,
              at: log.date || log.createdAt,
              title: log.title || "Journal entry",
              subtitle: log.notes || "",
              raw: log
            }))
          : []),
        ...(Array.isArray(runs)
          ? runs.map((run) => ({
              kind: "run" as const,
              id: getRowId(run) || `${run.toolType}-${run.createdAt}`,
              at: run.createdAt,
              title: `Tool: ${run.toolType || "unknown"}`,
              subtitle: "Saved tool run",
              raw: run
            }))
          : [])
      ].sort((a, b) => {
        const aTime = new Date(a.at || 0).getTime();
        const bTime = new Date(b.at || 0).getTime();
        return bTime - aTime;
      });
      setItems(merged);
    } catch {
      setItems([]);
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
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>Timeline of logs and tool runs for this grow.</Text>

      <Link href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}`} asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>+ New Journal Entry</Text>
        </Pressable>
      </Link>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No journal activity yet.</Text>
      ) : (
        items.map((item) => (
          <View key={`${item.kind}-${item.id}`} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.subtitle ? <Text>{item.subtitle}</Text> : null}
            <Text style={styles.cardMeta}>
              {item.kind.toUpperCase()} | {fmtDate(item.at)}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
