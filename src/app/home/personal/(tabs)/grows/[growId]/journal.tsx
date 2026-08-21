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

import { listToolRuns } from "@/api/toolRuns";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, fmtDate } from "@/features/grows/routeUtils";
import {
  buildGrowTimeline,
  growJournalItemHref,
  type GrowTimelineItem
} from "@/features/grows/timeline";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { listWorkspaceLogs, listWorkspaceTasks } from "@/features/grows/workspaceData";

export const createGrowJournalStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: palette.page },
    title: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 8
    },
    subtitle: { color: palette.textMuted },
    cta: {
      marginTop: 12,
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 10,
      paddingHorizontal: 12
    },
    ctaText: { color: palette.accentText, fontWeight: "700" },
    card: {
      marginTop: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted
    },
    cardTitle: { fontWeight: "700", color: palette.text },
    cardText: { color: palette.textSoft },
    cardMeta: { color: palette.textMuted, marginTop: 4, fontSize: 12 },
    cardAction: { color: palette.link, fontWeight: "700", marginTop: 8 },
    empty: { marginTop: 14, color: palette.textMuted },
    chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 },
    chip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: palette.surface
    },
    chipOn: { borderColor: palette.accent, backgroundColor: palette.accent },
    chipText: { fontSize: 12, fontWeight: "700", color: palette.text },
    chipTextOn: { color: palette.accentText }
  });

function sourceActionLabel(kind: GrowTimelineItem["kind"]) {
  if (kind === "tool_run") return "Open saved tool result";
  if (kind === "task") return "Open task";
  return "Open journal entry";
}

export type GrowJournalScreenProps = {
  workspace?: "personal" | "commercial";
};

export default function GrowJournalScreen({
  workspace = "personal"
}: GrowJournalScreenProps = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGrowJournalStyles(palette), [palette]);
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const basePath = workspace === "commercial" ? "/home/commercial" : "/home/personal";

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
        listWorkspaceLogs(workspace, growId),
        listToolRuns({ growId, workspaceType: workspace }),
        listWorkspaceTasks(workspace, growId)
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
  }, [growId, workspace]);

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
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_journal"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="journal" />

      <Link href={`${basePath}/logs/new?growId=${encodeURIComponent(growId)}`} asChild>
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
          <ActivityIndicator color={palette.accent} />
        </View>
      ) : filteredItems.length === 0 ? (
        <Text style={styles.empty}>No journal activity yet.</Text>
      ) : (
        filteredItems.map((item) => {
          const content = (
            <>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={styles.cardText}>{item.subtitle}</Text>
              ) : null}
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
              href={growJournalItemHref(item, growId, workspace) as any}
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
