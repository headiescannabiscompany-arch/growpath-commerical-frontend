import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listPersonalGrows } from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalPlants } from "@/api/plants";
import { listPersonalTasks } from "@/api/tasks";
import { listToolRuns } from "@/api/toolRuns";
import { useAuth } from "@/auth/AuthContext";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";
import { fmtDate } from "@/features/grows/routeUtils";
import { buildPersonalHomeModel } from "@/features/personal/homeModel";

type HomeModel = ReturnType<typeof buildPersonalHomeModel>;

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function PersonalHomeTab() {
  const auth = useAuth();
  const ent = useEntitlements();
  const [model, setModel] = useState<HomeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [grows, logs, plants, tasks, toolRuns] = await Promise.all([
        listPersonalGrows(),
        listPersonalLogs(),
        listPersonalPlants(),
        listPersonalTasks(),
        listToolRuns()
      ]);
      setModel(buildPersonalHomeModel({ grows, logs, plants, tasks, toolRuns }));
    } catch {
      setError("Unable to refresh your grow overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const growId = model?.activeGrowId || "";
  const growHref = growId ? `/home/personal/grows/${growId}` : "/home/personal/grows";

  return (
    <AppPage
      routeKey="home"
      header={
        <View>
          <Text style={styles.headerTitle}>Your Garden</Text>
          <Text style={styles.headerSubtitle}>
            {[auth.user?.email, `${ent.plan || "free"} plan`].filter(Boolean).join(" | ")}
          </Text>
        </View>
      }
    >
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !model?.activeGrow ? (
        <AppCard>
          <Text style={styles.cardTitle}>Start your first grow</Text>
          <Text style={styles.cardDescription}>
            Create a grow to connect journal entries, tasks, tool results, and AI context.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/personal/grows/new" label="Create Grow" />
            <ActionLink href="/home/personal/tools" label="Explore Tools" />
          </View>
        </AppCard>
      ) : null}

      {model?.activeGrow ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Grow</Text>
          <AppCard>
            <Text style={styles.cardTitle}>{model.activeGrow.name || "Active grow"}</Text>
            <Text style={styles.cardDescription}>
              {model.activeGrow.status} | Updated {fmtDate(model.activeGrow.updatedAt)}
            </Text>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{model.stats.plantCount}</Text>
                <Text style={styles.metricLabel}>Plants</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{model.stats.logCount}</Text>
                <Text style={styles.metricLabel}>Journal entries</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{model.openTaskCount}</Text>
                <Text style={styles.metricLabel}>Open tasks</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>
                  {model.latestToolRun?.toolType || model.latestToolRun?.toolName || "None"}
                </Text>
                <Text style={styles.metricLabel}>Latest tool</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <ActionLink href={growHref} label="Open Grow" />
              <ActionLink
                href={`/home/personal/logs/new?growId=${encodeURIComponent(growId)}`}
                label="Add Log"
              />
              <ActionLink
                href={`/home/personal/tools?growId=${encodeURIComponent(growId)}`}
                label="Run Tool"
              />
            </View>
          </AppCard>
        </View>
      ) : null}

      {model?.activeGrow ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <AppCard>
            <Text style={styles.cardTitle}>Next task</Text>
            <Text style={styles.cardDescription}>
              {model.nextTask
                ? `${model.nextTask.title} | ${fmtDate(model.nextTask.dueDate)}`
                : "No open task is scheduled for this grow."}
            </Text>
            <ActionLink href={`${growHref}/tasks`} label="View Tasks" />
          </AppCard>
          <AppCard>
            <Text style={styles.cardTitle}>Recent journal activity</Text>
            <Text style={styles.cardDescription}>
              {model.latestLog
                ? `${model.latestLog.title} | ${fmtDate(model.latestLog.date)}`
                : "No journal entries have been recorded yet."}
            </Text>
            <ActionLink href={`${growHref}/journal`} label="Open Journal" />
          </AppCard>
          <AppCard>
            <Text style={styles.cardTitle}>Garden statistics</Text>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{model.stats.activeGrowCount}</Text>
                <Text style={styles.metricLabel}>Active grows</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{model.stats.completedTaskCount}</Text>
                <Text style={styles.metricLabel}>Completed tasks</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{model.stats.toolRunCount}</Text>
                <Text style={styles.metricLabel}>Tool runs</Text>
              </View>
            </View>
          </AppCard>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.actions}>
          <ActionLink href="/home/personal/community" label="Community" />
          <ActionLink href="/home/personal/profile" label="Profile" />
        </View>
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerTitle: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#64748B" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 5 },
  cardDescription: { color: "#475569", lineHeight: 20, marginBottom: 8 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  metric: {
    minWidth: 120,
    padding: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 9
  },
  metricValue: { fontSize: 17, fontWeight: "800", color: "#0F172A" },
  metricLabel: { color: "#64748B", fontSize: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF"
  },
  actionText: { color: "#166534", fontWeight: "800" },
  error: { color: "#B91C1C", fontWeight: "700" }
});
