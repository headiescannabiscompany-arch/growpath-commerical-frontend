import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { listPersonalLogs } from "@/api/logs";
import { listPersonalTasks } from "@/api/tasks";
import { listToolRuns } from "@/api/toolRuns";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";
import { buildGrowTimeline, type GrowTimelineItem } from "@/features/grows/timeline";

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
  empty: { marginTop: 14, color: "#64748B" },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  chipOn: { borderColor: "#166534", backgroundColor: "#166534" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  chipTextOn: { color: "#FFFFFF" }
});

export default function GrowJournalScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);

  const [items, setItems] = useState<GrowTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    | "all"
    | "log"
    | "tool_run"
    | "task"
    | "watering"
    | "feed"
    | "training"
    | "environment"
    | "issues"
    | "diagnosis"
    | "harvest"
  >("all");

  const load = useCallback(async () => {
    if (!growId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [logs, runs, tasks] = await Promise.all([
        listPersonalLogs({ growId }),
        listToolRuns({ growId }),
        listPersonalTasks({ growId })
      ]);
      setItems(
        buildGrowTimeline({
          logs: Array.isArray(logs) ? logs : [],
          toolRuns: Array.isArray(runs) ? runs : [],
          tasks: Array.isArray(tasks) ? tasks : []
        })
      );
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

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "log" || filter === "tool_run" || filter === "task") {
      return items.filter((item) => item.kind === filter);
    }
    return items.filter((item) => item.kind === "log" && item.category === filter);
  }, [filter, items]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Journal</Text>
      <Text style={styles.subtitle}>
        Timeline of logs, tool results, and tasks for this grow.
      </Text>
      <GrowWorkspaceNav growId={growId} active="journal" />

      <Link href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}`} asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>+ New Journal Entry</Text>
        </Pressable>
      </Link>

      <View style={styles.chipsRow}>
        {[
          "all",
          "log",
          "tool_run",
          "task",
          "watering",
          "feed",
          "training",
          "environment",
          "issues",
          "diagnosis",
          "harvest"
        ].map((key) => {
          const active = filter === key;
          return (
            <Pressable
              key={key}
              style={[styles.chip, active && styles.chipOn]}
              onPress={() => setFilter(key as any)}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{key}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      ) : filteredItems.length === 0 ? (
        <Text style={styles.empty}>No journal activity yet.</Text>
      ) : (
        filteredItems.map((item) => {
          const content = (
            <>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.subtitle ? <Text>{item.subtitle}</Text> : null}
              <Text style={styles.cardMeta}>
                {item.kind.toUpperCase()}
                {item.category ? ` (${item.category})` : ""} |{" "}
                {fmtDate(item.at || undefined)}
                {item.kind === "task" ? (item.completed ? " | COMPLETE" : " | OPEN") : ""}
              </Text>
            </>
          );

          if (item.kind !== "log") {
            return (
              <View key={`${item.kind}-${item.id}`} style={styles.card}>
                {content}
              </View>
            );
          }

          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={`/home/personal/logs/${encodeURIComponent(item.id)}`}
              asChild
            >
              <Pressable style={styles.card}>{content}</Pressable>
            </Link>
          );
        })
      )}
    </ScrollView>
  );
}
