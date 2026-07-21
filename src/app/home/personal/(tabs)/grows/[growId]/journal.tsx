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
import {
  buildGrowTimeline,
  growJournalItemHref,
  type GrowTimelineItem
} from "@/features/grows/timeline";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B" },
  cta: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  ctaText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC"
  },
  cardTitle: { fontWeight: "700", color: "#0F172A" },
  cardMeta: { color: "#64748B", marginTop: 4, fontSize: 12 },
  cardAction: { color: "#166534", fontWeight: "700", marginTop: 8 },
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

function sourceActionLabel(kind: GrowTimelineItem["kind"]) {
  if (kind === "tool_run") return "Open saved tool result";
  if (kind === "task") return "Open task";
  return "Open journal entry";
}

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
      <Text style={styles.title} accessibilityRole="header">
        Journal
      </Text>
      <Text style={styles.subtitle}>
        Timeline of logs, tool results, and tasks for this grow.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_journal"
        longContent
      />
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

      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_grows_growid_journal"
        longContent
      />

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
              <Text style={styles.cardAction}>{sourceActionLabel(item.kind)}</Text>
            </>
          );

          return (
            <Link
              key={`${item.kind}-${item.id}`}
              href={growJournalItemHref(item, growId) as any}
              asChild
            >
              <Pressable
                style={styles.card}
                accessibilityRole="link"
                accessibilityLabel={`${sourceActionLabel(item.kind)}: ${item.title}`}
              >
                {content}
              </Pressable>
            </Link>
          );
        })
      )}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_journal"
        longContent
      />
    </ScrollView>
  );
}
