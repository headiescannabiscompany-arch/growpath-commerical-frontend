import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listToolRuns } from "@/api/toolRuns";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
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
  meta: { color: "#64748B", marginTop: 4, fontSize: 12 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  chipOn: { borderColor: "#166534", backgroundColor: "#166534" },
  chipText: { fontWeight: "700", fontSize: 12, color: "#0F172A" },
  chipTextOn: { color: "#FFFFFF" },
  compareWrap: { marginTop: 12, gap: 10 },
  compareTitle: { fontWeight: "700", fontSize: 14, color: "#0F172A" },
  code: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    color: "#334155",
    fontSize: 12
  }
});

function toTime(value: any) {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function clipJson(input: any) {
  const raw = JSON.stringify(input ?? {}, null, 2) || "{}";
  return raw.length > 600 ? `${raw.slice(0, 600)}...` : raw;
}

export default function GrowCompareScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toolFilter, setToolFilter] = useState<string>("all");

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

  const toolTypes = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => {
      const key = String(r?.toolType || "unknown");
      set.add(key);
    });
    return ["all", ...Array.from(set)];
  }, [runs]);

  const scopedRuns = useMemo(() => {
    const rows = [...runs].sort((a, b) => toTime(b?.createdAt) - toTime(a?.createdAt));
    if (toolFilter === "all") return rows;
    return rows.filter((r) => String(r?.toolType || "unknown") === toolFilter);
  }, [runs, toolFilter]);

  const latest = scopedRuns[0];
  const previous = scopedRuns[1];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Compare</Text>
      <Text style={styles.subtitle}>
        Compare the latest two tool runs for a selected tool type.
      </Text>
      <GrowWorkspaceNav growId={growId} active="compare" />

      <View style={styles.chipsRow}>
        {toolTypes.map((type) => {
          const active = toolFilter === type;
          return (
            <Pressable
              key={type}
              onPress={() => setToolFilter(type)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{type}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : scopedRuns.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.meta}>No matching tool runs for this filter.</Text>
        </View>
      ) : (
        <View style={styles.compareWrap}>
          <View style={styles.card}>
            <Text style={styles.compareTitle}>Latest</Text>
            <Text style={styles.heading}>{latest?.toolType || "Tool run"}</Text>
            <Text style={styles.meta}>Saved: {fmtDate(latest?.createdAt)}</Text>
            <Text style={styles.code}>{clipJson(latest?.output)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.compareTitle}>Previous</Text>
            {previous ? (
              <>
                <Text style={styles.heading}>{previous?.toolType || "Tool run"}</Text>
                <Text style={styles.meta}>Saved: {fmtDate(previous?.createdAt)}</Text>
                <Text style={styles.code}>{clipJson(previous?.output)}</Text>
              </>
            ) : (
              <Text style={styles.meta}>Only one run available for this tool.</Text>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}
